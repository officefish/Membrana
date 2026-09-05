/**
 * ЗАПРОС БЕЗ ТЕЛА НЕ СМЕЕТ ОБЪЯВЛЯТЬ ТИП ТЕЛА (#2287, прод 04.09).
 *
 * `Content-Type` описывает содержимое, которого при пустом теле не существует. Это не придирка
 * к букве стандарта: Fastify (5.10.0 в lock с 20.08) на такой запрос отвечает `400
 * FST_ERR_CTP_EMPTY_JSON_BODY` на РАЗБОРЕ ТЕЛА — то есть раньше обработчика, и настоящий код
 * ответа маскируется. На проде это выглядело так: `POST /v1/pair` падал `503 Media client key
 * issue failed (400)`, и по ответу нельзя было понять, что прибор не при чём.
 *
 * Замер 05.09 на живом Fastify 5.10.0 (POST и DELETE, с токеном и без): с заголовком и без тела
 * — 400, без заголовка — 200. Гвард фазы `onRequest` при этом отвечает раньше: без токена
 * приходит 401 в обоих случаях. Формулировка «400 приходит до гвардов» неточна и здесь
 * исправлена — 400 приходит до ОБРАБОТЧИКА.
 *
 * Цена промаха: привязка узла и отзыв клиентского ключа на проде были мертвы с 22.08 (#2074),
 * то есть две недели, и вскрылось это только когда у владельца истёк ключ узла.
 *
 * ПРАВИЛО ЖИВЁТ В ОДНОМ МЕСТЕ — в `mediaFetch`, через который проходят все запросы моста.
 * Правка на трёх больных вызовах закрыла бы три случая и оставила класс: у моста ещё три
 * вызова без тела (GET за квотой, коллекциями и пробами), они не падали лишь потому, что
 * Fastify не разбирает тело GET, и любой новый вызов без тела снова принёс бы дефект.
 *
 * Почему не `body: '{}'`: это не молчание про тело, а ЛОЖЬ про него — пустой объект уехал бы
 * на сервер как настоящий аргумент, и ручка, которая когда-нибудь начнёт тело разбирать,
 * получила бы его молча.
 */

/*
 * Типы берутся ИЗ `RequestInit` — того самого, что принимает `fetch`. Назвать здесь `HeadersInit`
 * и `BodyInit` было нельзя (в `lib` пакета их нет, только ES2022), но дело не только в этом:
 * выведенные типы не могут разъехаться с тем, что реально уезжает в сеть.
 */
type FetchHeaders = RequestInit['headers'];
type FetchBody = RequestInit['body'];

/** Заголовки одним видом: массив и `Headers` приводятся к записи, как их пишет мост. */
function toRecord(headers: FetchHeaders): Record<string, string> {
  if (!headers) return {};
  if (Array.isArray(headers)) return Object.fromEntries(headers);
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }
  return { ...(headers as Record<string, string>) };
}

/** Есть ли у запроса тело. `null` и пустая строка телом НЕ считаются — их и отвергает Fastify. */
export function hasRequestBody(body: FetchBody): boolean {
  if (body === undefined || body === null) return false;
  if (typeof body === 'string') return body.length > 0;
  return true;
}

/**
 * Снять объявление типа тела, если тела нет.
 *
 * Имя заголовка сверяется БЕЗ учёта регистра: HTTP регистр не различает, и `content-type`,
 * написанный строчными, обошёл бы проверку по точному ключу — то есть проверка судила бы
 * правописание вместо запроса.
 */
export function headersForBody(
  headers: FetchHeaders,
  body: FetchBody,
): Record<string, string> {
  const record = toRecord(headers);
  if (hasRequestBody(body)) return record;
  for (const key of Object.keys(record)) {
    if (key.toLowerCase() === 'content-type') delete record[key];
  }
  return record;
}
