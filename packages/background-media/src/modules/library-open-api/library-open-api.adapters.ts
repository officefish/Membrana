/**
 * Адаптеры шва коворка `cowork-library-open-api` (Phase 4).
 *
 * ЗАЧЕМ ОТДЕЛЬНЫЙ ФАЙЛ, А НЕ ПРАВКА БЛОКОВ. Регламент коворка: блоки на интеграции НЕ
 * переписываются, несогласованность гасится адаптерами; потребность переписать блок — дефект
 * резки brief, и он пишется в ретроспективу, а не лечится втихую. Здесь живут ровно те
 * переходы, которые ни один блок не мог сделать в изоляции, потому что они соединяют ДВЕ
 * стороны шва.
 *
 * Контракт стыка: `docs/cowork-sprint/cowork-library-open-api/INTERFACE_CONTRACT.md`.
 * Адаптеры пронумерованы там же — A1, A2, A3, A4.
 */
import {
  toPageEnvelope,
  toPublicSample,
  type PageEnvelope,
  type PublicSample,
  type TrackKeyGrant,
} from '@membrana/media-library-service';

import type { OwnedSamplesPage } from '../library-ownership/library-ownership.service.js';
import type { OwnershipSampleRow } from '../library-ownership/ownership-sample-reader.js';
import { MembraneOwnerRequiredError } from '../library-ownership/ownership-errors.js';
import type { IssuedTrackLink } from '../track-keys/track-key.generator.js';

/**
 * A3 — выдача ключа → поля наружу.
 *
 * Генератор отдаёт `key` и `expiresAt`; форма ждёт `url` и `expiresAt`. Адрес собирает
 * ВЫЗЫВАЮЩИЙ (у генератора для этого есть `buildTrackUrl`), потому что базовый адрес — забота
 * развёртывания, а не ни одного из блоков.
 *
 * `expiresAt` переносится КАК ЕСТЬ, включая `null`: `null` приходит только из снятого
 * человеком срока с подписью, и подменить его на «очень далеко» значило бы соврать о том
 * единственном состоянии, ради которого поле и заведено отдельным.
 */
export function grantFromIssuedLink(link: IssuedTrackLink, url: string): TrackKeyGrant {
  return { url, expiresAt: link.expiresAt };
}

/**
 * A1 — страница оси владения → наружная обёртка.
 *
 * Отбрасывается `scope`. Он не «лишнее поле», а СОЗНАТЕЛЬНО внутренний разряд: `empty` значит
 * «оси владения у прибора нет», а не «ничего не нашлось». Дверь вправе показать оба состояния
 * одинаково — пустой страницей, — но различие обязано остаться внутри, а не поехать наружу
 * необъявленным двенадцатым полем.
 *
 * Строки уже отобраны осью; ключ навешивается ЗДЕСЬ, поверх отбора. Так и просил блок
 * `ownership`: его проекция ключа не несёт, и перенос этой ответственности внутрь выборки был
 * бы решением контракта, а не молчаливой правкой.
 */
export function envelopeFromOwnedPage(
  page: OwnedSamplesPage,
  toSample: (row: OwnershipSampleRow) => PublicSample,
): PageEnvelope<PublicSample> {
  return toPageEnvelope(page.items.map(toSample), {
    total: page.total,
    page: page.page,
    limit: page.limit,
  });
}

/**
 * A2 — внутренняя страница библиотеки → наружная обёртка.
 *
 * Отбрасывается `totalPages`. Довод тот же, которым вердикт M2 отверг `hasMore`: производное
 * число, посчитанное дверью, способно разойтись с `total`, а читатель вычисляет его сам.
 * Зуб `contract` на `unknown-field` покраснеет, если этот адаптер забудут.
 */
export function envelopeFromPaginated<TIn, TOut>(
  paginated: { readonly items: readonly TIn[]; readonly total: number; readonly page: number; readonly limit: number },
  toSample: (row: TIn) => TOut,
): PageEnvelope<TOut> {
  return toPageEnvelope(paginated.items.map(toSample), {
    total: paginated.total,
    page: paginated.page,
    limit: paginated.limit,
  });
}

/**
 * A4 — ошибка «владельца нет» → код ответа.
 *
 * `409`, а НЕ `404` и не `403`. Ресурс существует и не закрыт — прибор не привязан к мембране.
 * Слить это состояние с любым из двух значило бы соврать партнёру: `404` сказал бы «такого
 * нет», `403` — «есть, но вам нельзя», а верно «есть, и владелец не назначен».
 *
 * Разряд предложен блоком `ownership` односторонне и принят на консилиуме: у `contract` такого
 * разряда не было, у `ownership` не было HTTP — шов проходил ровно между ними.
 */
export const OWNER_ABSENT_STATUS = 409;

export interface OwnerAbsentBody {
  readonly code: string;
  readonly operation: string;
  readonly deviceId: string;
  readonly message: string;
}

export function ownerAbsentResponse(error: MembraneOwnerRequiredError): {
  readonly status: typeof OWNER_ABSENT_STATUS;
  readonly body: OwnerAbsentBody;
} {
  return {
    status: OWNER_ABSENT_STATUS,
    body: {
      code: error.code,
      operation: error.operation,
      deviceId: error.deviceId,
      message: error.message,
    },
  };
}

/**
 * A5 — заголовки ответа со списком.
 *
 * ТРЕБОВАНИЕ M4 БЕЗ НОСИТЕЛЯ. На вскрытии выяснилось, что `no-store` не взял на себя ни один
 * блок: `contract` и `key-ttl` независимо назвали его свойством транспорта, `ownership` его не
 * касается. То есть граница, объявленная вердиктом, осталась без того, кто умеет отказать —
 * ровно класс, который заседание назвало своей сквозной нитью.
 *
 * Тело со списком — СВЯЗКА КЛЮЧЕЙ, а не метаданные каталога: не в обычные логи, не в кеш
 * посредника, не пересылать целиком. Утёкшая связка гасится только ротацией — задний борт.
 */
export const CREDENTIAL_BEARING_HEADERS: Readonly<Record<string, string>> = Object.freeze({
  'Cache-Control': 'no-store',
  Pragma: 'no-cache',
});

/** Сериализация строки выборки наружу — ось дала строку, генератор дал ключ. */
export function publicSampleFromRow(
  row: OwnershipSampleRow,
  sample: Parameters<typeof toPublicSample>[0],
  grant: TrackKeyGrant,
): PublicSample {
  void row;
  return toPublicSample(sample, grant);
}
