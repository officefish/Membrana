#!/usr/bin/env node
/**
 * Membrana Insight CLI — strategic idea capture.
 *
 * yarn insight help
 * yarn insight create my-idea --title "…"
 * yarn insight research insight-my-idea
 * yarn insight review insight-my-idea
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import {
  anthropicPost,
  CREDIT_FALLBACKS,
  defaultModel,
  getAnthropicKey,
  isCreditExhausted,
  loadDotEnv,
} from './_anthropic-env.mjs';
import {
  REVIEW_PROMPT_PATH,
  VIRTUAL_TEAM_PATH,
  createInsight,
  formatInsightList,
  insightDir,
  normalizeInsightId,
  parseInsightCli,
  printInsightHelp,
  readRegistry,
  runInsightResearch,
  writeRegistry,
} from './lib/insight-ritual.mjs';
import { verifyInsightLifecycle } from './lib/insight-lifecycle.mjs';
import {
  executeOperationPlan,
  OperationError,
  planCorrect,
  planDecide,
  planReconcile,
  planReopen,
  planSupersede,
  planVisibility,
} from './lib/insight-lifecycle-ops.mjs';
import {
  loadLifecycleStore,
  rebuildProjection,
} from './lib/insight-lifecycle-store.mjs';
import { buildLegacyMigrationPlan } from './lib/insight-lifecycle-migrate.mjs';

loadDotEnv();

const cli = parseInsightCli(process.argv.slice(2));
const repoRoot = process.cwd();

function readRequest(path) {
  if (!path) throw new OperationError('INVALID_ARGUMENT', '--request <file> is required');
  return JSON.parse(readFileSync(resolve(repoRoot, path), 'utf8'));
}

function printLifecycleReport(report) {
  console.log(JSON.stringify(report, null, 2));
}

function lifecycleInput(store, overrides = {}) {
  return {
    repoRoot,
    store,
    requestKey: cli.requestKey,
    authorityRef: cli.authority,
    actorRef: process.env.USERNAME || process.env.USER || 'local-operator',
    ...overrides,
  };
}

function statusReport(store, id) {
  const projection = rebuildProjection(store.baseContext, store.eventLog);
  const revisions = (store.baseContext.insightRevisions ?? []).filter(
    (item) => item.id === id || item.insightId === id,
  );
  const revisionIds = new Set(revisions.map((item) => item.id));
  const mandates = (store.baseContext.mandates ?? []).filter(
    (item) => item.id === id || revisionIds.has(item.insightRevisionRef),
  );
  for (const mandate of mandates) revisionIds.add(mandate.insightRevisionRef);
  const mandateIds = new Set(mandates.map((item) => item.id));
  const slices = (store.baseContext.slices ?? []).filter(
    (item) => item.id === id || mandateIds.has(item.mandateRef),
  );
  const representations = (store.baseContext.representations ?? []).filter(
    (item) => item.id === id || revisionIds.has(item.insightRevisionRef) || item.insightId === id,
  );
  const subjects = [...revisionIds, ...mandateIds, ...slices.map((item) => item.id), ...representations.map((item) => item.id)];
  if (!subjects.length) {
    return {
      ok: false, mode: 'READ-ONLY', subjects: [id],
      failure: { code: 'UNKNOWN_INSIGHT', message: `No lifecycle subject for ${id}` },
    };
  }
  const assessments = {};
  for (const mandate of mandates) assessments[`D:${mandate.id}`] = projection.currentAssessments[`D:${mandate.id}`] ?? { kind: 'None' };
  for (const slice of slices) {
    assessments[`L:${slice.id}`] = projection.currentAssessments[`L:${slice.id}`] ?? { kind: 'None' };
    assessments[`O:${slice.id}`] = projection.currentAssessments[`O:${slice.id}`] ?? { kind: 'None' };
  }
  for (const representation of representations) assessments[`V:${representation.id}`] = projection.currentAssessments[`V:${representation.id}`] ?? { kind: 'None' };
  return {
    ok: true,
    mode: 'READ-ONLY',
    subjects,
    scope: { revisions, mandates, slices, representations },
    assessments,
    evidenceSummary: {
      proof: projection.assertionHistory.filter((item) => item.evidenceRef).length,
      hint: 0,
      invalid: 0,
      none: slices.reduce((count, slice) =>
        count +
        (assessments[`L:${slice.id}`].kind === 'None' ? 1 : 0) +
        (assessments[`O:${slice.id}`].kind === 'None' ? 1 : 0), 0),
    },
    diagnostics: Object.entries(assessments)
      .filter(([, value]) => value.kind === 'Conflict')
      .map(([key]) => ({ code: 'CURRENT_ASSERTION_CONFLICT', subject: key })),
    safety: { writes: false },
    projectionDiff: 'none',
  };
}

function overviewReport(store) {
  const projection = rebuildProjection(store.baseContext, store.eventLog);
  const objectiveEligible = [];
  const rows = (store.baseContext.insightRevisions ?? []).map((revision) => {
    const mandates = (store.baseContext.mandates ?? []).filter((item) => item.insightRevisionRef === revision.id);
    const mandateIds = new Set(mandates.map((item) => item.id));
    const slices = (store.baseContext.slices ?? []).filter((item) => mandateIds.has(item.mandateRef));
    const representations = (store.baseContext.representations ?? []).filter(
      (item) => item.insightRevisionRef === revision.id || item.insightId === revision.insightId,
    );
    const values = (axis, records) => records.map((item) => projection.currentAssessments[`${axis}:${item.id}`] ?? { kind: 'None' });
    const d = values('D', mandates);
    const l = values('L', slices);
    const o = values('O', slices);
    const v = values('V', representations);
    const visibilityGroup = v.some((item) => item.kind === 'Conflict')
      ? 'conflict'
      : v.some((item) => item.kind === 'Some' && item.assertion.value === 'archived')
        ? 'archived'
        : v.some((item) => item.kind === 'Some' && item.assertion.value === 'active')
          ? 'active'
          : 'unclassified';
    for (const mandate of mandates) {
      const decision = projection.currentAssessments[`D:${mandate.id}`];
      const mandateSlices = slices.filter((item) => item.mandateRef === mandate.id);
      const uncovered = mandateSlices.filter((slice) => {
        if (projection.currentAssessments[`L:${slice.id}`]) return false;
        return !(store.baseContext.transcriptionRelations ?? []).some((relation) =>
          relation.mandateRef === mandate.id &&
          (!Array.isArray(relation.declaredSliceRefs) || relation.declaredSliceRefs.includes(slice.id)),
        );
      });
      const conflict = [
        decision,
        ...mandateSlices.flatMap((slice) => [
          projection.currentAssessments[`L:${slice.id}`],
          projection.currentAssessments[`O:${slice.id}`],
        ]),
      ].some((item) => item?.kind === 'Conflict');
      if (visibilityGroup !== 'archived' && visibilityGroup !== 'conflict' &&
          decision?.kind === 'Some' && decision.assertion.value === 'accepted' &&
          uncovered.length > 0 && !conflict) {
        objectiveEligible.push({
          insightId: revision.insightId ?? revision.id,
          mandateId: mandate.id,
          priorityWeight: Number.isFinite(mandate.priorityWeight) ? mandate.priorityWeight : null,
          decisionSeq: decision.assertion.seq,
          uncoveredSliceIds: uncovered.map((item) => item.id),
        });
      }
    }
    return {
      insightId: revision.insightId ?? revision.id,
      revisionId: revision.id,
      thesis: revision.title ?? revision.insightId ?? revision.id,
      visibilityGroup,
      D: d,
      L: l,
      O: o,
      V: v,
      evidenceGap: slices.filter((slice) =>
        !projection.currentAssessments[`L:${slice.id}`] || !projection.currentAssessments[`O:${slice.id}`],
      ).map((slice) => slice.id),
    };
  }).sort((a, b) => a.insightId.localeCompare(b.insightId));
  objectiveEligible.sort((a, b) => {
    if (a.priorityWeight === null && b.priorityWeight !== null) return 1;
    if (a.priorityWeight !== null && b.priorityWeight === null) return -1;
    if (a.priorityWeight !== b.priorityWeight) return (b.priorityWeight ?? 0) - (a.priorityWeight ?? 0);
    if (a.decisionSeq !== b.decisionSeq) return b.decisionSeq - a.decisionSeq;
    return a.mandateId < b.mandateId ? -1 : a.mandateId > b.mandateId ? 1 : 0;
  });
  return {
    ok: true, mode: 'READ-ONLY', subjects: rows.map((item) => item.insightId),
    insights: rows,
    counts: {
      insights: rows.length,
      conflicts: Object.values(projection.currentAssessments).filter((item) => item.kind === 'Conflict').length,
    },
    personalTop3: null,
    objectiveCandidate: objectiveEligible[0] ?? null,
    diagnostics: [],
    safety: { writes: false },
    projectionDiff: 'none',
  };
}

if (cli.command === 'help') {
  printInsightHelp();
  process.exit(0);
}

try {
  if (cli.command === 'create') {
    if (!cli.id || !cli.title) {
      console.error('Usage: yarn insight create <slug> --title "…"');
      process.exit(1);
    }
    const { id, dir } = createInsight(repoRoot, {
      id: cli.id,
      title: cli.title,
      source: cli.source,
    });
    console.log(`Создан инсайт: ${id}`);
    console.log(dir);
    process.exit(0);
  }

  if (cli.command === 'list') {
    console.log(formatInsightList(repoRoot, cli.statusFilter || undefined));
    process.exit(0);
  }

  if (cli.command === 'status') {
    if (!cli.id) throw new OperationError('INVALID_ARGUMENT', 'status requires <id>');
    printLifecycleReport(statusReport(loadLifecycleStore(repoRoot), cli.id));
    process.exitCode = 0;
  }

  if (cli.command === 'overview') {
    printLifecycleReport(overviewReport(loadLifecycleStore(repoRoot)));
    process.exitCode = 0;
  }

  if (cli.command === 'verify') {
    const store = loadLifecycleStore(repoRoot);
    const result = verifyInsightLifecycle({
      baseContext: store.baseContext,
      eventLog: store.eventLog,
      projection: store.projection ?? undefined,
    });
    printLifecycleReport({
      ok: result.ok,
      mode: 'READ-ONLY',
      subjects: cli.id ? [cli.id] : ['all-insights'],
      assessments: result.replay?.currentAssessments ?? {},
      diagnostics: result.diagnostics,
      safety: { writes: false },
      projectionDiff: result.diagnostics.some((item) => item.code === 'PROJECTION_DRIFT') ? 'drift' : 'none',
    });
    process.exitCode = result.ok ? 0 : 1;
  }

  if (cli.command === 'decide') {
    const store = loadLifecycleStore(repoRoot);
    const plan = planDecide(lifecycleInput(store, { subjectRef: cli.id, value: cli.set }));
    printLifecycleReport(executeOperationPlan(repoRoot, plan, { execute: cli.execute }));
    process.exitCode = 0;
  }

  if (cli.command === 'visibility') {
    const store = loadLifecycleStore(repoRoot);
    const plan = planVisibility(lifecycleInput(store, {
      subjectRef: cli.id, value: cli.set, reason: cli.reason,
    }));
    printLifecycleReport(executeOperationPlan(repoRoot, plan, { execute: cli.execute }));
    process.exitCode = 0;
  }

  if (cli.command === 'reconcile') {
    const store = loadLifecycleStore(repoRoot);
    const request = readRequest(cli.request);
    const plan = planReconcile({
      repoRoot, store, ...request, authorityRef: request.authorityRef, candidates: request.evidenceCandidates ?? request.candidates,
    });
    printLifecycleReport(executeOperationPlan(repoRoot, plan, { execute: cli.execute }));
    process.exitCode = 0;
  }

  if (cli.command === 'correct') {
    const store = loadLifecycleStore(repoRoot);
    const request = readRequest(cli.request);
    const plan = planCorrect({
      repoRoot, store, ...request, targetAssertionId: cli.id, authorityRef: request.authorityRef,
    });
    printLifecycleReport(executeOperationPlan(repoRoot, plan, { execute: cli.execute }));
    process.exitCode = 0;
  }

  if (cli.command === 'reopen') {
    const store = loadLifecycleStore(repoRoot);
    const plan = planReopen(lifecycleInput(store, { subjectRef: cli.id, reason: cli.reason }));
    printLifecycleReport(executeOperationPlan(repoRoot, plan, { execute: cli.execute }));
    process.exitCode = 0;
  }

  if (cli.command === 'supersede') {
    const store = loadLifecycleStore(repoRoot);
    const plan = planSupersede(lifecycleInput(store, {
      oldDecisionAssertionId: cli.id,
      successorRevisionId: cli.successor,
      reason: cli.reason,
    }));
    printLifecycleReport(executeOperationPlan(repoRoot, plan, { execute: cli.execute }));
    process.exitCode = 0;
  }

  if (cli.command === 'migrate-legacy') {
    const store = loadLifecycleStore(repoRoot);
    const request = readRequest(cli.request);
    const plan = buildLegacyMigrationPlan({ repoRoot, store, request });
    const report = executeOperationPlan(repoRoot, plan, { execute: cli.execute });
    printLifecycleReport({ ...report, migration: plan.migration });
    process.exitCode = 0;
  }

  if (cli.command === 'research') {
    if (!cli.id) {
      console.error('Usage: yarn insight research <id> [--dry-run]');
      process.exit(1);
    }
    const apiKey = process.env.PERPLEXITY_API_KEY?.trim() ?? '';
    const result = await runInsightResearch(repoRoot, cli.id, {
      apiKey: apiKey.startsWith('pplx-') ? apiKey : undefined,
      dryRun: cli.dryRun,
    });
    if (cli.dryRun) {
      console.log('Dry-run queries:');
      for (const q of result.queries) {
        console.log(`\n[${q.key}] ${q.label}\n${q.query}`);
      }
      console.log('\nКаскад: PERPLEXITY_API_KEY → Cursor MCP Perplexity → manual');
      process.exit(0);
    }
    console.log(`RESEARCH.md обновлён (mode: ${result.mode})`);
    if (result.mode !== 'perplexity-api') {
      console.log('Дополни выжимку через MCP Perplexity или вручную, затем yarn insight review');
    }
    // NB5: НЕ process.exit(0) после сети — гонка с закрытием сокета роняет libuv на
    // Windows (UV_HANDLE_CLOSING). Паттерн репо (см. consilium.mjs): exitCode + дать
    // циклу стечь. dispatcher уже закрыт в anthropicPost/runInsightResearch.
    process.exitCode = 0;
  }

  if (cli.command === 'review') {
    if (!cli.id) {
      console.error('Usage: yarn insight review <id> [--dry-run]');
      process.exit(1);
    }
    const id = normalizeInsightId(cli.id);
    const dir = insightDir(repoRoot, id);
    const insightPath = join(dir, 'INSIGHT.md');
    const researchPath = join(dir, 'RESEARCH.md');
    if (!existsSync(insightPath)) {
      throw new Error(`Insight not found: ${id}`);
    }
    const insightMd = readFileSync(insightPath, 'utf8');
    const researchMd = existsSync(researchPath) ? readFileSync(researchPath, 'utf8') : '';
    const reviewPrompt = readFileSync(join(repoRoot, REVIEW_PROMPT_PATH), 'utf8');
    const virtualTeam = readFileSync(join(repoRoot, VIRTUAL_TEAM_PATH), 'utf8');
    const userMessage = [
      '# INSIGHT.md',
      insightMd,
      '',
      '# RESEARCH.md',
      researchMd,
      '',
      'Сформируй REVIEW.md по регламенту (5 ролей, таблица /10, резюме Teamlead).',
    ].join('\n');

    if (cli.dryRun) {
      console.log('--- system (truncated) ---');
      console.log(reviewPrompt.slice(0, 500));
      console.log('--- user (truncated) ---');
      console.log(userMessage.slice(0, 2000));
      process.exit(0);
    }

    const key = getAnthropicKey();
    const { ok, status, text: responseText } = await anthropicPost(
      'https://api.anthropic.com/v1/messages',
      {
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
        bodyJson: {
          model: defaultModel(),
          max_tokens: 4096,
          system: `${reviewPrompt}\n\n---\n\n${virtualTeam}`,
          messages: [{ role: 'user', content: userMessage }],
        },
      },
    );
    if (!ok) {
      if (isCreditExhausted(responseText)) console.error(`\n${CREDIT_FALLBACKS}\n`);
      throw new Error(`Anthropic HTTP ${status}: ${responseText.slice(0, 300)}`);
    }
    const json = JSON.parse(responseText);
    const text = (json.content ?? [])
      .filter((b) => b?.type === 'text')
      .map((b) => b.text)
      .join('\n');
    if (!text.trim()) {
      throw new Error('Empty review from Anthropic');
    }
    writeFileSync(join(dir, 'REVIEW.md'), `${text.trim()}\n`, 'utf8');

    const meta = JSON.parse(readFileSync(join(dir, 'meta.json'), 'utf8'));
    meta.status = 'reviewed';
    meta.reviewedAt = new Date().toISOString().slice(0, 10);
    const avgMatch = text.match(/\*\*Средний балл:\*\*\s*([\d.]+)/);
    if (avgMatch) {
      meta.weight = Number(avgMatch[1]);
    }
    writeFileSync(join(dir, 'meta.json'), `${JSON.stringify(meta, null, 2)}\n`, 'utf8');

    const registry = readRegistry(repoRoot);
    const entry = registry.insights.find((item) => item.id === id);
    if (entry) {
      entry.status = 'reviewed';
      if (meta.weight !== undefined) {
        entry.weight = meta.weight;
      }
    }
    writeRegistry(repoRoot, registry);
    console.log(`REVIEW.md записан: ${join(dir, 'REVIEW.md')}`);
    // NB5: exitCode вместо process.exit(0) — не ронять libuv гонкой с закрытием
    // сокета после anthropicPost (UV_HANDLE_CLOSING на Windows). См. коммент research.
    process.exitCode = 0;
  }

  if (cli.command === 'close') {
    console.error(JSON.stringify({
      ok: false,
      mode: 'BLOCKED',
      failure: {
        code: 'DEPRECATED_AMBIGUOUS_CLOSE',
        message: 'close/status смешивает legacy presentation и exact D decision',
      },
      next: 'yarn insight decide <mandate-id> --set accepted|rejected|deferred --request-key <key> --authority <ref>',
    }, null, 2));
    process.exit(2);
  }

  if (cli.command === 'archive') {
    console.error(JSON.stringify({
      ok: false,
      mode: 'BLOCKED',
      failure: {
        code: 'DEPRECATED_AMBIGUOUS_ARCHIVE',
        message: 'task/archive/result не доказывают L/O и не выбирают V',
      },
      next: [
        'yarn insight reconcile <id> --request <file>',
        'yarn insight visibility <representation-id> --set archived --reason "…" --request-key <key> --authority <ref>',
      ],
    }, null, 2));
    process.exit(2);
  }

  // NB5: гвард fall-through — research/review теперь ставят exitCode и НЕ выходят
  // через process.exit, поэтому «Unknown command» должен срабатывать только для
  // действительно неизвестной команды, а не после обработанной сетевой.
  const KNOWN_COMMANDS = new Set([
    'help', 'create', 'list', 'research', 'review', 'close', 'archive',
    'status', 'overview', 'verify', 'decide', 'reconcile', 'visibility',
    'correct', 'reopen', 'supersede', 'migrate-legacy',
  ]);
  if (!KNOWN_COMMANDS.has(cli.command)) {
    console.error(`Unknown command: ${cli.command}`);
    printInsightHelp();
    process.exit(1);
  }
} catch (error) {
  if (error instanceof OperationError || typeof error?.code === 'string') {
    console.error(JSON.stringify({
      ok: false,
      mode: 'BLOCKED',
      subjects: cli.id ? [cli.id] : [],
      diagnostics: [],
      safety: { writes: false },
      projectionDiff: 'none',
      failure: {
        code: error.code ?? 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : String(error),
        details: error.details,
      },
    }, null, 2));
  } else {
    console.error(error instanceof Error ? error.message : String(error));
  }
  process.exit(1);
}
