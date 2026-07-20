/**
 * Office Linear façade — **no GraphQL to api.linear.app** (вердикт К1).
 *
 * Egress / issue body live on media-NL via `linear-snapshot@1`.
 * Calling these methods returns a clear ServiceUnavailable — never a silent RU 403.
 */
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

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

const EGRESS_MESSAGE =
  'Linear GraphQL from office is disabled (egress = media-NL). ' +
  'Use POST {MEDIA_API_URL}/v1/linear-snapshots/capture with X-Membrana-Token, ' +
  'or read a linear-snapshot@1 artifact. See docs/tasks/LINEAR_SNAPSHOT_CONTRACT.md.';

@Injectable()
export class LinearService {
  private readonly logger = new Logger(LinearService.name);

  private refuse(op: string): never {
    this.logger.warn({ op }, 'refusing office→Linear GraphQL (use media egress)');
    throw new ServiceUnavailableException({
      message: EGRESS_MESSAGE,
      code: 'LINEAR_OFFICE_EGRESS_DISABLED',
      op,
    });
  }

  async getIssueByIdentifier(_identifier: string): Promise<LinearIssueView> {
    this.refuse('getIssueByIdentifier');
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
      text = `${text.slice(0, max)}\n\n[… тикет обрезан до ${max} символов …]\n`;
    }
    return text;
  }

  async addComment(
    _identifier: string,
    _body: string,
  ): Promise<{ commentId: string; url: string; createdAt: string }> {
    this.refuse('addComment');
  }
}
