import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import type { AppConfig } from '../../config/env.schema';
import { APP_CONFIG } from '../../config/config.tokens';
import { ClaudeService } from '../claude/claude.service';
import { DeepSeekService } from '../deepseek/deepseek.service';
import { GithubService } from '../github/github.service';
import {
  designSubjectProblems,
  renderDesignSubject,
  type SourceFile,
} from './night-hunt-design';
import {
  classifyEdgeKind,
  findGraphSuspicions,
  manifestPathOf,
  parseWorkspaceGraph,
  renderGraphSubject,
  type ResolvedSuspicion,
} from './night-hunt-graph';
import {
  type NightHuntJobId,
  getNightHuntJob,
  nightHuntOutputPath,
} from './night-hunt-jobs';
import { nightHuntWeekKey } from './night-hunt-week.util';

const MAX_CONTEXT = 24_000;

/** Предмет дела об оформлении: конфиг темы приложения и его компоненты. */
const THEME_CONFIG_PATH = 'apps/client/tailwind.config.js';
const DESIGN_SOURCE_DIR = 'apps/client/src/components';
/** Потолок выборки исходников: дело ходит по сети, а не по диску. */
const DESIGN_SOURCE_LIMIT = 25;

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + `\n\n[… обрезано до ${max} символов …]\n`;
}

@Injectable()
export class NightHuntService {
  private readonly logger = new Logger(NightHuntService.name);

  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly github: GithubService,
    private readonly claude: ClaudeService,
    private readonly deepseek: DeepSeekService,
  ) {}

  isEnabled(): boolean {
    const hasLlm = Boolean(this.config.ANTHROPIC_API_KEY?.trim()) || this.deepseek.isConfigured();
    return this.config.NIGHT_HUNT_ENABLED === true && hasLlm;
  }

  /** Цепочка провайдеров отчёта (ADR 0005): Claude → DeepSeek(direct). Оба упали → throw (ран skipped). */
  private async generateReport(prompt: string): Promise<{ text: string; provider: string }> {
    if (this.config.ANTHROPIC_API_KEY?.trim()) {
      try {
        return { text: (await this.claude.askWithUserText(prompt)).text, provider: 'claude' };
      } catch (err) {
        this.logger.warn(
          { reason: err instanceof Error ? err.message : String(err) },
          'night-hunt report: claude failed, trying deepseek',
        );
      }
    }
    if (this.deepseek.isConfigured()) {
      return { text: await this.deepseek.chat(prompt), provider: 'deepseek' };
    }
    throw new Error('night-hunt: no LLM provider available (claude failed, deepseek not configured)');
  }

  baseBranch(): string {
    return this.config.NIGHT_HUNT_BASE_BRANCH?.trim() || 'main';
  }

  async runJob(jobId: NightHuntJobId): Promise<{
    ok: boolean;
    skipped?: boolean;
    reason?: string;
    prUrl?: string;
    filePath?: string;
  }> {
    if (!this.isEnabled()) {
      return { ok: true, skipped: true, reason: 'night-hunt disabled or no LLM provider (ANTHROPIC/DEEPSEEK)' };
    }

    const job = getNightHuntJob(jobId);
    if (!job) {
      return { ok: false, reason: `unknown job: ${jobId}` };
    }

    const week = nightHuntWeekKey();
    const filePath = nightHuntOutputPath(job.outputSlug, week);

    try {
      const context = await this.gatherContext(jobId);
      const prompt = this.buildPrompt(jobId, context, week);
      const generated = await this.generateReport(prompt);
      const body = this.wrapReport(generated.text, jobId, week, generated.provider);

      const prResult = await this.github.createPullRequestWithFile({
        branchPrefix: `night-hunt/${job.outputSlug}`,
        baseBranch: this.baseBranch(),
        title: `${job.title} (${week})`,
        body: [
          '## Night Hunt (optional)',
          '',
          'Автоматический отчёт через OpenRouter proxy. **Не блокирует** prod-ритуалы.',
          '',
          `- Job: \`${jobId}\``,
          `- Week: \`${week}\``,
          `- File: \`${filePath}\``,
          '',
          'Утро: `yarn night-hunt:pr-review` → `main-day-issue`.',
        ].join('\n'),
        filePath,
        content: body,
        labels: ['night-hunt', 'automated'],
      });

      if ('skipped' in prResult && prResult.skipped) {
        this.logger.log({ jobId, reason: prResult.reason }, 'night-hunt skipped');
        return { ok: true, skipped: true, reason: prResult.reason, filePath };
      }

      const prUrl = 'prUrl' in prResult ? prResult.prUrl : undefined;
      this.logger.log({ jobId, prUrl }, 'night-hunt PR created');
      return { ok: true, prUrl, filePath };
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn({ jobId, reason }, 'night-hunt failed (optional)');
      return { ok: true, skipped: true, reason };
    }
  }

  private wrapReport(report: string, jobId: string, week: string, provider: string): string {
    const stamp = new Date().toISOString();
    return [
      `# Night Hunt: ${jobId}`,
      '',
      `| Поле | Значение |`,
      `|------|----------|`,
      `| Week | ${week} |`,
      `| Generated (UTC) | ${stamp} |`,
      `| Channel | ${provider} |`,
      '',
      '---',
      '',
      report.trim(),
      '',
    ].join('\n');
  }

  /**
   * Исходники компонентов для замера: листинг каталога плюс текст каждого файла.
   * Листинг GitHub отдаёт только файлы каталога (не вложенные), поэтому выборка
   * плоская и ограничена потолком — это честная выборка, а не весь клиент.
   */
  private async fetchSourceFiles(dir: string, limit: number): Promise<SourceFile[]> {
    const names = await this.github.listDirectoryFiles(dir);
    if (!names) return [];
    const wanted = names.filter((n) => /\.tsx?$/.test(n) && !/\.test\.tsx?$/.test(n));
    const files: SourceFile[] = [];
    for (const name of wanted.slice(0, limit)) {
      const path = `${dir}/${name}`;
      const text = await this.github.fetchTextFile(path);
      if (text) files.push({ path, text });
    }
    return files;
  }

  private async gatherContext(jobId: NightHuntJobId): Promise<string> {
    const parts: string[] = [];

    if (jobId === 'design-token-drift') {
      const designMd = (await this.github.fetchTextFile('docs/DESIGN.md')) ?? '';
      const themeConfig = (await this.github.fetchTextFile(THEME_CONFIG_PATH)) ?? '';
      const files = await this.fetchSourceFiles(DESIGN_SOURCE_DIR, DESIGN_SOURCE_LIMIT);
      const subject = { themeConfigPath: THEME_CONFIG_PATH, themeConfig, designMd, files };

      // Нет предмета — отказ, а не проза. Дело обязано молчать громко: пустой отчёт
      // никто не разбирает, а отказ с причиной виден в логе и в состоянии прогона.
      const problems = designSubjectProblems(subject);
      if (problems.length > 0) {
        throw new Error(`design-token-drift: предмета нет — ${problems.join('; ')}`);
      }

      parts.push(renderDesignSubject(subject));
      parts.push(
        '\n## Задача\n\nОбъясни замер выше. Каждая находка обязана нести адрес: имя токена ' +
          'либо файл и строку из таблиц замера. Утверждение без адреса — не находка, его не писать. ' +
          'Числа замера не пересчитывай и не опровергай: они посчитаны по исходникам. ' +
          'Главный вопрос: документ описывает цвет значениями палитры, код — семантическими ' +
          'классами тем; что здесь расхождение по существу, а что законная разница слоёв.',
      );
    }

    if (jobId === 'services-api-contract-drift') {
      const services = await this.github.fetchTextFile('docs/SERVICES.md');
      const audio = await this.github.fetchTextFile(
        'packages/services/audio-engine/src/index.ts',
      );
      const fft = await this.github.fetchTextFile(
        'packages/services/fft-analyzer/src/index.ts',
      );
      if (services) parts.push('## SERVICES.md\n\n', truncate(services, 8_000));
      if (audio) parts.push('\n## audio-engine index.ts\n\n', truncate(audio, 3_000));
      if (fft) parts.push('\n## fft-analyzer index.ts\n\n', truncate(fft, 3_000));
    }

    if (jobId === 'monorepo-dependency-graph') {
      const lock = await this.github.fetchTextFile('yarn.lock');
      const workspaces = lock ? parseWorkspaceGraph(lock) : [];
      if (workspaces.length === 0) {
        throw new Error(
          'monorepo-dependency-graph: предмета нет — yarn.lock не прочитан или не содержит рабочих областей',
        );
      }

      // Lock склеивает dependencies и devDependencies, поэтому сам по себе даёт
      // только подозрения. Вид ребра выясняем по манифесту подозреваемого — столько
      // выборок, сколько подозрений (в здоровом стволе ноль).
      const resolved: ResolvedSuspicion[] = [];
      for (const suspicion of findGraphSuspicions(workspaces)) {
        const manifestPath = manifestPathOf(suspicion.fromPath);
        const manifest = await this.github.fetchTextFile(manifestPath);
        resolved.push({ ...suspicion, manifestPath, kind: classifyEdgeKind(manifest, suspicion.to) });
      }

      parts.push(renderGraphSubject(workspaces, resolved));
      parts.push(
        '\n## Задача\n\nОбъясни замер выше. Находка обязана нести адрес: имя пакета и ребро ' +
          'либо путь к манифесту. Утверждение без адреса — не находка, его не писать. ' +
          'Рёбра и нарушения посчитаны кодом по правилам §1 ARCHITECTURE — не пересчитывай их и ' +
          'не добавляй ненайденных. Вид ребра важен: зависимость прода нарушает §1, ' +
          'зависимость сборки — вопрос, непрочитанный манифест — повод проверить руками, а не вывод.',
      );
    }

    return truncate(parts.join(''), MAX_CONTEXT);
  }

  private buildPrompt(jobId: NightHuntJobId, context: string, week: string): string {
    return [
      'Ты — аналитик репозитория Membrana (монорепо TypeScript).',
      `Сформируй weekly-отчёт за неделю ${week} для job \`${jobId}\`.`,
      'Формат: markdown с разделами ## Находки, ## Риски, ## Рекомендации (2–5 пунктов каждый).',
      'Без преамбулы «как модель я…». Только содержание отчёта (без YAML front matter).',
      '',
      '---',
      context,
    ].join('\n');
  }
}
