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
