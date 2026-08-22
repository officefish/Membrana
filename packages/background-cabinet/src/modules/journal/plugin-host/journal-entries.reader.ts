/**
 * Переходник службы журнала под порт `JournalEntriesReader`. Адаптер И-1/И-8 интеграции коворка
 * `cowork-server-plugin-pages`: хост объявил ПОРТ (ему не нужен весь `JournalService`), а связать
 * порт со службой — акт сборки, а не блока.
 *
 * ГРАНИЦА ЧЕСТНО НАЗВАНА: `listJournalItems` страничный, и читатель берёт одну страницу с большим
 * пределом. Значит проверка задания видит ленту не целиком: запись старше страницы даст
 * `entry-not-found`, хотя она существует. Это не «пока сойдёт» — это предел, который должен быть
 * снят вместе с ответом на вопрос об адресации прогона (см. `MODULE_INTERFACE.md`), потому что
 * оба упираются в одно: журнал пока не умеет адресовать произвольный кусок своей ленты.
 */
import { Injectable } from '@nestjs/common';

import type { LiveJournalItemRow } from '../live-journal-items.mapper';
import { JournalService } from '../journal.service';
import type { JournalEntriesReader } from './journal-plugin-host.service';

/** Предел одной страницы. Больше — не «на всякий случай», а ровно столько, сколько видит проверка. */
export const PLUGIN_TASK_ENTRIES_PAGE = '500';

@Injectable()
export class JournalServiceEntriesReader implements JournalEntriesReader {
  constructor(private readonly journal: JournalService) {}

  async listEntries(userId: string): Promise<readonly LiveJournalItemRow[]> {
    const page = await this.journal.listJournalItems(userId, PLUGIN_TASK_ENTRIES_PAGE);
    return page.items;
  }
}
