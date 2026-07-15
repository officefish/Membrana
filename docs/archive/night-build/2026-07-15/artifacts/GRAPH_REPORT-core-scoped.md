# Graph Report - .graphify-spike\scoped-core  (2026-07-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 477 nodes · 1172 edges · 25 communities (21 shown, 4 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8b7f412c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23

## God Nodes (most connected - your core abstractions)
1. `isNonEmptyString()` - 14 edges
2. `ScenarioGraphNode` - 13 edges
3. `isRecord()` - 13 edges
4. `parseDeviceScenarioDocument()` - 11 edges
5. `resolveScenarioGraphNodePure()` - 10 edges
6. `normalizeScenarioGraphNodePure()` - 10 edges
7. `isScenarioVariableValue()` - 10 edges
8. `DomainError` - 10 edges
9. `resolveScenarioFftTrendsPolicy()` - 9 edges
10. `GraphNodeId` - 9 edges

## Surprising Connections (you probably didn't know these)
- `ScenarioGraphNode` --references--> `ScenarioCollectorConfig`  [EXTRACTED]
  ../../packages/core/src/contracts/device-board/scenario-graph.ts → ../../packages/core/src/contracts/device-board/collector-config.ts
- `DeviceScenarioDocument` --references--> `DeviceKind`  [EXTRACTED]
  ../../packages/core/src/contracts/device-board/device-scenario.ts → ../../packages/core/src/contracts/device-board/device-kind.ts
- `parseDeviceScenarioDocument()` --calls--> `isDeviceKind()`  [EXTRACTED]
  ../../packages/core/src/contracts/device-board/device-scenario.ts → ../../packages/core/src/contracts/device-board/device-kind.ts
- `parseSubgraph()` --calls--> `normalizeScenarioGraphNodePure()`  [EXTRACTED]
  ../../packages/core/src/contracts/device-board/device-scenario.ts → ../../packages/core/src/contracts/device-board/scenario-node-pure.ts
- `parseDeviceScenarioDocument()` --calls--> `isScenarioVariable()`  [EXTRACTED]
  ../../packages/core/src/contracts/device-board/device-scenario.ts → ../../packages/core/src/contracts/device-board/scenario-variables.ts

## Import Cycles
- None detected.

## Communities (25 total, 4 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (72): BoardCaptureStatePayload, BoardEditLeaseHolder, BoardEditLeasePayload, RuntimeAuthority, RuntimeFollowerMode, BoardCaptureHeartbeatPayload, BoardCapturePayload, BoardCaptureReleasePayload (+64 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (51): createEmptyDeviceScenarioDocument(), DEVICE_SCENARIO_DOCUMENT_KIND, DEVICE_SCENARIO_DOCUMENT_VERSION, DEVICE_SCENARIO_MIN_DOCUMENT_VERSION, DeviceScenarioDocument, DeviceScenarioExecutionPolicy, DeviceScenarioMeta, DeviceScenarioWorkspaceKind (+43 more)

### Community 2 - "Community 2"
Cohesion: 0.09
Nodes (39): ADR-0002, DefaultAsyncCapableScenarioNodeKind, isDefaultAsyncCapableScenarioNodeKind(), resolveScenarioGraphNodeSupportsAsync(), AsyncOrchestrationScenarioNodeKind, CollectorScenarioNodeKind, ConstructorScenarioNodeKind, isAsyncOrchestrationScenarioNodeKind() (+31 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (41): ScenarioCaptureFormat, ScenarioRecordingWindowSec, clamp01(), createDateTimeValue(), createDetectionFusionValue(), createFftTrendsPolicyValue(), createIntegerValue(), createRecordingPolicyValue() (+33 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (29): description, devDependencies, eslint, rimraf, typescript, vitest, exports, files (+21 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (23): formatRecordingSliceRefHandle(), parseRecordingSliceRefHandle(), RECORDING_SLICE_REF_HANDLE_PREFIX, CONSTRUCTOR_ALWAYS_PURE_SCENARIO_NODE_KINDS, isScenarioPinKind(), SCENARIO_PIN_KINDS, ScenarioPinKind, createScenarioReportPayload() (+15 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (17): isScenarioAsyncJobKind(), isScenarioAsyncJobState(), isTerminalScenarioAsyncJobState(), clampAwaitTimeoutMs(), DEFAULT_SCENARIO_ASYNC_JOB_NODE_CONFIG, isScenarioAsyncJobNodeConfig(), resolveScenarioAsyncJobNodeConfig(), ScenarioAsyncJobNodeConfig (+9 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (19): clampUnit(), DEFAULT_FFT_TRENDS_POLICY, FFT_TRENDS_BUILTIN_TEMPLATE_KEYS, FFT_TRENDS_DETECTION_MODES, FFT_TRENDS_INTERVAL_MS_PRESETS, FFT_TRENDS_MEASUREMENT_COUNT_PRESETS, fftTrendsAnalysisDurationSec(), isDetectionMode() (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.19
Nodes (15): AnchorRecordMeta, buildAnchorRecord(), DriftAnchorKind, DriftAnchorRecord, DriftAnchorSource, DriftAnchorVerdict, evaluateProdMainDivergence(), ProdMainDivergence (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.21
Nodes (7): Repository, ConflictError, DomainError, NotFoundError, ValidationError, Id, Result

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (13): clampNumber(), DEFAULT_SCENARIO_COLLECTOR_CONFIG, isScenarioCollectorConfig(), resolveScenarioCollectorConfig(), ScenarioCollectorConfig, DEFAULT_RECORDING_POLICY, isCaptureFormat(), isRecordingWindowPreset() (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (13): compilerOptions, composite, outDir, rootDir, tsBuildInfoFile, exclude, extends, include (+5 more)

### Community 12 - "Community 12"
Cohesion: 0.24
Nodes (9): DEVICE_KINDS, DeviceKind, isDeviceKind(), NodeKindCategory, PluginNodeKind, SocketSpec, UserCaseCatalogEntrySummary, UserCaseLayoutProfile (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.23
Nodes (10): average(), classifyProximityTrend(), DEFAULTS, normalizeEvenWindow(), positiveOr(), ProximityTrend, ProximityTrendInput, ProximityTrendOptions (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.29
Nodes (6): clamp01(), DetectionFusionResult, fuseDetectorConfidences(), FusionPerSource, FusionSourceInput, normalizeWeight()

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (9): formatJournalRefHandle(), formatReporterRefHandle(), isJournalScopeKind(), JOURNAL_REF_HANDLE_PREFIX, JOURNAL_SCOPE_KINDS, JournalScopeKind, parseJournalRefHandle(), parseReporterRefJournalHandle() (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (9): DEFAULT_SCENARIO_COMMENT_GROUP_FRAME_COLOR, isScenarioCommentGroupBranch(), isScenarioCommentGroupFrameColorPreset(), resolveScenarioCommentGroupFrameColor(), SCENARIO_COMMENT_GROUP_FRAME_COLOR_PRESETS, ScenarioCommentGroupBranch, ScenarioCommentGroupFrameColor, ScenarioCommentGroupFrameColorPreset (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.22
Nodes (4): DeepReadonly, Entity, Timestamp, logger

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (6): clampThenCount(), DEFAULT_SCENARIO_SEQUENCE_CONFIG, isScenarioSequenceConfig(), isScenarioSequenceModeConflict(), resolveScenarioSequenceConfig(), ScenarioSequenceConfig

### Community 19 - "Community 19"
Cohesion: 0.40
Nodes (3): SyncedTimestamp, TdoaResult, TimeSyncProvider

## Knowledge Gaps
- **48 isolated node(s):** `name`, `version`, `description`, `type`, `main` (+43 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DomainError` connect `Community 9` to `Community 8`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `Result` connect `Community 9` to `Community 8`, `Community 1`, `Community 17`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `classifyProximityTrend()` connect `Community 13` to `Community 5`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _48 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06964443138407288 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06753246753246753 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.08637873754152824 - nodes in this community are weakly interconnected._