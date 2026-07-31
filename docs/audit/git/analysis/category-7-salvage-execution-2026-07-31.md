# Category 7 Salvage — execution report 2026-07-31

## Meta

| Field | Value |
| --- | --- |
| Status | `COMPLETE` |
| Owner gate | Ratified in the Codex task conversation on 2026-07-31 |
| Ledger | `C:/Users/user190825/practice/Membrana-codex/docs/audit/git/analysis/category-7-salvage-verdicts-2026-07-31.md` |
| Targets | 177 logical branches |
| Mutating deletions | 170 refs |
| Already absent | 7 refs |
| Protected non-targets | 9 branches |
| Post-check | all live worktrees after every mutating ref deletion |
| Stop reason | — |

## Events

| # | Ledger branch | Ref | Tip | Action | Result | ADR-0020 post-check |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | `feat/truth-graph-core` | `refs/heads/feat/truth-graph-core` | `2d2439cab5b828272c39236bd88f45736334f63d` | git branch -D (first attempt) | deleted; execution resumed | clean (15 live trees; immediate recovery check, findings=0) |
| 2 | `origin/feat/tooling-friction-2607` | `refs/remotes/origin/feat/tooling-friction-2607` | `bdcba7a326504d412162b149fe02a5d5dd786417` | git push origin --delete | deleted | clean (15 live trees) |
| 3 | `storm/home-workshop` | `refs/heads/storm/home-workshop` | `474535cafdb504aa8b8a19e448f2c5d6e71f3505` | git branch -D | deleted | clean (15 live trees) |
| 4 | `feat/skill-truth-crystallization` | `refs/heads/feat/skill-truth-crystallization` | `95c51bf96e1fff82af38b587624e8517ea032cca` | git branch -D | deleted | clean (15 live trees) |
| 5 | `chore/codex-idle` | `refs/heads/chore/codex-idle` | `8597dc37fb3ebb7ac05e630c80763299998d603c` | git branch -D | deleted | clean (15 live trees) |
| 6 | `feat/fft-last-chance` | `refs/heads/feat/fft-last-chance` | `a40d16889455fb0d3916002ae4795c36bca481a2` | git branch -D | deleted | clean (15 live trees) |
| 7 | `origin/chore/archive-audit-concentrate` | `refs/remotes/origin/chore/archive-audit-concentrate` | `28152550b2edc56f5de64418a5b4ae9eeb785973` | git push origin --delete | deleted | clean (15 live trees) |
| 8 | `origin/feat/strategic-docs-workshop` | `refs/remotes/origin/feat/strategic-docs-workshop` | `06d99f95d779657a8ba453b523d8b58215019be9` | git push origin --delete | deleted | clean (15 live trees) |
| 9 | `feat/worktree-hygiene-f1f2` | `refs/heads/feat/worktree-hygiene-f1f2` | `1ef38fd3693446f61ad36cebc7717af12408e726` | git branch -D | deleted | clean (15 live trees) |
| 10 | `meeting/sprint-honest-m2` | `refs/heads/meeting/sprint-honest-m2` | `e23210061523ffba32e4497987d87e55fa85dcff` | git branch -D | deleted | clean (15 live trees) |
| 11 | `origin/feat/precedents-meta-backfill` | `refs/remotes/origin/feat/precedents-meta-backfill` | `eb2721db77ae58a8934d3ed421fd6a2a80140d41` | git push origin --delete | deleted | clean (15 live trees) |
| 12 | `origin/ritual/day-2026-07-26` | `refs/remotes/origin/ritual/day-2026-07-26` | `9d56f5bd53fda67ee5d16964c928c06366587a35` | git push origin --delete | deleted | clean (15 live trees) |
| 13 | `chore/archive-tooling-friction-2026-07-29` | `refs/heads/chore/archive-tooling-friction-2026-07-29` | `eec4c6497c46307faf7c011abfec6421d21a7de4` | git branch -D | deleted | clean (15 live trees) |
| 14 | `chore/evening-2026-07-30` | `refs/heads/chore/evening-2026-07-30` | `dc6b220d97f5fb31b79e77a727f7d535d1b8c910` | git branch -D | deleted | clean (15 live trees) |
| 15 | `chore/night-triage-closure` | `refs/heads/chore/night-triage-closure` | `6d39ba3dc128567f2091f9f96bb5f20deb9d1491` | git branch -D | deleted | clean (15 live trees) |
| 16 | `feat/send-gate-on-path` | `refs/heads/feat/send-gate-on-path` | `ac80d323b5c2a2c1774f499dacba28156dbbfcd4` | git branch -D | deleted | clean (15 live trees) |
| 17 | `feat/tooling-sanitary-pack-3007` | `refs/heads/feat/tooling-sanitary-pack-3007` | `6a8f48fa8857ed5269f86e90b16722bcc36dd0db` | git branch -D | deleted | clean (15 live trees) |
| 18 | `feature/device-board-exec-sequence-ux` | `refs/heads/feature/device-board-exec-sequence-ux` | `b88b3e4dd81d6848e92b08614e10b9d2674a6d8e` | git branch -D | deleted | clean (15 live trees) |
| 19 | `origin/chore/review-gate-declaration` | `refs/remotes/origin/chore/review-gate-declaration` | `6394523b5d9dff0bbb8d894319e095fb9c800813` | git push origin --delete | deleted | clean (15 live trees) |
| 20 | `origin/feat/bc-b4-weekly` | `refs/remotes/origin/feat/bc-b4-weekly` | `5f27c63207b7bd2e20693e19a39697ea37c8f943` | git push origin --delete | deleted | clean (15 live trees) |
| 21 | `origin/feat/clean-runs-obstacles` | `refs/remotes/origin/feat/clean-runs-obstacles` | `d060641725f10a1276f4e86ed771d395859366b4` | git push origin --delete | deleted | clean (15 live trees) |
| 22 | `origin/feat/dual-mintlify-w2` | `refs/remotes/origin/feat/dual-mintlify-w2` | `443e5f7457f88ea82a5911f8f79b09dafa7eda22` | git push origin --delete | deleted | clean (15 live trees) |
| 23 | `origin/feature/kdm-d1-roots` | `refs/remotes/origin/feature/kdm-d1-roots` | `cd4fad1afac509a4e0540a3bb50be5c98c3f680c` | git push origin --delete | deleted | clean (15 live trees) |
| 24 | `origin/fix/decompose-config-catchup` | `refs/remotes/origin/fix/decompose-config-catchup` | `46419de2fa84c37e557313d6807e01092f3fd4c2` | git push origin --delete | deleted | clean (15 live trees) |
| 25 | `origin/meeting/bridge-command-post` | `refs/remotes/origin/meeting/bridge-command-post` | `c70025ff8fcb06f27986b3e29d57d62b7f8d62be` | git push origin --delete | deleted | clean (15 live trees) |
| 26 | `chore/archive-tooling-friction-2-2026-07-30` | `refs/heads/chore/archive-tooling-friction-2-2026-07-30` | `585985861d8ed32f9d149d4f981d938240e9254f` | git branch -D | deleted | clean (15 live trees) |
| 27 | `chore/tasks-audit-archive-sweep` | `refs/heads/chore/tasks-audit-archive-sweep` | `ea1a8c6f9d20556e5491e4dbc5e8ddb0149c3c07` | git branch -D | deleted | clean (15 live trees) |
| 28 | `docs/board-refactor-update` | `refs/heads/docs/board-refactor-update` | `61c751ee477682843791a66dbefc2847ca121788` | git branch -D | deleted | clean (15 live trees) |
| 29 | `docs/day-2907-evening-sprint-meeting` | `refs/heads/docs/day-2907-evening-sprint-meeting` | `cb7525c972ed72facd155f30d894d2e848532431` | git branch -D | deleted | clean (15 live trees) |
| 30 | `docs/epic-truth-graph-contour` | `refs/heads/docs/epic-truth-graph-contour` | `a2656f84531e2269c5553d1e68fb56c458775abb` | git branch -D | deleted | clean (15 live trees) |
| 31 | `feat/audit-concentrate-clean` | `refs/heads/feat/audit-concentrate-clean` | `508ae61ba9b3508160e7cf8451c87344dd1fd697` | git branch -D | deleted | clean (15 live trees) |
| 32 | `feat/case-mechanism-friction-to-tooth` | `refs/heads/feat/case-mechanism-friction-to-tooth` | `5691eafe776fa121ea1d0ed500a54b8bea3d6719` | git branch -D | deleted | clean (15 live trees) |
| 33 | `meeting/workshop-wires-m1-verdict-2026-07-30` | `refs/heads/meeting/workshop-wires-m1-verdict-2026-07-30` | `cba27e0577c1876aaee5dd3b85a6d3e56b99b214` | git branch -D | deleted | clean (15 live trees) |
| 34 | `origin/chore/archive-bc-b4-weekly` | `refs/remotes/origin/chore/archive-bc-b4-weekly` | `0d3eaab40dbf5ab3bc6c180e5e2cb528526565aa` | git push origin --delete | deleted | clean (15 live trees) |
| 35 | `origin/chore/archive-bc-b5-closure` | `refs/remotes/origin/chore/archive-bc-b5-closure` | `ac2b5db182988a446844bdb4c4ae83c0052fb483` | git push origin --delete | deleted | clean (15 live trees) |
| 36 | `origin/chore/evening-2026-07-25` | `refs/remotes/origin/chore/evening-2026-07-25` | `927a5257650ecb848f3b65edac2f2f1111fcf947` | git push origin --delete | deleted | clean (15 live trees) |
| 37 | `origin/chore/sar-w4-closure` | `refs/remotes/origin/chore/sar-w4-closure` | `1286dce812e79a27ba5c11a3a9ed558240c5ebb3` | git push origin --delete | deleted | clean (15 live trees) |
| 38 | `origin/feat/bc-b1-home` | `refs/remotes/origin/feat/bc-b1-home` | `78ead0945ec7559644b69c1c09ebdf92cf70b586` | git push origin --delete | deleted | clean (15 live trees) |
| 39 | `origin/feat/bc-b5-closure` | `refs/remotes/origin/feat/bc-b5-closure` | `11a543148058252deff8665727b45a7829ee7121` | git push origin --delete | deleted | clean (15 live trees) |
| 40 | `origin/feat/branch-protection-policy` | `refs/remotes/origin/feat/branch-protection-policy` | `d8cc2be8d150954cc6f5fa20ee7b1ccb81be397c` | git push origin --delete | deleted | clean (15 live trees) |
| 41 | `origin/feat/cases-container` | `refs/remotes/origin/feat/cases-container` | `a39358946af0ac85ccbfab935259c88a92b50dff` | git push origin --delete | deleted | clean (15 live trees) |
| 42 | `origin/feat/infra-policy-probe` | `refs/remotes/origin/feat/infra-policy-probe` | `5441593115c11721baba4b8db405e334735b0386` | git push origin --delete | deleted | clean (15 live trees) |
| 43 | `origin/feat/kdm-d4-closure` | `refs/remotes/origin/feat/kdm-d4-closure` | `28b263dcfc97a248b536a1d62199fc63658eea66` | git push origin --delete | deleted | clean (15 live trees) |
| 44 | `origin/feat/pr-verify-fail-loud` | `refs/remotes/origin/feat/pr-verify-fail-loud` | `e2c261f69dcb1a06ab785bb52b1f3b9e96f5551d` | git push origin --delete | deleted | clean (15 live trees) |
| 45 | `origin/fix/archivarius-hygiene-params` | `refs/remotes/origin/fix/archivarius-hygiene-params` | `ebbbc2429b661529c15c3f823c30812fad7a09bd` | git push origin --delete | deleted | clean (15 live trees) |
| 46 | `origin/fix/llm-channels-panel-wire` | `refs/remotes/origin/fix/llm-channels-panel-wire` | `50db3543a5d417c7c13b98129b556367770fcfc3` | git push origin --delete | deleted | clean (15 live trees) |
| 47 | `origin/fix/registry-broken-prompt-links` | `refs/remotes/origin/fix/registry-broken-prompt-links` | `e38fb0c5bd1043858c5b2dd5cbfc381139f3d6c8` | git push origin --delete | deleted | clean (15 live trees) |
| 48 | `origin/meeting/bridge-command-post-r2` | `refs/remotes/origin/meeting/bridge-command-post-r2` | `ffab386a9c09715d808a46a274fb172fffea3004` | git push origin --delete | deleted | clean (15 live trees) |
| 49 | `origin/memory/block-migrate` | `refs/remotes/origin/memory/block-migrate` | `572333e916c8c04418b1130ffa63f12d490a7908` | git push origin --delete | deleted | clean (15 live trees) |
| 50 | `tooling/consilium-input-manifest-2026-07-30` | `refs/heads/tooling/consilium-input-manifest-2026-07-30` | `82fdaf987cf97e4f2cfd5e712e27055701b53f51` | git branch -D | deleted | clean (15 live trees) |
| 51 | `tooling/consilium-input-manifest-r2-2026-07-30` | `refs/heads/tooling/consilium-input-manifest-r2-2026-07-30` | `82fdaf987cf97e4f2cfd5e712e27055701b53f51` | git branch -D | deleted | clean (15 live trees) |
| 52 | `tooling/idle-2026-07-30-c` | `refs/heads/tooling/idle-2026-07-30-c` | `585985861d8ed32f9d149d4f981d938240e9254f` | git branch -D | deleted | clean (15 live trees) |
| 53 | `tooling/workspace-links-doctor-2026-07-29` | `refs/heads/tooling/workspace-links-doctor-2026-07-29` | `42deb11719c244e5bcfc2e9118b633275117515b` | git branch -D | deleted | clean (15 live trees) |
| 54 | `tooling/worktree-bootstrap-canon-2026-07-29` | `refs/heads/tooling/worktree-bootstrap-canon-2026-07-29` | `934182ecf91f3ac1cd545667ef21e4535af1f608` | git branch -D | deleted | clean (15 live trees) |
| 55 | `chore/archive-procedures-corpus` | `refs/heads/chore/archive-procedures-corpus` | `464b77080b6d4477189b77055f1f027fb790f56b` | git branch -D | deleted | clean (15 live trees) |
| 56 | `chore/archive-tw-v3-axes` | `refs/heads/chore/archive-tw-v3-axes` | `f8f2a48139293a9355fb03d32fb3a86b6c13b186` | git branch -D | deleted | clean (15 live trees) |
| 57 | `chore/archive-tw-v5-validity` | `refs/heads/chore/archive-tw-v5-validity` | `40f696ef4378ef2e33d1819ed8ba0672b55b2339` | git branch -D | deleted | clean (15 live trees) |
| 58 | `chore/evening-2026-07-29` | `refs/heads/chore/evening-2026-07-29` | `aa890a2c75b180a60671be24ce925280b281aa4c` | git branch -D | deleted | clean (15 live trees) |
| 59 | `chore/weekly-dead-wire-audit` | `refs/heads/chore/weekly-dead-wire-audit` | `a3f58dd01ef786cc8331c1fbb47b1d238dc29cb0` | git branch -D | deleted | clean (15 live trees) |
| 60 | `docs/adr-0020-controlled-demolition` | `refs/heads/docs/adr-0020-controlled-demolition` | `6f21880ad7d26a79c357cb0211359d8ebd885180` | git branch -D | deleted | clean (15 live trees) |
| 61 | `docs/day-2907-bridge-storm-meeting` | `refs/heads/docs/day-2907-bridge-storm-meeting` | `f8a83f2f6741070d3ed91ef2238139512f7a60ec` | git branch -D | deleted | clean (15 live trees) |
| 62 | `docs/handoff-2026-07-30` | `refs/heads/docs/handoff-2026-07-30` | `7a1069f6a1a3d25eaacac132fd3ed2b2cbf46d55` | git branch -D | deleted | clean (15 live trees) |
| 63 | `docs/handoff-3007-canon` | `refs/heads/docs/handoff-3007-canon` | `a64950a09b9e019651f046bd5e1c48ff299a948a` | git branch -D | deleted | clean (15 live trees) |
| 64 | `docs/handoff-format-canon` | `refs/heads/docs/handoff-format-canon` | `359cecb2f152655e23e76012f892d047e1920333` | git branch -D | deleted | clean (15 live trees) |
| 65 | `docs/insight-recollection-pattern` | `refs/heads/docs/insight-recollection-pattern` | `e57e1be6a42a3d2aaa37988e50dd0692ac4b0378` | git branch -D | deleted | clean (15 live trees) |
| 66 | `docs/insight-recollection-pattern-r2` | `refs/heads/docs/insight-recollection-pattern-r2` | `667e1faee9cd6cd3c163672a2cea8f8d7097d48a` | git branch -D | deleted | clean (15 live trees) |
| 67 | `docs/insight-truth-tokens-asset` | `refs/heads/docs/insight-truth-tokens-asset` | `5322e9883ddf197d3af837855cc11d55a20169a5` | git branch -D | deleted | clean (15 live trees) |
| 68 | `docs/network-container-material` | `refs/heads/docs/network-container-material` | `8a2b762ffa46d9637afd0c8c2702fd0969343dcd` | git branch -D | deleted | clean (15 live trees) |
| 69 | `docs/network-howto` | `refs/heads/docs/network-howto` | `d46a47054a9493f7166073577f4e34770d8b2b1b` | git branch -D | deleted | clean (15 live trees) |
| 70 | `feat/network-container` | `refs/heads/feat/network-container` | `fa0eabdfc370b4d1a003c27521900aae22e12301` | git branch -D | deleted | clean (15 live trees) |
| 71 | `feat/tariff-grid-s0-seed` | `refs/heads/feat/tariff-grid-s0-seed` | `a8e44493828e6ad43e36926510e659c9c44aa71c` | git branch -D | deleted | clean (15 live trees) |
| 72 | `feat/tariff-grid-s1-home` | `refs/heads/feat/tariff-grid-s1-home` | `7ce86a579956a31cf70f35a637f141701323d71d` | git branch -D | deleted | clean (15 live trees) |
| 73 | `feat/tariff-grid-s2-resolve` | `refs/heads/feat/tariff-grid-s2-resolve` | `46f2f3ee54b8dfe05baacebc314f7313190a49de` | git branch -D | deleted | clean (15 live trees) |
| 74 | `feat/tariff-grid-s3-projection` | `refs/heads/feat/tariff-grid-s3-projection` | `4e571b2752bcb4fba34d3db110f099413465df21` | git branch -D | deleted | clean (15 live trees) |
| 75 | `feat/tariff-grid-s4-quota` | `refs/heads/feat/tariff-grid-s4-quota` | `79f543da65c249b3384aa4f79a4ecd46a60f709f` | git branch -D | deleted | clean (15 live trees) |
| 76 | `feat/tariff-grid-s5-produce` | `refs/heads/feat/tariff-grid-s5-produce` | `5fd751f4a342ab2d07798d0c88ca2d74c13cc417` | git branch -D | deleted | clean (15 live trees) |
| 77 | `feat/tariff-grid-s7-vitrine` | `refs/heads/feat/tariff-grid-s7-vitrine` | `52bf5b5dc51e767d1bfa7d5927673506209cf2b2` | git branch -D | deleted | clean (15 live trees) |
| 78 | `feat/tariff-grid-s8-transition` | `refs/heads/feat/tariff-grid-s8-transition` | `e7817a819a933d07021331d3414b3b4f07d8d3a2` | git branch -D | deleted | clean (15 live trees) |
| 79 | `feat/tariff-grid-s9-cutover` | `refs/heads/feat/tariff-grid-s9-cutover` | `e8ccde5c483f598a7bfc655c6664775bd18cf857` | git branch -D | deleted | clean (15 live trees) |
| 80 | `meeting/sprint-honest-m2-r2` | `refs/heads/meeting/sprint-honest-m2-r2` | `5761f4fa2d460ec47e0cba66af1f27299e91cf94` | git branch -D | deleted | clean (15 live trees) |
| 81 | `meeting/workshop-wires-m0-2026-07-30` | `refs/heads/meeting/workshop-wires-m0-2026-07-30` | `2506b0b0a967c59424dc2a01cc3b500aaeede78e` | git branch -D | deleted | clean (15 live trees) |
| 82 | `meeting/workshop-wires-m1-agenda-2026-07-30` | `refs/heads/meeting/workshop-wires-m1-agenda-2026-07-30` | `a3a2b9247871f35d2dab71a12c4e588d28ae6810` | git branch -D | deleted | clean (15 live trees) |
| 83 | `meeting/workshop-wires-m2-agenda-2026-07-30` | `refs/heads/meeting/workshop-wires-m2-agenda-2026-07-30` | `23780ffe4cfaf0add9fa5eb24cbc0146becaf63f` | git branch -D | deleted | clean (15 live trees) |
| 84 | `meeting/workshop-wires-m2-verdict-2026-07-30` | `refs/heads/meeting/workshop-wires-m2-verdict-2026-07-30` | `81b53b816d1df006310df75ad7e765d2bc3324a3` | git branch -D | deleted | clean (15 live trees) |
| 85 | `meeting/workshop-wires-m3-agenda-2026-07-30` | `refs/heads/meeting/workshop-wires-m3-agenda-2026-07-30` | `e70d36c9f84734925829602e974215371a3414e5` | git branch -D | deleted | clean (15 live trees) |
| 86 | `meeting/workshop-wires-m3-agenda-fix-2026-07-30` | `refs/heads/meeting/workshop-wires-m3-agenda-fix-2026-07-30` | `407a42e9d8efd123d39a4f276e518e2bc76317bb` | git branch -D | deleted | clean (15 live trees) |
| 87 | `meeting/workshop-wires-m3-verdict-2026-07-30` | `refs/heads/meeting/workshop-wires-m3-verdict-2026-07-30` | `1a74af7950e8ed69edc5dc1bf7aa30011a752eaf` | git branch -D | deleted | clean (15 live trees) |
| 88 | `meeting/workshop-wires-m4-verdict-2026-07-30` | `refs/heads/meeting/workshop-wires-m4-verdict-2026-07-30` | `f459b36669b63e61f5a9a455f7671f3f3efc7b35` | git branch -D | deleted | clean (15 live trees) |
| 89 | `meeting/workshop-wires-m5-close-2026-07-30` | `refs/heads/meeting/workshop-wires-m5-close-2026-07-30` | `ac007fd53ceeb2e74a2ae4eaea1d62fe79a4a14b` | git branch -D | deleted | clean (15 live trees) |
| 90 | `meeting/workshop-wires-m6-verdict-2026-07-30` | `refs/heads/meeting/workshop-wires-m6-verdict-2026-07-30` | `bc2450d7b0b7386cac9d18a7283985f9dd0e981c` | git branch -D | deleted | clean (15 live trees) |
| 91 | `meeting/workshop-wires-m7-verdict-2026-07-30` | `refs/heads/meeting/workshop-wires-m7-verdict-2026-07-30` | `25f367b986b2416a68eb95565963d9be945778b2` | git branch -D | deleted | clean (15 live trees) |
| 92 | `meeting/workshop-wires-m8-agenda-2026-07-30` | `refs/heads/meeting/workshop-wires-m8-agenda-2026-07-30` | `13d9075616e81a3d14d1b3e21bb98f2af5fbf239` | git branch -D | deleted | clean (15 live trees) |
| 93 | `meeting/workshop-wires-m8-verdict-2026-07-30` | `refs/heads/meeting/workshop-wires-m8-verdict-2026-07-30` | `ca098a0b442d656783ced0ad775f5813e23aa5eb` | git branch -D | deleted | clean (15 live trees) |
| 94 | `meeting/workshop-wires-m9-verdict-2026-07-30` | `refs/heads/meeting/workshop-wires-m9-verdict-2026-07-30` | `2292782a0155449e1223fd7c7964719aa61b30db` | git branch -D | deleted | clean (15 live trees) |
| 95 | `origin/angelina/chore/archive-frame-rails-done` | `refs/remotes/origin/angelina/chore/archive-frame-rails-done` | `47a43d7065ccee99e6c848a6572173106c69c2d6` | git push origin --delete | deleted | clean (15 live trees) |
| 96 | `origin/angelina/feat/ritual-deliver-to-main` | `refs/remotes/origin/angelina/feat/ritual-deliver-to-main` | `271d12c14fbc9a53289edafb5fe1581bed37123b` | git push origin --delete | deleted | clean (15 live trees) |
| 97 | `origin/angelina/fix/office-deploy-tar-force-local` | `refs/remotes/origin/angelina/fix/office-deploy-tar-force-local` | `83082184bc9a74dc0caf8e54ace748915f1406b7` | git push origin --delete | deleted | clean (15 live trees) |
| 98 | `origin/audit-pr-1508` | `refs/remotes/origin/audit-pr-1508` | `463d18f85e` | none | already absent | no mutation |
| 99 | `origin/audit-pr-1513` | `refs/remotes/origin/audit-pr-1513` | `86968c5e95` | none | already absent | no mutation |
| 100 | `origin/audit-pr-1521` | `refs/remotes/origin/audit-pr-1521` | `9db2e71fb7` | none | already absent | no mutation |
| 101 | `origin/chore/archive-bc-b0-brief` | `refs/remotes/origin/chore/archive-bc-b0-brief` | `42f1297e48d0902a25b839fe29bb51aa0ef52fcd` | git push origin --delete | deleted | clean (15 live trees) |
| 102 | `origin/chore/archive-bc-b1-home` | `refs/remotes/origin/chore/archive-bc-b1-home` | `10d8ed61abebed003ea34c1e6cef60e5b5186684` | git push origin --delete | deleted | clean (15 live trees) |
| 103 | `origin/chore/archive-bc-b2-specimens` | `refs/remotes/origin/chore/archive-bc-b2-specimens` | `e01cf2168af01edf89f0db37553a5e575da7c8eb` | git push origin --delete | deleted | clean (15 live trees) |
| 104 | `origin/chore/archive-bc-b3-missing-beasts` | `refs/remotes/origin/chore/archive-bc-b3-missing-beasts` | `0dc555b5ae5b500d71b8bbf12e1e28fd6beb61ab` | git push origin --delete | deleted | clean (15 live trees) |
| 105 | `origin/chore/archive-delivery-facts` | `refs/remotes/origin/chore/archive-delivery-facts` | `e9e2320afee1efdbccbbca7b4d13ed77ddf9a62d` | git push origin --delete | deleted | clean (15 live trees) |
| 106 | `origin/chore/archive-friction6-ship` | `refs/remotes/origin/chore/archive-friction6-ship` | `b084f5a31d2628a5af75a3a8b53839f7c38decc4` | git push origin --delete | deleted | clean (15 live trees) |
| 107 | `origin/chore/archive-insight-lifecycle-canon` | `refs/remotes/origin/chore/archive-insight-lifecycle-canon` | `7332657e0281cc50bc2280c9d4d8f60a14eb20bb` | git push origin --delete | deleted | clean (15 live trees) |
| 108 | `origin/chore/archive-kdm-d1-roots` | `refs/remotes/origin/chore/archive-kdm-d1-roots` | `a9ede04b32d0a7cea9cda885c17fe7c391061cab` | git push origin --delete | deleted | clean (15 live trees) |
| 109 | `origin/chore/archive-kdm-d2-kit` | `refs/remotes/origin/chore/archive-kdm-d2-kit` | `545bdefe7ace896111101572db5013b49791ea80` | git push origin --delete | deleted | clean (15 live trees) |
| 110 | `origin/chore/archive-kdm-d3-procedure` | `refs/remotes/origin/chore/archive-kdm-d3-procedure` | `abdee51eeffa6167b668a5b1a2cc8a1c590b08a7` | git push origin --delete | deleted | clean (15 live trees) |
| 111 | `origin/chore/archive-kdm-d4-closure` | `refs/remotes/origin/chore/archive-kdm-d4-closure` | `604845e38491f532cf975c3e90deca1198c3959b` | git push origin --delete | deleted | clean (15 live trees) |
| 112 | `origin/chore/archive-procedures-corpus-r2` | `refs/remotes/origin/chore/archive-procedures-corpus-r2` | `d545992420fe23569eee5da4242c72fc36cc094b` | git push origin --delete | deleted | clean (15 live trees) |
| 113 | `origin/chore/archive-secret-cutter` | `refs/remotes/origin/chore/archive-secret-cutter` | `33c5856a422aa87ae852946b2f029f84d1ba46b6` | git push origin --delete | deleted | clean (15 live trees) |
| 114 | `origin/chore/archive-tw-v6-invariants` | `refs/remotes/origin/chore/archive-tw-v6-invariants` | `bac191b898077728409788aaf87178a38a67f041` | git push origin --delete | deleted | clean (15 live trees) |
| 115 | `origin/chore/bc-open-b0-done` | `refs/remotes/origin/chore/bc-open-b0-done` | `52c74bcb10783aa8cfe68724b4b5bdd16aa02e99` | git push origin --delete | deleted | clean (15 live trees) |
| 116 | `origin/chore/bridge-room` | `refs/remotes/origin/chore/bridge-room` | `c1de4f154bc3d8d067c6781be6884931e9010971` | git push origin --delete | deleted | clean (15 live trees) |
| 117 | `origin/chore/deps-basket-card` | `refs/remotes/origin/chore/deps-basket-card` | `8e23eb6bd3f45954e7193ccc4f1e910b9b8fc8ac` | git push origin --delete | deleted | clean (15 live trees) |
| 118 | `origin/chore/dreams-office-deploy-prep` | `refs/remotes/origin/chore/dreams-office-deploy-prep` | `78eeaf129d2f5467795b96229f4851cb38169e67` | git push origin --delete | deleted | clean (15 live trees) |
| 119 | `origin/chore/oversized-review-debt` | `refs/remotes/origin/chore/oversized-review-debt` | `d9fabd3eef36c692cb25a417a263f8636849a031` | git push origin --delete | deleted | clean (15 live trees) |
| 120 | `origin/chore/truth-archive-pointer` | `refs/remotes/origin/chore/truth-archive-pointer` | `edb4438655c1862457988ddef58c69d45976056c` | git push origin --delete | deleted | clean (15 live trees) |
| 121 | `origin/chore/truth-archive-pointer-r2` | `refs/remotes/origin/chore/truth-archive-pointer-r2` | `6df9b149f6bf470ad9622202bfb5e520a32529a3` | git push origin --delete | deleted | clean (15 live trees) |
| 122 | `origin/docs/board-is-window-elapsed-clean` | `refs/remotes/origin/docs/board-is-window-elapsed-clean` | `97e921a7b8f73bfac22188c906b251f7562490e8` | git push origin --delete | deleted | clean (15 live trees) |
| 123 | `origin/docs/insight-procedures-orchestration` | `refs/remotes/origin/docs/insight-procedures-orchestration` | `6f0ddf7401ef6e0c484ae319dc554200f82ff9bb` | git push origin --delete | deleted | clean (15 live trees) |
| 124 | `origin/docs/insight-server-generators-clean` | `refs/remotes/origin/docs/insight-server-generators-clean` | `8aea7f5d562ff4842f4092d4af8f2393e9994404` | git push origin --delete | deleted | clean (15 live trees) |
| 125 | `origin/docs/precedent-honest-linear2` | `refs/remotes/origin/docs/precedent-honest-linear2` | `0a5f16f36ef7789edf0123fc2564af43120f0f44` | git push origin --delete | deleted | clean (15 live trees) |
| 126 | `origin/feat/archivarius-codex-cursor-ingest` | `refs/remotes/origin/feat/archivarius-codex-cursor-ingest` | `1f747916435502294f63e913221f97472b1ddd97` | git push origin --delete | deleted | clean (15 live trees) |
| 127 | `origin/feat/bc-b0-brief` | `refs/remotes/origin/feat/bc-b0-brief` | `dcf59cfc5476a0fd8fdd7f16cb38e207341a7f14` | git push origin --delete | deleted | clean (15 live trees) |
| 128 | `origin/feat/bc-b2-specimens` | `refs/remotes/origin/feat/bc-b2-specimens` | `5a5e4b044d0b1337609e9606e764c0833ff95233` | git push origin --delete | deleted | clean (15 live trees) |
| 129 | `origin/feat/bc-b3-missing-beasts` | `refs/remotes/origin/feat/bc-b3-missing-beasts` | `1130f592d748e5a9965a98e898830913fe05655e` | git push origin --delete | deleted | clean (15 live trees) |
| 130 | `origin/feat/bridge-charter-weave` | `refs/remotes/origin/feat/bridge-charter-weave` | `aeb2f2149eab0e7d295aed2895b9378b835b4eb6` | git push origin --delete | deleted | clean (15 live trees) |
| 131 | `origin/feat/bridge-memory-granite` | `refs/remotes/origin/feat/bridge-memory-granite` | `cfc3f161159c47ac7101189ceef502a298592841` | git push origin --delete | deleted | clean (15 live trees) |
| 132 | `origin/feat/case-mining-skill` | `refs/remotes/origin/feat/case-mining-skill` | `ddf30eddc2d12aa9f1d8b5028ac398c8e82831f2` | git push origin --delete | deleted | clean (15 live trees) |
| 133 | `origin/feat/day-memo-layers` | `refs/remotes/origin/feat/day-memo-layers` | `1cf64a61771e32710a5eb24a0569e47cf4283bbb` | git push origin --delete | deleted | clean (15 live trees) |
| 134 | `origin/feat/evidence-workshop-index` | `refs/remotes/origin/feat/evidence-workshop-index` | `7557478088d10cdb24c6dd7940cc0040007fffe0` | git push origin --delete | deleted | clean (15 live trees) |
| 135 | `origin/feat/handoff-claim` | `refs/remotes/origin/feat/handoff-claim` | `026391d8312e57880529414fb70f820fecd89762` | git push origin --delete | deleted | clean (15 live trees) |
| 136 | `origin/feat/kdm-d3-procedure` | `refs/remotes/origin/feat/kdm-d3-procedure` | `5e7ae95638975c87fd1db754f6bb6a93d147468a` | git push origin --delete | deleted | clean (15 live trees) |
| 137 | `origin/feat/kits-pins-prepush-strict` | `refs/remotes/origin/feat/kits-pins-prepush-strict` | `80b9078e7d61be662ddcaea64036cd7dded57582` | git push origin --delete | deleted | clean (15 live trees) |
| 138 | `origin/feat/linear-movement-layer-close` | `refs/remotes/origin/feat/linear-movement-layer-close` | `43b5ae73ea0756dc7cea349f94a158134922cea8` | git push origin --delete | deleted | clean (15 live trees) |
| 139 | `origin/feat/memory-p4-oplog` | `refs/remotes/origin/feat/memory-p4-oplog` | `dd496505264028984755ac31c7b4611f07925dcd` | git push origin --delete | deleted | clean (15 live trees) |
| 140 | `origin/feat/merge-fact-origin-main` | `refs/remotes/origin/feat/merge-fact-origin-main` | `1cfe287ad047b54914b87b4b6ec9cbe98981237a` | git push origin --delete | deleted | clean (15 live trees) |
| 141 | `origin/feat/pr-ship-body-flags` | `refs/remotes/origin/feat/pr-ship-body-flags` | `944e1dbf0683e8a9b48c5fafdfcfc2d05d4c5814` | git push origin --delete | deleted | clean (15 live trees) |
| 142 | `origin/feat/pr-verify-wait` | `refs/remotes/origin/feat/pr-verify-wait` | `56fbc5f64fc0ceabf304918ba7bea096677effbe` | git push origin --delete | deleted | clean (15 live trees) |
| 143 | `origin/feat/ship-merge-state-guard` | `refs/remotes/origin/feat/ship-merge-state-guard` | `0f069408315f7694e7e270ab698114be21344d7a` | git push origin --delete | deleted | clean (15 live trees) |
| 144 | `origin/feat/tw-state-batch-norm` | `refs/remotes/origin/feat/tw-state-batch-norm` | `31686ea96cb9a826acf3c544bf10c61a14a013a1` | git push origin --delete | deleted | clean (15 live trees) |
| 145 | `origin/feature/kdm-d2-kit` | `refs/remotes/origin/feature/kdm-d2-kit` | `1d02748d25b1896a4d98d69c0ce8bfcdb83f7ad7` | git push origin --delete | deleted | clean (15 live trees) |
| 146 | `origin/fix/consilium-canon-sync` | `refs/remotes/origin/fix/consilium-canon-sync` | `d3f21d716068bdf60c21540400138ddd02548701` | git push origin --delete | deleted | clean (15 live trees) |
| 147 | `origin/fix/consilium-canon-sync-r2` | `refs/remotes/origin/fix/consilium-canon-sync-r2` | `e3c4f700e7b8c34898b2d9fec5817d5c35404cfd` | git push origin --delete | deleted | clean (15 live trees) |
| 148 | `origin/fix/review-gate-pr-head` | `refs/remotes/origin/fix/review-gate-pr-head` | `a07cda8910aaa3c3af83a3591d10449e3e41fbb1` | git push origin --delete | deleted | clean (15 live trees) |
| 149 | `origin/integration/pre-tj-live-79` | `refs/remotes/origin/integration/pre-tj-live-79` | `238125505cc2fec5dfeb7d7f4527cec8bcf7acc3` | git push origin --delete | deleted | clean (15 live trees) |
| 150 | `origin/meeting/memory-c2` | `refs/remotes/origin/meeting/memory-c2` | `162f3aefa971580ca0ad25bfabfa795c848a77ac` | git push origin --delete | deleted | clean (15 live trees) |
| 151 | `origin/meeting/memory-c3` | `refs/remotes/origin/meeting/memory-c3` | `98622452da8cf279458d0285ceb06624f938d4b6` | git push origin --delete | deleted | clean (15 live trees) |
| 152 | `origin/night-hunt/services-api-drift-1784545232727` | `refs/remotes/origin/night-hunt/services-api-drift-1784545232727` | `2af95c1610489994917229b2c6affc6134371c78` | git push origin --delete | deleted | clean (15 live trees) |
| 153 | `origin/pr-1508` | `refs/remotes/origin/pr-1508` | `463d18f85e` | none | already absent | no mutation |
| 154 | `origin/pr-1513` | `refs/remotes/origin/pr-1513` | `86968c5e95` | none | already absent | no mutation |
| 155 | `origin/research/bridge-first-cases` | `refs/remotes/origin/research/bridge-first-cases` | `a22a1851ca2f33e437d8b485977e9abb9c1254cd` | git push origin --delete | deleted | clean (15 live trees) |
| 156 | `origin/tooling/meeting-consilium-voice` | `refs/remotes/origin/tooling/meeting-consilium-voice` | `2e07a2ede0df4d6b10f0b1f896570226ade15597` | git push origin --delete | deleted | clean (15 live trees) |
| 157 | `ritual-xai-deploy` | `refs/heads/ritual-xai-deploy` | `83082184bc9a74dc0caf8e54ace748915f1406b7` | git branch -D | deleted | clean (15 live trees) |
| 158 | `skills/honest-sprint-skill` | `refs/heads/skills/honest-sprint-skill` | `4293ed88dc92beaef046ad917298ce8348ba5319` | git branch -D | deleted | clean (15 live trees) |
| 159 | `storm/team-volume-3007` | `refs/heads/storm/team-volume-3007` | `003e2c5af04f90b7bf2afcb3a9185699d4dcab7b` | git branch -D | deleted | clean (15 live trees) |
| 160 | `tooling/agents-rakes-2026-07-29` | `refs/heads/tooling/agents-rakes-2026-07-29` | `2c0650629ecbdb99fa695a39262be341e340ab48` | git branch -D | deleted | clean (15 live trees) |
| 161 | `tooling/ci-red-triage-2026-07-30` | `refs/heads/tooling/ci-red-triage-2026-07-30` | `e13734cc505861f3f2c71516c7f584b7e8bd17b1` | git branch -D | deleted | clean (15 live trees) |
| 162 | `tooling/consilium-agenda-head-2026-07-30` | `refs/heads/tooling/consilium-agenda-head-2026-07-30` | `3db6c94eb9a10185f83977428701c15184b0da2d` | git branch -D | deleted | clean (15 live trees) |
| 163 | `tooling/deps-basket-reconcile-2026-07-30` | `refs/heads/tooling/deps-basket-reconcile-2026-07-30` | `e9947741540421065d0ed0df060cb5a231cde3ee` | git branch -D | deleted | clean (15 live trees) |
| 164 | `tooling/handoff-2026-07-30` | `refs/heads/tooling/handoff-2026-07-30` | `002729487192d8831d3225361ca0f4df55ddc4cd` | git branch -D | deleted | clean (15 live trees) |
| 165 | `tooling/network-proxy-aware-2026-07-29` | `refs/heads/tooling/network-proxy-aware-2026-07-29` | `d7f87e4e67cb3edcf8ed080ee7ccab5dc43881ee` | git branch -D | deleted | clean (15 live trees) |
| 166 | `tooling/rakes-audit-install-2026-07-30` | `refs/heads/tooling/rakes-audit-install-2026-07-30` | `fa0785dea8ad5f9fe7c3c9254dc988c27b6a877c` | git branch -D | deleted | clean (15 live trees) |
| 167 | `tooling/rebase-route-norm-2026-07-30` | `refs/heads/tooling/rebase-route-norm-2026-07-30` | `89c19f383e8a6ddad9696c69eb2257a23acc4c63` | git branch -D | deleted | clean (15 live trees) |
| 168 | `tooling/resolutions-liveness-2026-07-30` | `refs/heads/tooling/resolutions-liveness-2026-07-30` | `41df650dec45e31f5864af521ec7d827b04e93b9` | git branch -D | deleted | clean (15 live trees) |
| 169 | `tooling/ship-gate-selfref-2026-07-29` | `refs/heads/tooling/ship-gate-selfref-2026-07-29` | `52a99142279a646b0c22705c0edc3a083a403359` | git branch -D | deleted | clean (15 live trees) |
| 170 | `tooling/ship-with-review-2026-07-29` | `refs/heads/tooling/ship-with-review-2026-07-29` | `5b151f35d35656d81e98c24809f63a554d9a665c` | git branch -D | deleted | clean (15 live trees) |
| 171 | `sprint/ritual-step-manifest-sf` | `refs/heads/sprint/ritual-step-manifest-sf` | `b9b3b3c94b61e972232e8fdc91abb1bd5db25ba5` | git branch -D | deleted | clean (15 live trees) |
| 172 | `background-office` | `refs/heads/background-office` | `1db16768c0a2fe701baa56806928058fa554acb7` | git branch -D | deleted | clean (15 live trees) |
| 173 | `origin/audit-pr-1477` | `refs/remotes/origin/audit-pr-1477` | `1403e079b1` | none | already absent | no mutation |
| 174 | `origin/audit-pr-1534` | `refs/remotes/origin/audit-pr-1534` | `c25b7a4ca9` | none | already absent | no mutation |
| 175 | `origin/night-hunt/design-drift-1784703639790` | `refs/remotes/origin/night-hunt/design-drift-1784703639790` | `b26c4b14d785386944365cee86a4b932c1b23d64` | git push origin --delete | deleted | clean (15 live trees) |
| 176 | `origin/night-hunt/graph-drift-1784622639476` | `refs/remotes/origin/night-hunt/graph-drift-1784622639476` | `49d846c42c1f37ecd21e651e3d89ba5c1038d661` | git push origin --delete | deleted | clean (15 live trees) |
| 177 | `origin/ozhegov/feat/docs-json-navigation-object` | `refs/remotes/origin/ozhegov/feat/docs-json-navigation-object` | `c725f7f0a0943dd7a564b85bbc1730cf3a53d60c` | git push origin --delete | deleted | clean (15 live trees) |
