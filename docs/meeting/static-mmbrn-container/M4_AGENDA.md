# M4 — хранение и живучесть

> Заседание `static-mmbrn-container`, фаза M4. M1–M3 закрыты и ратифицированы:
> [`M1`](../../seanses/static-mmbrn-container-m1-boundary-2026-08-03.md) ·
> [`M2`](../../seanses/static-mmbrn-container-m2-identity-2026-08-03.md) ·
> [`M3`](../../seanses/static-mmbrn-container-m3-access-2026-08-04.md).
> Общее задание: [`MEETING_BRIEF.md`](MEETING_BRIEF.md).

## Вопрос заседания

**S1 — назначьте один исполнимый контракт физического хранения и живучести байтов
`static.mmbrn.tech`: primary topology и failure domain, независимый backup, quota и
watermarks, проверку целостности, restore/RPO/RTO, retention и удаление, обращение с
sensitive bytes и серверную связь с M2 identity/M3 access. Вердикт должен выбрать одну
vendor-neutral topology, дать таблицы классов хранения и отказов, доказать обязательные
случаи и назвать измеримые readiness gates. Carrier —
`docs/seanses/static-mmbrn-container-m4-storage-2026-08-04.md`; второй носитель запрещён.
Список посылок обязателен. M5–M7 не решаются.**

## Закрытые посылки M1–M3

- Контейнер принимает оригиналы и их ревизии; Affine — сменный движок, а не склад и не
  источник истины.
- `registry.jsonl` — источник истины регистрации, record/lineage identity, заявленных
  `sha256`, `bytes`, `location` и истории. Фактические байты независимо проверяют эти
  заявления; смена адреса создаёт новую record в той же lineage.
- `canonicalRef` идентифицирует lineage, но не является URL или storage key.
- Sensitive record хранит допустимый `location.kind`, непустой `location.ref` и отдельный
  `sensitive.reason`; sensitive не является отдельным `location.kind`.
- Panel — единственный авторизатор. Байты выдаются только после `read-bytes`/`download`
  решения proxy; прямой URL склада не должен обходить Panel.
- M3 не выбрал физический склад, vendor, backup, retention или endpoint.

## Измеренная фактура

- Affine, PostgreSQL и Redis живут на office VDS; Affine слушает `127.0.0.1:3010`.
- Capacity gate office VDS: **NO-GO**, свободно 9.46 GiB при минимуме 12 GiB.
- Каталог резервных копий текущего дома пуст. Доказанного restore нет.
- В Affine сейчас 82 страницы и 57 служебных PNG/SVG, но нет корпуса чеков и внешних PDF.
- В публичном Git лежит один чек. Sensitive PDF партнёра находится вне репозитория и не
  имеет доказанного переносимого storage path.
- `location.kind` текущего M2-контракта допускает `local`, `affine`, `url`, `archivarius`;
  при любом kind `location.ref` непустой.
- До решения M4 запрещено увеличивать архив оригиналов на office VDS или переносить байты.

## Обязательные решения

1. **Одна topology.** Выбрать один vendor-neutral primary pattern: object storage либо
   выделенный storage host/volume с точным контрактом. «Любой из двух» не является
   вердиктом. Назвать, где находятся metadata управления storage, а где bytes.
2. **Failure domains.** Primary и backup не могут разделять единственную машину, volume,
   учётную запись или credential. Назвать минимум две независимые копии и что считается
   потерей failure domain; кеш/реплика без независимости backup не является.
3. **Object key и immutability.** Связать storage object с M2 record без превращения
   `canonicalRef` в URL. Определить overwrite policy, dedup, проверку `sha256`/`bytes`,
   quarantine при несовпадении и судьбу старых revisions.
4. **Sensitive.** Определить encryption at rest/in transit, изоляцию credentials и запрет
   public/presigned permanent URLs. `location.ref` не раскрывается без `read-ref`, bytes —
   без `read-bytes`; журнал не должен утекать secret/ref.
5. **Quota и capacity.** Задать capacity unit, per-container/collection limits, soft/hard
   watermarks, reserve, admission fail-closed и наблюдаемые метрики. NO-GO office VDS нельзя
   переименовать в readiness.
6. **Backup и restore.** Назвать schedule, независимость, encryption, retention копий,
   RPO/RTO, restore drill и доказательство восстановления реестра вместе с байтами без
   ложного совпадения версий.
7. **Retention и удаление.** Развести immutable original, superseded revision, tombstone,
   legal/owner hold и физическое удаление. Удаление bytes не удаляет историю M2 молча;
   dangling `location` и исчезновение объекта должны обнаруживаться.
8. **Readiness gates.** Дать минимальный набор машинно проверяемых гейтов до первого
   production ingest и до миграции: capacity, write/read/hash, backup, restore, auth bypass,
   inventory/reconciliation. «Backup включён» без успешного restore — не PASS.

## Обязательные случаи

Таблица содержит отдельные колонки `Случай`, `Ожидаемое решение`, `Где проверяется`,
`Вещдок` и включает не меньше девяти строк:

1. принимается новый небольшой чек при нормальной capacity;
2. объект превышает per-object или collection quota;
3. primary достигает soft, затем hard watermark;
4. после записи считанные bytes не совпадают с заявленным `sha256` или `bytes`;
5. sensitive PDF должен храниться вне Git и не иметь прямого публичного URL;
6. primary failure требует restore в заявленный RTO и с потерей не больше RPO;
7. backup существует, но контрольный restore ещё не проходил;
8. удаляется superseded revision при действующем hold или retention;
9. пользователь знает `location.ref`, но не имеет `read-bytes`, либо обращается к storage
   напрямую в обход proxy;
10. office VDS остаётся ниже capacity minimum в момент планируемой миграции.

## Требуемый carrier

После предметного обсуждения итог содержит:

- одну пропозицию S1 с выбранной topology и fail-closed правилом;
- таблицу storage classes/копий/failure domains;
- object-key и integrity contract, согласованный с M2;
- quota/watermark/admission contract с числами или честно названным способом их вычислить;
- backup/restore/RPO/RTO contract и schedule drill;
- retention/deletion/tombstone contract;
- server/access/encryption contract, согласованный с M3;
- таблицу обязательных случаев и readiness gates;
- список реально использованных посылок с маркировкой **факт** / **норма**.

Carrier заканчивается после ненумерического Definition of Done. Самосчёт, эхо повестки,
обсуждение carrier/guards и заявления о полноте собственного ответа запрещены. Не менее 30
фактических ролевых реплик; считает внешний аудитор.

## Границы комнаты

- Не выбирать конкретного cloud/vendor, тариф, аккаунт, bucket name, secret или регион.
- Не проектировать UX/workspace/роль Affine — это M5.
- Не проектировать upload/download endpoints, формы, hash pipeline или preview — это M6;
  M4 задаёт storage invariants и admission gates, а не API.
- Не решать миграцию 82 страниц, DNS/Caddy, redirect, `LIVE_SERVICES` или обновление Issues
  #1303/#1305 — это M7.
- Не выполнять код, DNS, production provision или фактический перенос байтов.
- Не менять M2 identity и M3 access; storage key, URL и `canonicalRef` не сливаются.

## Definition of Done повестки

- [ ] Один вопрос S1 и один carrier
- [ ] Выбрана одна topology и независимые failure domains
- [ ] Object key, immutability и integrity согласованы с M2
- [ ] Sensitive storage и direct bypass согласованы с M3
- [ ] Quota/watermarks/admission измеримы
- [ ] Backup, restore, RPO/RTO и drill исполнимы
- [ ] Retention/deletion/tombstone не стирают историю молча
- [ ] Все обязательные случаи и readiness gates доказаны
- [ ] M5–M7 не решены
