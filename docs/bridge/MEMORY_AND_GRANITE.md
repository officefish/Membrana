# Память и гранит — контур долгов/наблюдений (M6) и контракт мостик ↔ граф правды (M3)

Исполнение блока Б (#1352) по ратифицированным вердиктам
[M6](../seanses/bridge-command-post-m6-debts-observations-2026-07-27.md) (посылки P1–P12)
и [M3](../seanses/bridge-command-post-m3-truth-contract-2026-07-27.md) (посылки 1–9).
M1–M5 не переопределяются. Гранит-якоря M3: `truth-graph-bound-to-bridge-by-contract`,
`granite-vs-stream-is-the-contract-subject`, `intent-triangle-thought-plus-two-proofs`,
`main-protection-is-tomorrow-magistral-candidate`.

## Три леммы API (M6 DoD п.1) — синоним «заметка» изгнан

| Лемма | Что это | Дом |
|-------|---------|-----|
| `DebtRecord` | машинная единица учёта попугая: `id`, `status ∈ open\|repeated\|repaid\|parked`, `birthAt`, `lastRepeatAt?`, `repayProvenance ∈ captain_word\|fact_ref\|null`, `factRef?`, `noiseScore`, `repeatCount` | журнал `docs/bridge/debt-ledger.jsonl` (kit-engine store; `DEBTS.md` — производная витрина в легаси-формате) |
| `CaptainObservation` | свободная запись смысла: `id`, `body`, `sessionId?`, `uttered`, `utteredAt?` — **без** status-machine погашения | session tree: `docs/bridge/<session>/observations.jsonl` (append-only) |
| `ShownMemo` | акт показанного: строка **существующего** `docs/evidence/registry.jsonl` + поле `shown {at, sessionId?, caption?, linksDebtId?}` — второй реестр запрещён | `docs/evidence/registry.jsonl` |

## Глаголы попугая (M6 DoD п.2)

`yarn bridge:debt birth | repeat | repay | park | list | noise` — движок
[`scripts/lib/bridge-debt-engine.mjs`](../../scripts/lib/bridge-debt-engine.mjs).

- **Идемпотентность**: `birth` тем же id при живом долге — тот же долг, без дубля;
  `repay` на repaid — no-op с квитанцией; `repeat` — только из `open|repeated`.
- **`blocks_open(d) ⇔ status ∈ {open, repeated}`** — ровно этот предикат видит
  `gate.parrot_live_if_debts`. `parked` и `repaid` не блокируют; `parked → open` —
  снова явный жест (повторный `birth`), не авто.
- **Рождение только явное**: `origin ∈ captain_gesture | lead_gesture | detector | carry`.
  Сырое наблюдение, реплика питомца, bare shown — **не** birth.
- Погашение: `--by captain_word` (жест намерения, метку видит вечерний разбор) или
  `--by fact_ref --fact <ссылка>` (предпочтительно для матча).
- Стык с блоком А: `blocksOpen()` и `counts()` экспортируются из движка кита —
  сигнатуры зафиксированы (#1352).

## Красные линии контура (M6 DoD п.3)

- Наблюдение **не входит** в антецедент `gate.parrot_live_if_debts` — тетрадь не
  поднимает попугая и не стопит open/close.
- **Запрет auto `obs → debt.birth`**: тетрадь не импортирует движок долгов и не рождает
  долги; мост в долг — только явный жест капитана через `bridge:debt birth`.
- Гейты `gate.notebook_*` — **запрещено заводить**.

## Homes и жесты free (M6 DoD п.4–5)

Homes: `home.debts` = журнал кита · `home.captain_notebook` = session tree ·
`home.evidence` = `registry.jsonl` · `home.close_receipt` — агрегаты трёх контуров.
Жесты free (optional, не steps ядра): `gesture.debts`, `gesture.captain_notebook`,
`gesture.attach_shown`.

Квитанция закрытия (counts, без stop-seal): долги по статусам + `blocks_open`
(`bridge:debt list`), `observations uttered/unuttered` (`bridge:notebook counts`),
shown attached (строки `registry.jsonl` с полем `shown`). Пустая тетрадь — норма;
`unuttered > 0` — факт витрины, не fail мостика.

## Мемоизация показанного (M6 DoD п.6)

`yarn bridge:shown <файл> --id … --source … [--caption …] [--session …] [--links-debt <id>]` —
тонкая обёртка над `yarn evidence add`. Показанное **не** долг: связь — только явный
`linksDebtId` либо отдельное **явное** рождение долга вечерней политикой. Вечерний
pending-shown — соседний чеклист вечера, не `gesture.debts`.

## Контракт мостик ↔ граф правды (M3 DoD п.1–4)

**По умолчанию — поток.** В гранит не попадает ничто без пакета намерения и допуска;
отсутствие жеста = всё остаётся потоком, и это успех. Авто-прогон всех мыслей — BLOCK.

**`MintIntentPacket`** (один словарь, без синонимов):
`{ tokenId, claim, thought: SpeechRef{sessionId, uuid, timestamp, quote, kind?},`
`proofs: [BenefitRef{benefit, anchor}, BenefitRef], limit, hardness?: casual|aimed|committed,`
`initiatedBy, parents? }`.

Статусы кандидата: `stream | triangle_ready | mint_pending | minted | rejected`.

**Путь**: жест lead → пакет → `validPacket` → `admit_v1` →
`yarn mint:intent --file packet.json [--execute]` → существующий `yarn truth mint`
**или** reject. Отказ — только из закрытого словаря:
`no_triangle | proofs_weak | stream_only_by_owner | mana_required_later | duplicate_thought | not_lead | invalid_ref`.

- `admit_v1 = validPacket ∧ ¬ownerMarkedStream ∧ initiatedBy = lead`
- `admit_v2` (слот with-mana) `= admit_v1 ∧ manaModel.enabled ∧ balance ≥ cost` —
  **мана машинно ∄**: `MANA_MODEL = null`, экономику/формулу/счётчик не изобретаем;
  cost/balance — TBD владельцем. В витрине — честное `mana: n/a (phase-before)`.
- Твёрдость — отдельная ось от истинности: качественное поле для человеческого отбора,
  не числовой авто-порог. Мана и твёрдость остаются **потоком** конспекта — из этой
  комнаты в гранит не дочеканиваются.

**Инвариант ревизии (M3 DoD п.5)**: у каждого нового кристалла, зачеканенного по
контракту, есть append-снапшот пакета в `docs/truth/packets.jsonl`
(`{mintedTokenId, at, packet}`). Кристалл без снапшота = минт вне контракта — именуемое
нарушение, ловится ревизией графа.

## Межа аудита: гранит ≠ bearing

**Гранит** — акт в граф правды: токен через `mint:intent` → `truth mint`, реестр
`docs/truth/registry.json`, снапшоты `docs/truth/packets.jsonl`.
**Bearing** — печать кейса мостика (M4): статус в `case-meta/1`, реестр —
`docs/meeting/bridge-command-post/cases/`. **Разные акты, разные реестры**: печать
кейса не рождает токен, минт не штампует кейс; ни один не заменяет другой.

## Что здесь НЕ делается

Пульт (M5), кейсы (M4), состав (M1), DAY_MEMO, `bridge.mjs`/манифест фреймов/BridgeCast
(блок А), экономика маны, LLM — не нужен вовсе.
