# Обсуждение: block-b2-diff-source-dynin

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-08 15:05 UTC · dynin

**Контекст:** docs/prompts/REVIEW_DIFF_EXPLICIT_BASE_PROMPT.md
**Вопрос:** Ты исполнитель блока b2-diff-explicit-base. Зона: новый scripts/lib/review-diff-source.mjs (+зубы) и scripts/lib/code-review-ritual.mjs. Готово в b1: маркер вердикта принимает base, гейт сверяет её исходом unknown. Факты дерева: сейчас в режиме --pr обвязка зовёт 'gh pr view … --json number,title,body,state,baseRefName,headRefName,files,commits', затем 'gh pr diff N' и 'gh pr diff N --stat'; canон явной базы есть в pr-recreate.mjs:88-93 (git merge-base head origin/base → git diff --name-status base head). Решение резчика: gh api compare первичным, локальный git фолбэком, gh pr diff убрать. Ответь решениями, коротко: (1) какая ровно ручка compare и как из неё взять И merge_base, И дифф с патчами (compare отдаёт files[].patch — годится ли это как замена diff, и что с усечением при больших PR); (2) когда именно падать на локальный git и как честно пометить, что источник другой; (3) как проверить, что локальный head совпадает с headRefOid PR, и что делать при расхождении — по DoD его надо НАЗВАТЬ, не проглотить; (4) какую форму имеет строка провенанса в теле артефакта (base/head/merge_base/source) — одна строка или блок; (5) как устроить зуб на синтетике, чтобы он ловил отставший ответ старого тракта, не завися от сети. Только решения.

**Ответ:**

Решения по пунктам.

(1) **Ручка compare.** `gh api -H "Accept: application/vnd.github+json" repos/{owner}/{repo}/compare/{base}...{head}` — тройная точка обязательна, иначе получим двухточечный компаратор. Из ответа берём `merge_base_commit.sha` (это и есть наша база) и `files[]` с полями `filename`, `status`, `patch`. `patch` **годится как замена** `git diff` для ревью текста, но с двумя оговорками, которые нужно кодифицировать: (а) `files[]` усекается на **300 файлах**, (б) каждый `patch` усекается при большом размере (нет поля `truncated` per-file, но есть общий `files` cap и отсутствие `patch` у бинарников/крупных диффов). Правило: если `response.files.length === 300` **или** есть хоть один файл со `status !== 'removed'` и без `patch` при непустом `changes`, — помечаем источник как усечённый и **падаем на локальный git** (не молча).

(2) **Фолбэк на локальный git.** Падаем в трёх случаях: (а) `gh api compare` вернул non-2xx или сеть недоступна; (б) сработал детектор усечения из (1); (в) явный флаг `--offline`. Канон — как в `pr-recreate.mjs:88-93`: `git merge-base <head> origin/<base>` → `git diff --name-status <mb> <head>` + `git diff <mb> <head>` для патчей. Источник фиксируется явным полем `source: "gh-compare" | "git-local" | "git-local:truncated-fallback"` — это идёт и в провенанс, и в лог ритуала.

(3) **Сверка head.** `headRefOid` уже приходит из `gh pr view --json headRefOid` (добавить в существующий вызов). Локальный head — `git rev-parse HEAD`. Три исхода, все **названы**, не проглочены:
- совпало → `head_match: true`;
- разошлось, ветка PR выкачана (`git cat-file -e <headRefOid>`) → работаем через `gh api compare` по `headRefOid`, в провенанс пишем `head_match: false, head_source: "pr-headRefOid"`, локальный git-фолбэк в этом прогоне запрещён;
- разошлось и коммита нет локально → онлайн-`compare` по `headRefOid` разрешён, оффлайн-фолбэк → **исход `unknown`** гейта с причиной `head-unreachable`.

(4) **Провенанс — блок**, не одна строка. Одна строка плохо читается людьми и ломается на переносах. HTML-комментарий сразу под маркером вердикта:
```
<!-- review-source
  source: gh-compare
  base_ref: main
  base_sha: 5522d4a7...
  merge_base: 1a092353...
  head_sha: 348646c1...
  head_match: true
  files: 27
  truncated: false
-->
```
Парсер гейта из b1 читает `base:` в самом маркере вердикта (для сверки merge-base); блок `review-source` — расширенный провенанс для аудита и постфактум-воспроизведения.

(5) **Зуб без сети.** Два уровня, оба на фикстурах:
- **Юнит на `review-diff-source.mjs`** с инжектируемыми портами `{ ghApi, git }`. Фикстуры: (а) `compare`-ответ с `files.length === 300` → ожидаем фолбэк с меткой `truncated-fallback`; (б) `compare` с бинарным файлом без `patch` → фолбэк; (в) 5xx от `ghApi` → фолбэк; (г) `headRefOid ≠ rev-parse HEAD`, коммит есть локально → источник `gh-compare` по `headRefOid`, `head_match: false`; (д) `headRefOid` не найден локально и `ghApi` недоступен → возврат `unknown` с причиной.
- **Регрессионный зуб на старый тракт**: снапшот-фикстура «`gh pr diff` вернул устаревший набор файлов (23), `compare` вернул актуальный (13)» — прогон нового модуля обязан вернуть 13 и `source: gh-compare`; если код случайно уйдёт назад к `gh pr diff`, тест краснеет. Сеть не нужна: обе ручки замоканы.

Дополнительно: в контракте модуля `resolveReviewDiff({ pr, ports }) → { source, base, head, mergeBase, headMatch, files, patches, truncated }` — чистая функция от портов; побочка (реальные `gh`/`git`) живёт в адаптерах `ports/*`, чтобы зубы вообще не знали про процесс.

---
