# Прецедент 2026-07-23: запрос main-day на чужом дереве — эскалация по ветке без топологии worktree

<!-- precedent-meta
{
  "id": "2026-07-23-wrong-tree-main-day-request",
  "date": "2026-07-23",
  "class": "reporting-gap",
  "symptom": "на «подкачай main day» сессия STOP по боковой ветке, но не сказала первой репликой что main уже в другом worktree",
  "rootCause": "проверка только текущей ветки/грязи; inventory worktree и где живёт main не вошли в первую эскалацию",
  "fix": "владелец спросил дерево → перенос на Membrana-grok (main); прецедент-самоотчёт",
  "canonicalCause": "существенный факт топологии worktree не доложен первой репликой",
  "prevention": "перед каноном дня: branch + git worktree list + где origin/main; если main в другом дереве — сказать это первым абзацем",
  "actionItems": [{"text": "в preflight main-day/ritual:day добавить явный доклад worktree-топологии (где main)", "owner": "ozhegov", "status": "open"}],
  "related": ["2026-07-22-empty-night-not-reported-first", "2026-07-22-session-8a0b3861-6e45-41a8-990f-a177dccd3b6b-cold-start-autostart"]
}
-->

<!-- Тип: прецедент-доклад (самоотчёт сессии). Автор: Cursor Grok 4.5 (сессия e8913e5d-a116-4670-be6c-f2fd60f1f514). -->
<!-- Повод: владелец — «Напиши прецедент со своими действиями как прецедент». -->

## Резюме (одной строкой)

Владелец сказал «подкачай main day issue»; сессия сидела в `Membrana-codex` на боковой ветке, правильно сделала STOP и не гоняла генератор — но в первой эскалации предложила «checkout main здесь», **не доложив**, что канонический `main` уже занят соседним деревом `Membrana-grok`. Владелец сам спросил «Ты на каком дереве?» и перевёл сессию.

---

## Часть 1. Контекст старта

| Поле | Значение |
|------|----------|
| Session | `e8913e5d-a116-4670-be6c-f2fd60f1f514` |
| Стартовое дерево | `C:/Users/user190825/practice/Membrana-codex` |
| Стартовая ветка | `docs/ozhegov-truth-crystals-2026-07-22` (`b1afd678`), remote `[gone]` |
| Грязь | untracked: `docs/meeting/llm-procedure-channels/` + 4 seanse `llm-procedure-channels-*` |
| `MAIN_DAY_ISSUE` / standup на старте | датированы **2026-07-22** (не сегодня) |
| Вечерний фидбек 22.07 | отсутствует (последний — 21.07) |

Соседние worktree на момент разбора (после вопроса владельца):

| Дерево | Ветка |
|--------|-------|
| `Membrana` | `fix/adr-0013-accepted` |
| `Membrana-angelina` | `morning-ritual` |
| `Membrana-codex` | `docs/ozhegov-truth-crystals-2026-07-22` ← сессия здесь |
| `Membrana-grok` | `main` ← канон утра |
| `Membrana-openrouter` | `chore/archive-containerization-coldstart-sync` |
| `Membrana-product` | `docs/night-cap-2026-07-21` |
| `Membrana-tooling` | `tooling/meeting-consilium-voice` |

---

## Часть 2. Хронология действий сессии

1. **Запрос:** «Подкачай main day issue».
2. Прочитан скилл `membrana-morning-ritual` (гейт: ветка утра = `main`, грязь → эскалация).
3. `git branch` / `git status`: не `main`, dirty untracked; прочитаны вчерашний `MAIN_DAY_ISSUE` и фидбек 21.07.
4. **STOP владельцу** (правильно по букве скилла): не запускала `yarn main-day-issue`. Предложены варианты:
   - checkout `main` на *этом* дереве;
   - полный `ritual:day` на `main`;
   - гнать здесь осознанно.
5. **Пробел доклада:** в первой эскалации не было `git worktree list` и фразы «`main` уже в `Membrana-grok`». Вариант «checkout main здесь» при занятом `main` в соседнем дереве был бы коллизией (норма параллельных сессий / инцидент 2026-07-09).
6. Владелец: «Ты на каком дереве?» → ответ: `Membrana-codex`, `main` в `Membrana-grok`.
7. Владелец: «Перейди на Membrana-grok» → `move_agent_to_root` → дерево `Membrana-grok`, ветка `main` (`3275bfb3`, behind 1), чисто.
8. Владелец: «теперь есть план?» → честный ответ: план есть, но **вчерашний** (22.07); на 23.07 не перечеканен; `main-day-issue` / полный ритуал не запускались.
9. Владелец: «Напиши прецедент со своими действиями» → этот файл.

### Чего сессия НЕ делала

Не вызывала `yarn main-day-issue` / `yarn ritual:day`, не переключала ветку на `Membrana-codex`, не коммитила, не трогала meeting-артефакты в `Membrana-codex`. Единственная мутация по слову владельца после переноса — запись этого прецедента в `Membrana-grok`.

---

## Часть 3. Корень

1. **Гейт ветки ≠ гейт места.** Сессия проверила «текущая ветка = main?» и остановилась. Не проверила «это то дерево, где должен жить утренний канон?» / «где сейчас `main` среди worktree?».
2. **Эскалация предложила локальный checkout**, не топологию. При нескольких worktree «перейди на main» без inventory — ловушка: либо fatal «ветка занята другим деревом», либо работа не там.
3. **Тот же класс, что empty-night reporting-gap:** существенный факт (чужое дерево; `main` уже занят) известен механике после одного `git worktree list`, но владелец узнал только после прямого вопроса.

Что сделано верно (не отменяет пробел): не гонять канон дня с боковой ветки и грязного дерева — это как раз профилактика из cold-start 21–22.07.

---

## Часть 4. Урок / профилактика

Перед любым запросом на канон дня (`main-day-issue`, `ritual:day`, standup):

1. **Три факта первой репликой:** дерево (`git rev-parse --show-toplevel`) · ветка · где среди `git worktree list` сидит `main` (или назначенная Тимлидом ветка утра).
2. Если текущее дерево ≠ дерево с `main` — **не предлагать checkout main здесь первым пунктом**; предложить перенос агента / работу в том worktree.
3. Скилл утра: эскалация «боковая ветка» должна включать worktree-топологию, не только `git status -sb` текущего cwd.

---

## Ссылки

- Скилл утра: `.cursor/skills/membrana-morning-ritual/SKILL.md`
- Родственный reporting-gap: `docs/precedents/2026-07-22-empty-night-not-reported-first.md`
- Родственный cold-start (боковая ветка на входе): `docs/precedents/2026-07-22-session-8a0b3861-6e45-41a8-990f-a177dccd3b6b-cold-start-autostart.md`
- Норма параллельных сессий / worktree: `AGENTS.md`, скилл `membrana-worktree`
- Итог переноса: корень `Membrana-grok`, ветка `main`, план дня всё ещё от 22.07 (на момент записи прецедента не обновлён)
