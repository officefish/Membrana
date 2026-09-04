/**
 * Первый потребитель `decideTransition` (магистраль #1761, спринт
 * `tariff-transition-wiring`, блок B).
 *
 * **Что здесь есть и чего нет.** Правила перехода живут в чистом домене
 * (`domain/tariff-transition.ts`) и здесь не переизобретаются: сервис читает
 * состояние, спрашивает домен и применяет его вердикт. Отказ уезжает наружу
 * причиной ИЗ ЗАКРЫТОГО СПИСКА домена — второго словаря отказов не заводим.
 *
 * **Объявленная граница поставки (мостик 07.08).** После этого блока смена
 * тарифа работает, но старший тариф прав НЕ открывает: `produce-gate` (S5),
 * `board-gate` (S6) и `quota-ledger` (S4) по-прежнему никем не позваны. Это
 * решение владельца о порядке, а не забытая работа.
 *
 * **Почему гонка закрыта условным обновлением, а не транзакцией.**
 * `$transaction` при уровне Read Committed (умолчание Postgres) двух
 * одновременных погашений не разводит: обе попытки прочитают `redeemedCount = 0`
 * и обе спишут — код открыл бы тариф дважды. Гонку закрывает `updateMany` с
 * условием на то самое состояние, которое проверял домен, и сверкой `count`.
 * Цена ошибки здесь денежная, поэтому примитив выбран по семантике СУБД, а не
 * по привычке.
 *
 * **Условие WHERE и есть повторная проверка.** Домен судил по `id + status +
 * redeemedCount`; если те же условия держатся в момент записи, его вердикт ещё
 * верен, и переспрашивать домен незачем. Отсюда же следствие, которое легко
 * упустить: смена мембраны тоже условна по `tariffId = from`. Иначе два
 * одновременных перехода одной мембраны переплелись бы, и журнал сказал бы
 * неправду о том, откуда шли.
 */
import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { loadTariffGrid } from '../../domain/tariff-grid-source';
import {
  decideTransition,
  TRANSITION_DENY_REASONS,
  type PromoCodeStatus,
  type TransitionDenyReason,
  type TransitionRequest,
} from '../../domain/tariff-transition';

/**
 * Причины СЕРВИСА — те, чей субъект не переход, а состояние вокруг него. Массив, а не union: см.
 * `TRANSITION_DENY_REASONS` — потребителям нужен перечислимый список, а вторая копия списка
 * рядом с типом обязательно разъедется.
 */
export const SERVICE_DENY_REASONS = [
  'promo_unknown',
  'membrane_unknown',
  'grid_unavailable',
  'tariff_moved_concurrently',
  'self_gate_closed',
] as const;

/** Полный закрытый список причин, как их видит клиент: домен + сервис, без ручных копий. */
export const ALL_TRANSITION_DENY_REASONS = [
  ...TRANSITION_DENY_REASONS,
  ...SERVICE_DENY_REASONS,
] as const;

export type OutcomeDenyReason = (typeof ALL_TRANSITION_DENY_REASONS)[number];

/** Исход попытки перехода — наружу уезжает ровно это. */
export type TransitionOutcome =
  | { readonly ok: true; readonly fromTariffId: string; readonly toTariffId: string }
  | { readonly ok: false; readonly reason: OutcomeDenyReason };

/**
 * `promo_unknown`, `membrane_unknown` и `grid_unavailable` — НЕ причины домена:
 * домен судит о переходе, а не о том, нашлась ли строка и прочиталась ли сетка.
 * Они названы отдельно и в закрытый список домена не добавляются, чтобы его
 * контракт остался про решение.
 *
 * `grid_unavailable` — отказ FAIL-CLOSED: без сетки не вычислить ранг, значит
 * нельзя ни разрешить переход, ни честно назвать причину отказа. Пропустить
 * такой случай «на всякий случай вверх» означало бы открывать тарифы вслепую.
 *
 * `tariff_moved_concurrently` — ТОГО ЖЕ РОДА: субъект не домен, а состояние базы
 * между вердиктом домена и записью сервиса. Домен о параллельной смене не знает и
 * знать не должен, поэтому причина живёт здесь, а не в `TransitionDenyReason`.
 *
 * `self_gate_closed` — ТОЖЕ чужой домену субъект (#2281): судит не о переходе, а о том, открыт
 * ли сегодня СПОСОБ «собственный выбор» вообще. Причина заведена ЗАРАНЕЕ, пустой веткой: когда
 * переход собственным выбором закроют оплатой или промокодом, закрывать надо будет
 * `selfTransitionGate`, а не выдумывать в тот момент новый словарь отказов и чинить под него
 * потребителей. Сегодня ветка недостижима намеренно.
 *
 * Заведена по #1777: раньше этот случай отвечал `same_tariff`, а тот означает
 * «цель совпадает с текущим тарифом» — пользователю читается как «вы уже на нём».
 * Но тариф мембраны сменил кто-то параллельно, и пользователь может быть на ином
 * тарифе: ответ был бы просто неправдой. Один род покрывал чужой субъект.
 */
@Injectable()
export class TariffTransitionService {
  private readonly logger = new Logger(TariffTransitionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Погашение промокода пользователем: чтение → вердикт домена → атомарное
   * применение. Промокод — один из инициаторов перехода, а не отдельная
   * сущность рядом: носитель перехода общий.
   */
  async redeemPromo(input: {
    membraneId: string;
    code: string;
    actorId: string;
    now?: Date;
  }): Promise<TransitionOutcome> {
    const now = input.now ?? new Date();

    const [membrane, promo] = await Promise.all([
      this.prisma.membrane.findUnique({
        where: { id: input.membraneId },
        select: { id: true, tariffId: true },
      }),
      this.prisma.promoCode.findUnique({ where: { code: input.code } }),
    ]);

    if (!membrane) return { ok: false, reason: 'membrane_unknown' };
    if (!promo) return { ok: false, reason: 'promo_unknown' };

    const grid = loadTariffGrid();
    if (!grid) {
      this.logger.error('сетка тарифов не прочитана — переход отклонён fail-closed');
      return { ok: false, reason: 'grid_unavailable' };
    }

    const request: TransitionRequest = {
      membraneId: membrane.id,
      currentTariffId: membrane.tariffId,
      targetTariffId: promo.targetTariffId,
      proofType: 'promo',
      proofRef: promo.id,
      actorId: input.actorId,
    };

    const decision = decideTransition(
      grid,
      request,
      {
        id: promo.id,
        code: promo.code,
        targetTariffId: promo.targetTariffId,
        status: promo.status as PromoCodeStatus,
        maxRedemptions: promo.maxRedemptions,
        redeemedCount: promo.redeemedCount,
        expiresAt: promo.expiresAt,
      },
      now,
    );

    if (!decision.allowed) {
      // Отказ по нашей проверке подарок НЕ жжёт — так постановил домен
      // (`spendPromo: false`), и сервис это лишь исполняет, а не решает заново.
      return { ok: false, reason: decision.reason as TransitionDenyReason };
    }

    return this.applyAtomically({
      promoId: promo.id,
      seenRedeemedCount: promo.redeemedCount,
      membraneId: membrane.id,
      fromTariffId: membrane.tariffId,
      toTariffId: promo.targetTariffId,
      actorId: input.actorId,
      now,
    });
  }

  /**
   * Переход СОБСТВЕННЫМ ВЫБОРОМ владельца мембраны (#2281, слово владельца 04.09).
   *
   * Тот же носитель перехода, что у промокода: домен судит теми же правилами, отказы едут из
   * того же закрытого списка. Отдельного «своего» пути принятия решений здесь нет намеренно —
   * он стал бы вторым мнением о том, когда переход законен.
   *
   * ВОРОТА — ОДНО МЕСТО, И ОНО НАЗВАНО. Сегодня `selfTransitionGate` пропускает любой тариф
   * сетки: оплата и промокод как УСЛОВИЕ перехода — следующий билет. Когда их заведут,
   * закрывать надо ЗДЕСЬ, не переписывая переход и не заводя третий путь.
   */
  async selectTariff(input: {
    membraneId: string;
    toTariffId: string;
    actorId: string;
    now?: Date;
  }): Promise<TransitionOutcome> {
    const now = input.now ?? new Date();

    const [membrane, target] = await Promise.all([
      this.prisma.membrane.findUnique({
        where: { id: input.membraneId },
        select: { id: true, tariffId: true },
      }),
      this.prisma.tariff.findUnique({ where: { id: input.toTariffId }, select: { id: true } }),
    ]);
    if (!membrane) return { ok: false, reason: 'membrane_unknown' };

    const grid = loadTariffGrid();
    if (!grid) {
      // Fail-closed тот же, что у промо: без сетки неизвестно, существует ли цель вообще.
      this.logger.error('сетка тарифов не прочитана — переход отклонён fail-closed');
      return { ok: false, reason: 'grid_unavailable' };
    }

    const gate = selfTransitionGate();
    if (!gate.open) return { ok: false, reason: gate.reason };

    const decision = decideTransition(
      grid,
      {
        membraneId: membrane.id,
        currentTariffId: membrane.tariffId,
        targetTariffId: input.toTariffId,
        proofType: 'self',
        // Основание — САМА мембрана: право дал её владелец, ссылаться больше не на что.
        // Ставить сюда id администратора или кода значило бы утверждать, что решение принял
        // кто-то ещё.
        proofRef: membrane.id,
        actorId: input.actorId,
      },
      undefined,
      now,
    );

    if (!decision.allowed) return { ok: false, reason: decision.reason as TransitionDenyReason };

    /*
     * ТАРИФ ЕСТЬ В СЕТКЕ, НО НЕТ В БАЗЕ — тоже «неизвестный тариф».
     *
     * Домен судит по сетке: там ранг и продуктовое имя. Присваивается же тариф внешним ключом
     * `Membrane.tariffId`, и строки в базе для такой цели может не быть — сетка и база
     * наполняются разными руками. Без этой проверки вердикт домена «разрешено» доехал бы до
     * записи и упал нарушением ссылочной целостности, то есть пятисоткой вместо ответа.
     *
     * Причина берётся ТА ЖЕ (`unknown_target_tariff`), а не заводится новая: для владельца
     * мембраны тариф, которого нельзя выбрать, просто не существует, и знать, в каком из двух
     * списков его не хватает, ему незачем. Различие видно в логах администратора, а не в ответе.
     *
     * Витрина (`buildTariffCatalog`) такой тариф не показывает вовсе — но ручка обязана держаться
     * и без витрины: она открыта сама по себе.
     */
    if (!target) {
      this.logger.warn(
        `тариф ${input.toTariffId} есть в сетке, но отсутствует в базе — переход отклонён`,
      );
      return { ok: false, reason: 'unknown_target_tariff' };
    }

    return this.applySelfAtomically({
      membraneId: membrane.id,
      fromTariffId: membrane.tariffId,
      toTariffId: input.toTariffId,
      actorId: input.actorId,
    });
  }

  /**
   * Смена + журнал одной транзакцией.
   *
   * Промо-версия списывает код ПЕРВЫМ и тем защищает подарок; здесь списывать нечего, и
   * несущим остаётся условие на исходный тариф: без него два одновременных перехода одной
   * мембраны переплелись бы и журнал соврал бы о том, откуда шли.
   */
  private async applySelfAtomically(a: {
    membraneId: string;
    fromTariffId: string;
    toTariffId: string;
    actorId: string;
  }): Promise<TransitionOutcome> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const moved = await tx.membrane.updateMany({
          where: { id: a.membraneId, tariffId: a.fromTariffId },
          data: { tariffId: a.toTariffId },
        });
        if (moved.count !== 1) throw new ConcurrentTariffMove(a.membraneId);

        await tx.tariffChangeLog.create({
          data: {
            membraneId: a.membraneId,
            fromTariffId: a.fromTariffId,
            toTariffId: a.toTariffId,
            proofType: 'self',
            proofRef: a.membraneId,
            actorId: a.actorId,
          },
        });

        return { ok: true, fromTariffId: a.fromTariffId, toTariffId: a.toTariffId } as const;
      });
    } catch (err) {
      if (err instanceof ConcurrentTariffMove) {
        this.logger.warn(`переход отменён — тариф мембраны ${err.membraneId} сменили параллельно`);
        return { ok: false, reason: 'tariff_moved_concurrently' };
      }
      throw err;
    }
  }

  /**
   * Списание + смена + журнал одной транзакцией. Порядок несущий: сначала
   * списываем код, и только если списание действительно наше — трогаем тариф.
   * Обратный порядок при падении посередине оставил бы поднятый тариф с
   * непогашенным кодом, то есть подарок, работающий дважды.
   */
  private async applyAtomically(a: {
    promoId: string;
    seenRedeemedCount: number;
    membraneId: string;
    fromTariffId: string;
    toTariffId: string;
    actorId: string;
    now: Date;
  }): Promise<TransitionOutcome> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const spent = await tx.promoCode.updateMany({
          // Условие повторяет ровно то, по чему судил домен. Разойдись оно с
          // доменом — сервис применил бы вердикт к другому состоянию.
          where: {
            id: a.promoId,
            status: 'active',
            redeemedCount: a.seenRedeemedCount,
          },
          data: {
            redeemedCount: a.seenRedeemedCount + 1,
            status: 'spent',
            redeemedAt: a.now,
            redeemedByMembraneId: a.membraneId,
          },
        });
        if (spent.count !== 1) {
          // Нас опередили между чтением и записью. Пользователю это и есть
          // «уже использован» — причина из закрытого списка, не выдумка.
          return { ok: false, reason: 'promo_already_redeemed' } as const;
        }

        const moved = await tx.membrane.updateMany({
          // Условие на исходный тариф: иначе два одновременных перехода одной
          // мембраны переплелись бы и журнал соврал бы о том, откуда шли.
          where: { id: a.membraneId, tariffId: a.fromTariffId },
          data: { tariffId: a.toTariffId },
        });
        if (moved.count !== 1) {
          // Тариф увели из-под нас. Код уже списан в этой же транзакции —
          // бросок откатывает и его, подарок остаётся у пользователя.
          throw new ConcurrentTariffMove(a.membraneId);
        }

        await tx.tariffChangeLog.create({
          data: {
            membraneId: a.membraneId,
            fromTariffId: a.fromTariffId,
            toTariffId: a.toTariffId,
            proofType: 'promo',
            proofRef: a.promoId,
            actorId: a.actorId,
          },
        });

        return { ok: true, fromTariffId: a.fromTariffId, toTariffId: a.toTariffId } as const;
      });
    } catch (err) {
      if (err instanceof ConcurrentTariffMove) {
        this.logger.warn(`переход отменён — тариф мембраны ${err.membraneId} сменили параллельно`);
        // Своя причина, а не `same_tariff` (#1777): произошло не «цель равна текущему
        // тарифу», а смена тарифа кем-то между вердиктом и записью. Текст лога был
        // правдив и до правки — теперь с ним совпадает и причина, уезжающая наружу.
        return { ok: false, reason: 'tariff_moved_concurrently' };
      }
      throw err;
    }
  }
}

/** Тариф мембраны сменился между вердиктом и записью. */
class ConcurrentTariffMove extends Error {
  constructor(readonly membraneId: string) {
    super(`concurrent tariff move for membrane ${membraneId}`);
  }
}

/**
 * Форма ворот. Тип объявлен ШИРЕ сегодняшнего возврата намеренно: сузь его до `{ open: true }` —
 * и ветка отказа в `selectTariff` станет для проверки типов недостижимой, то есть будет снята
 * как мёртвая при первой же чистке. Ворота исчезли бы вместе с местом, ради которого заведены.
 */
export type SelfTransitionGate = { open: true } | { open: false; reason: 'self_gate_closed' };

/**
 * ВОРОТА ПЕРЕХОДА СОБСТВЕННЫМ ВЫБОРОМ — ОДНО МЕСТО (#2281).
 *
 * Слово владельца 04.09: «Возможность перейти на старший тариф должна стать просто функцией…
 * Впоследствии сделаем ворота с оплатой тарифа либо с открытием его через промокод.»
 *
 * Сегодня ворота ОТКРЫТЫ, и это записано предикатом, а не отсутствием кода. Разница
 * существенная: отсутствие проверки читается как «забыли», а названный открытый предикат — как
 * «решено, и вот место, где закроется». Когда заведут оплату, менять надо ЗДЕСЬ; переход,
 * журнал и отказы останутся прежними.
 *
 * Причина отказа названа заранее (`self_gate_closed`) и живёт в списке СЕРВИСА, а не домена:
 * субъект здесь не переход, а способ его инициировать — то же различение, по которому в домен не
 * попали `membrane_unknown` и `grid_unavailable`.
 */
export function selfTransitionGate(): SelfTransitionGate {
  return { open: true };
}
