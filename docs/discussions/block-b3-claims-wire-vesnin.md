# Обсуждение: block-b3-claims-wire-vesnin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-08 12:29 UTC · vesnin

**Контекст:** docs/prompts/FEEDBACK_CLAIMS_CODE_PROBE_PROMPT.md
**Вопрос:** Ты исполнитель блока b3-claims-wire. Готово: ядро scripts/lib/feedback-claims/* и обвязка scripts/feedback-claims-probe.mjs (глагол yarn feedback:claims; флаги --protocol --json --append --strict; exit 0 всегда кроме --strict и отказа инструмента; --append дописывает секцию «Проверка утверждений» в тело протокола, ничего не стирая). Твой блок — врезка. Факты зоны: (1) хвост вечера scripts/ritual-evening-tail.mjs шагами runStep вызывает closure-issues и team-evening-feedback; (2) манифест шагов docs/tasks/evening-ritual-steps.json; (3) вечерний гейт ласточки — scripts/lib/evening-gates.mjs: recordEveningPartnerDraft / approveEveningPartnerDraft / canSendEveningPartnerSwallow, состояние в docs/tasks/morning-gates-state.json, поле state.day; (4) соседняя карточка swallow-own-moment (active) уже держит долг по state.day — мне туда нельзя. Ответь решениями: (1) где именно в хвосте встаёт шаг probe и что он делает с --append, чтобы протокол не распухал при повторном прогоне; (2) как ласточка узнаёт про hard-нарушение — через новое поле состояния, чтение секции протокола или прямой вызов probe, и почему; (3) в какой функции gates появляется blocker и как владелец его законно снимает (гейт не должен быть непроходимым); (4) что писать в манифест шагов; (5) чего в этом блоке делать НЕЛЬЗЯ, чтобы не наступить на state.day соседа. Коротко.

**Ответ:**

[память:подсознание] emerge vesnin-2026-07-19-security-posture-m3-response — тот же класс: «гейт как норма поведения», встаёт поперёк действия (там — реакции, здесь — отправки ласточки), не чинит, только выносит вердикт с адресом.
[память:подсознание] emerge vesnin-2026-08-07-team-evening-feedback — прямой контекст: там я уже фиксировал, что вечерний протокол несёт провенанс и holds; здесь пришиваем к нему probe, который эти holds проверяет по дереву.

Конструкция → развилки с ценой → рекомендация.

**(1) Место шага и идемпотентность `--append`.** Probe встаёт **после** `team-evening-feedback` и **до** `evening:gate`/ласточки — отдельным `runStep('feedback-claims-probe', …)` в `ritual-evening-tail.mjs`. Флаги: `--protocol <path из state> --append --json <artifact>`. Идемпотентность — на стороне ядра `--append`: секция маркируется якорем `<!-- feedback-claims-probe: <sha-протокола> -->`; при повторном прогоне с тем же sha секция **перезаписывается на месте**, при другом sha — дописывается новая. Никакого стирания чужого текста; распухания нет.

**(2) Как ласточка узнаёт про hard.** Через **новое поле состояния**, не через чтение секции и не прямым вызовом probe из гейта. Probe пишет `state.eveningPartnerDraft.claimsProbe = { verdict: 'hard'|'soft'|'unknown'|'ok', artifact, sha, at }` в `morning-gates-state.json`. Причина: гейт остаётся чистой функцией над состоянием (как у утренних двух моментов), не дёргает подпроцессы, не парсит markdown; probe — источник факта, гейт — арбитр. Секция в протоколе — для человека, поле — для машины.

**(3) Где blocker и как снимается.** В `canSendEveningPartnerSwallow`: если `claimsProbe.verdict === 'hard'` и нет `claimsProbe.override` — возвращает `{ok:false, reason:'claims-hard'}`. Снятие — законным глаголом `yarn feedback:claims:ack --sha <sha> --note "<почему ложная тревога / принято к исправлению>"`, который пишет `claimsProbe.override = { sha, note, at, by }` **строго под тот же sha протокола**; при регенерации протокола sha меняется — override сгорает. Soft и unknown гейт не держат (DoD).

**(4) В манифест `evening-ritual-steps.json`.** Один шаг между `team-evening-feedback` и `evening-partner-draft`:
- `id: "feedback-claims-probe"`, `script: "scripts/feedback-claims-probe.mjs"`,
- `args: ["--protocol", "${state.eveningProtocol.path}", "--append", "--json", "${artifacts}/feedback-claims-probe.json"]`,
- `required: true`, `failurePolicy: "continue"` (exit 0 без `--strict`),
- `writesState: ["eveningPartnerDraft.claimsProbe"]`.

**(5) Чего НЕЛЬЗЯ.** Не трогать `state.day` — ни читать как ключ, ни писать; работать только под `state.eveningPartnerDraft.*`, ключ которого владеет сосед-`swallow-own-moment`, но **поле `claimsProbe` внутри — моё**, согласовать имя ветки полей письменно перед PR. Не вводить свою метку дня, не переносить границу суток, не менять сигнатуры `recordEveningPartnerDraft/approveEveningPartnerDraft` — только `canSendEveningPartnerSwallow` расширяется чтением `claimsProbe`.

Рекомендация: **форма готова**, ADR не нужен — ложится на канон `main-day-probe` и на существующий гейт ласточки. Нужен **1 микроконсилиум с держателем `swallow-own-moment`** на 10 минут: закрепить, что `eveningPartnerDraft.claimsProbe` — моё поле, и что override сгорает при смене sha. Без этой договорённости встанем на чужой `state.day` в соседней ветке.

---
