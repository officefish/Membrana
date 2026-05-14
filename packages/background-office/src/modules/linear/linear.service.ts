import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';

const LINEAR_GQL = 'https://api.linear.app/graphql';

export interface LinearIssueView {
  id: string;
  identifier: string;
  title: string;
  description: string | null;
  state: string;
  labels: { name: string; color: string }[];
  comments: { id: string; body: string; createdAt: string; user: string }[];
  url: string;
}

interface GqlResponse<T> {
  data?: T;
  errors?: { message: string }[];
}

@Injectable()
export class LinearService {
  private readonly logger = new Logger(LinearService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private parseIdentifier(id: string): { teamKey: string; number: number } {
    const m = id.trim().match(/^(.+)-(\d+)$/);
    if (!m) {
      throw new BadRequestException(
        'Invalid issue id: expected format like TEC-42',
      );
    }
    return { teamKey: m[1]!, number: Number(m[2]) };
  }

  private async postGql<T>(
    query: string,
    variables: Record<string, unknown>,
  ): Promise<T> {
    const res = await fetch(LINEAR_GQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.config.LINEAR_API_KEY,
      },
      body: JSON.stringify({ query, variables }),
      signal: AbortSignal.timeout(30_000),
    });
    const text = await res.text();
    if (!res.ok) {
      this.logger.warn({ status: res.status }, 'Linear HTTP error');
      throw new BadRequestException('Linear API request failed');
    }
    let parsed: GqlResponse<T>;
    try {
      parsed = JSON.parse(text) as GqlResponse<T>;
    } catch {
      throw new BadRequestException('Linear API returned invalid JSON');
    }
    if (parsed.errors?.length) {
      this.logger.warn({ errors: parsed.errors }, 'Linear GraphQL errors');
      throw new BadRequestException(parsed.errors[0]?.message ?? 'Linear GraphQL error');
    }
    if (!parsed.data) {
      throw new BadRequestException('Linear API returned empty data');
    }
    return parsed.data;
  }

  async getIssueByIdentifier(identifier: string): Promise<LinearIssueView> {
    const { teamKey, number } = this.parseIdentifier(identifier);
    const query = `
      query IssueByIdentifier($teamKey: String!, $number: Float!) {
        issues(
          filter: { team: { key: { eq: $teamKey } }, number: { eq: $number } }
          first: 1
        ) {
          nodes {
            id
            identifier
            title
            description
            url
            state { name }
            labels { nodes { name color } }
            comments {
              nodes {
                id
                body
                createdAt
                user { name email }
              }
            }
          }
        }
      }
    `;
    const data = await this.postGql<{
      issues: {
        nodes: Array<{
          id: string;
          identifier: string;
          title: string;
          description: string | null;
          url: string;
          state: { name: string } | null;
          labels: { nodes: { name: string; color: string }[] };
          comments: {
            nodes: Array<{
              id: string;
              body: string;
              createdAt: string;
              user: { name: string; email: string } | null;
            }>;
          };
        }>;
      };
    }>(query, { teamKey, number: number });

    const node = data.issues.nodes[0];
    if (!node) {
      throw new NotFoundException(`Linear issue not found: ${identifier}`);
    }
    return {
      id: node.id,
      identifier: node.identifier,
      title: node.title,
      description: node.description,
      state: node.state?.name ?? 'unknown',
      labels: (node.labels?.nodes ?? []).map((l) => ({
        name: l.name,
        color: l.color,
      })),
      comments: (node.comments?.nodes ?? []).map((c) => ({
        id: c.id,
        body: c.body,
        createdAt: c.createdAt,
        user: c.user?.name ?? c.user?.email ?? 'unknown',
      })),
      url: node.url,
    };
  }

  formatIssueForPrompt(issue: LinearIssueView): string {
    const lines: string[] = [];
    lines.push(`# Linear ${issue.identifier}: ${issue.title}`);
    lines.push(`URL: ${issue.url}`);
    lines.push(`State: ${issue.state}`);
    if (issue.labels.length) {
      lines.push(`Labels: ${issue.labels.map((l) => l.name).join(', ')}`);
    }
    lines.push('');
    lines.push('## Description');
    lines.push('');
    lines.push((issue.description ?? '').trim() || '(пусто)');
    for (const c of issue.comments) {
      lines.push('');
      lines.push(`## Комментарий (${c.user}, ${c.createdAt})`);
      lines.push('');
      lines.push((c.body ?? '').trim());
    }
    let text = lines.join('\n');
    const max = 20_000;
    if (text.length > max) {
      text = text.slice(0, max) + `\n\n[… тикет обрезан до ${max} символов …]\n`;
    }
    return text;
  }

  async addComment(
    identifier: string,
    body: string,
  ): Promise<{ commentId: string; url: string; createdAt: string }> {
    const issue = await this.getIssueByIdentifier(identifier);
    const mutation = `
      mutation CommentCreate($issueId: String!, $body: String!) {
        commentCreate(input: { issueId: $issueId, body: $body }) {
          success
          comment {
            id
            url
            createdAt
          }
        }
      }
    `;
    const data = await this.postGql<{
      commentCreate: {
        success: boolean;
        comment: { id: string; url: string; createdAt: string } | null;
      };
    }>(mutation, { issueId: issue.id, body });

    if (!data.commentCreate.success || !data.commentCreate.comment) {
      throw new BadRequestException('Failed to create Linear comment');
    }
    const c = data.commentCreate.comment;
    return { commentId: c.id, url: c.url, createdAt: c.createdAt };
  }
}
