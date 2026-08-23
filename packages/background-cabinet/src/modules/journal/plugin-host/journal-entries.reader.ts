/**
 * Переходник службы журнала под порт `JournalEntriesReader`. Адаптер И-1/И-8 интеграции коворка
 * `cowork-server-plugin-pages`: хост объявил ПОРТ (ему не нужен весь `JournalService`), а связать
 * порт со службой — акт сборки, а не блока.
 *
 * ЧИТАТЕЛЬ ВИДИТ ЛЕНТУ ЦЕЛИКОМ. Прежняя версия брала одну страницу и объявляла это «названной
 * границей»; боевой прогон 22.08 показал, что граница была ещё и ЛОЖНОЙ.
 *
 * Что случилось. Отбор по Т1 идёт по всему журналу: клиент прислал 1301 адрес. Читатель просил
 * страницу на `'500'`, но `parseJournalListLimit` режет сверху по
 * `MAX_LIST_LIMIT = LIVE_JOURNAL_PAGE_SIZE = 50`. Дом видел 50 записей из 1301 и трижды честно
 * ответил `entry-not-found`. Отказ был ПРАВИЛЬНЫМ: врал не он, а этот читатель.
 *
 * КОНСТАНТА `'500'` БЫЛА ЛОЖЬЮ В КОДЕ — выглядела настройкой, а прибор молча заменял её своей.
 * Числа, которое вызываемый молча переопределит, в коде быть не должно: оно читается как решение,
 * которым не является. Поэтому здесь теперь НЕТ предела вовсе — предел принадлежит службе и назван
 * там (`JOURNAL_INTERNAL_FETCH_CAP`), а не переписывается на каждом вызывающем.
 *
 * Почему не обход курсором (моё же лечение, названное 22.08): служба склеивает ленту в памяти и
 * листает уже готовый список — обход перечитал бы её заново на каждой из двадцати семи страниц.
 * Верно по результату, расточительно по цене; замер отменил вчерашнее слово.
 */
import { Injectable } from '@nestjs/common';

import type { LiveJournalItemRow } from '../live-journal-items.mapper';
import { JournalService } from '../journal.service';
import type { JournalEntriesReader } from './journal-plugin-host.service';

@Injectable()
export class JournalServiceEntriesReader implements JournalEntriesReader {
  constructor(private readonly journal: JournalService) {}

  async listEntries(userId: string): Promise<readonly LiveJournalItemRow[]> {
    const { items } = await this.journal.listAllJournalItems(userId);
    return items;
  }
}
