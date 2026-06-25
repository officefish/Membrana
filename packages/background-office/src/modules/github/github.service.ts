import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Octokit } from '@octokit/rest' with { 'resolution-mode': 'import' };
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';

const MAX_TICKET_CHARS = 20_000;

export interface GhIssueShape {
  number: number;
  title: string;
  body: string | null;
  url: string;
  state: string;
  labels: { name: string }[];
  comments: { author?: { login?: string }; createdAt?: string; body?: string }[];
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private octokitPromise: Promise<Octokit> | undefined;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    this.owner = config.GITHUB_OWNER;
    this.repo = config.GITHUB_REPO;
  }

  private readonly owner: string;
  private readonly repo: string;

  private async getOctokit(): Promise<Octokit> {
    if (!this.octokitPromise) {
      this.octokitPromise = import('@octokit/rest').then(({ Octokit }) => {
        return new Octokit({
          auth: this.config.GITHUB_TOKEN,
          request: {
            fetch: (url: string | URL | Request, options?: RequestInit) =>
              fetch(url, {
                ...options,
                signal: AbortSignal.timeout(30_000),
              }),
          },
        });
      });
    }
    return this.octokitPromise;
  }

  async fetchIssueWithComments(issueNumber: number): Promise<GhIssueShape> {
    this.logger.debug({ issueNumber }, 'github.fetchIssue');
    const octokit = await this.getOctokit();
    const issue = await octokit.rest.issues.get({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
    });
    const comments = await octokit.rest.issues.listComments({
      owner: this.owner,
      repo: this.repo,
      issue_number: issueNumber,
      per_page: 100,
    });
    return {
      number: issue.data.number,
      title: issue.data.title ?? '',
      body: issue.data.body ?? null,
      url: issue.data.html_url,
      state: issue.data.state,
      labels: (issue.data.labels ?? [])
        .map((l) => (typeof l === 'string' ? { name: l } : { name: l.name ?? '' }))
        .filter((l) => l.name),
      comments: comments.data.map((c) => ({
        author: c.user ? { login: c.user.login ?? undefined } : undefined,
        createdAt: c.created_at,
        body: c.body ?? undefined,
      })),
    };
  }

  /** Read a text file from the repo (base64 decode). Returns null if missing. */
  async fetchTextFile(path: string, ref?: string): Promise<string | null> {
    const octokit = await this.getOctokit();
    try {
      const res = await octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref,
      });
      const data = res.data;
      if (Array.isArray(data) || data.type !== 'file' || !('content' in data)) {
        return null;
      }
      const raw = Buffer.from(data.content, 'base64').toString('utf8');
      return raw;
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 404) return null;
      throw err;
    }
  }

  /** List open PRs with a label (e.g. night-hunt). */
  async listOpenPullRequestsByLabel(label: string): Promise<
    { number: number; title: string; url: string; headRef: string }[]
  > {
    const octokit = await this.getOctokit();
    const res = await octokit.rest.pulls.list({
      owner: this.owner,
      repo: this.repo,
      state: 'open',
      per_page: 30,
    });
    return res.data
      .filter((pr) => (pr.labels ?? []).some((l) => (typeof l === 'string' ? l : l.name) === label))
      .map((pr) => ({
        number: pr.number,
        title: pr.title ?? '',
        url: pr.html_url,
        headRef: pr.head.ref,
      }));
  }

  /**
   * Create branch + commit one file + open PR. Skips if an open PR exists for same branch prefix.
   */
  async createPullRequestWithFile(opts: {
    branchPrefix: string;
    baseBranch: string;
    title: string;
    body: string;
    filePath: string;
    content: string;
    labels?: string[];
  }): Promise<{ prUrl: string; branch: string; created: boolean } | { skipped: true; reason: string }> {
    const octokit = await this.getOctokit();
    const branch = `${opts.branchPrefix}-${Date.now()}`;

    const openByLabel = await octokit.rest.issues.listForRepo({
      owner: this.owner,
      repo: this.repo,
      state: 'open',
      labels: 'night-hunt',
      per_page: 20,
    });
    const dup = openByLabel.data.find(
      (issue) => issue.title?.includes(opts.title.split(' (')[0] ?? opts.title),
    );
    if (dup) {
      return { skipped: true, reason: `open night-hunt PR/issue: #${dup.number}` };
    }

    const baseRef = await octokit.rest.git.getRef({
      owner: this.owner,
      repo: this.repo,
      ref: `heads/${opts.baseBranch}`,
    });
    const baseSha = baseRef.data.object.sha;

    await octokit.rest.git.createRef({
      owner: this.owner,
      repo: this.repo,
      ref: `refs/heads/${branch}`,
      sha: baseSha,
    });

    let fileSha: string | undefined;
    try {
      const existingFile = await octokit.rest.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path: opts.filePath,
        ref: branch,
      });
      if (!Array.isArray(existingFile.data) && 'sha' in existingFile.data) {
        fileSha = existingFile.data.sha;
      }
    } catch {
      /* new file */
    }

    await octokit.rest.repos.createOrUpdateFileContents({
      owner: this.owner,
      repo: this.repo,
      path: opts.filePath,
      message: `chore(night-hunt): ${opts.title}`,
      content: Buffer.from(opts.content, 'utf8').toString('base64'),
      branch,
      sha: fileSha,
    });

    const pr = await octokit.rest.pulls.create({
      owner: this.owner,
      repo: this.repo,
      title: opts.title,
      head: branch,
      base: opts.baseBranch,
      body: opts.body,
    });

    for (const label of opts.labels ?? []) {
      try {
        await octokit.rest.issues.addLabels({
          owner: this.owner,
          repo: this.repo,
          issue_number: pr.data.number,
          labels: [label],
        });
      } catch (e) {
        this.logger.warn({ label, err: e }, 'github.addLabel failed');
      }
    }

    return { prUrl: pr.data.html_url, branch, created: true };
  }

  formatIssueAsTicket(issue: GhIssueShape): string {
    const lines: string[] = [];
    lines.push(`# GitHub Issue #${issue.number}: ${issue.title}`);
    lines.push(`URL: ${issue.url}`);
    lines.push(`State: ${issue.state}`);
    if (issue.labels.length) {
      lines.push(`Labels: ${issue.labels.map((l) => l.name).join(', ')}`);
    }
    lines.push('');
    lines.push('## Body');
    lines.push('');
    lines.push((issue.body ?? '').trim() || '(пусто)');
    for (const c of issue.comments) {
      lines.push('');
      lines.push(`## Комментарий от ${c.author?.login ?? '?'} (${c.createdAt ?? ''})`);
      lines.push('');
      lines.push((c.body ?? '').trim());
    }
    let text = lines.join('\n');
    if (text.length > MAX_TICKET_CHARS) {
      text =
        text.slice(0, MAX_TICKET_CHARS) +
        `\n\n[… тикет обрезан до ${MAX_TICKET_CHARS} символов …]\n`;
    }
    return text;
  }
}
