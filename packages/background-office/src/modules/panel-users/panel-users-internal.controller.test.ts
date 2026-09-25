/**
 * Зубы внутренней двери кабинета (заседание M1, ратифицировано владельцем 21.09).
 *
 * Предмет: контроллер двери — путь, охрана, коды ответов и тело. Красен на
 * стволе: контроллера там нет.
 */
import { HTTP_CODE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';

import { ApiTokenGuard } from '../../common/guards/api-token.guard';
import {
  CABINET_REGISTER_GRANT,
  emptyState,
  mintCode,
  type PanelUsersState,
} from './panel-users-core';
import { PanelUsersInternalController } from './panel-users-internal.controller';

const NOW_SEC = 1_800_000_000;
const NOW_ISO = '2026-09-22T09:00:00.000Z';

/** Стор в памяти с теми же обязательствами, что и PanelUsersStore. */
function fakeStore(initial: PanelUsersState, degraded = false) {
  let live = initial;
  return {
    snapshot: () => live,
    isDegraded: () => degraded,
    mutate(fn: (state: PanelUsersState) => PanelUsersState | null) {
      if (degraded) return null;
      const next = fn(live);
      if (next === null) return null;
      live = next;
      return next;
    },
    current: () => live,
  };
}

function withCabinetCode(maxUses = 2) {
  const { state, code } = mintCode(
    emptyState(),
    { label: 'кабинет', grants: [CABINET_REGISTER_GRANT], expiresAt: NOW_SEC + 3600, maxUses },
    'owner',
    NOW_ISO,
  );
  return { state, code: code.code, codeId: code.id };
}

function controllerWith(store: ReturnType<typeof fakeStore>) {
  return new PanelUsersInternalController(store as never);
}

describe('дверь кабинета: путь и охрана', () => {
  it('путь класса — v1/internal/cabinet/registration-codes, метод — consume', () => {
    expect(Reflect.getMetadata(PATH_METADATA, PanelUsersInternalController)).toBe(
      'v1/internal/cabinet/registration-codes',
    );
    expect(Reflect.getMetadata(PATH_METADATA, PanelUsersInternalController.prototype.consume)).toBe(
      'consume',
    );
  });

  it('успех двери — 200, а не 201 по умолчанию Nest', () => {
    // 24.09 дверь отвечала 201: клиент кабинета сверял с 200, читал успешное
    // гашение как «исход неизвестен», пользователя не создавал — код сгорал.
    // Номер ответа здесь часть контракта M2, а не деталь фреймворка.
    expect(
      Reflect.getMetadata(HTTP_CODE_METADATA, PanelUsersInternalController.prototype.consume),
    ).toBe(200);
  });

  it('класс накрыт ApiTokenGuard — внутренняя охрана офиса, не сессия панели', () => {
    const guards = Reflect.getMetadata('__guards__', PanelUsersInternalController) ?? [];
    expect(guards).toContain(ApiTokenGuard);
  });
});

describe('дверь кабинета: тело запроса', () => {
  it('иной режим → 400', async () => {
    const { state, code } = withCabinetCode();
    const controller = controllerWith(fakeStore(state));
    await expect(controller.consume({ code, mode: 'погасить' as never })).rejects.toMatchObject({
      status: 400,
    });
  });

  it('режим не указан → 400', async () => {
    const { state, code } = withCabinetCode();
    const controller = controllerWith(fakeStore(state));
    await expect(controller.consume({ code } as never)).rejects.toMatchObject({ status: 400 });
  });

  it('код не указан → 400', async () => {
    const { state } = withCabinetCode();
    const controller = controllerWith(fakeStore(state));
    await expect(controller.consume({ mode: 'check' } as never)).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe('дверь кабинета: ответы', () => {
  it('check → 200 с redeemable, без приращения', async () => {
    const { state, code, codeId } = withCabinetCode();
    const store = fakeStore(state);
    const controller = controllerWith(store);

    await expect(controller.consume({ code, mode: 'check' })).resolves.toEqual({
      ok: true,
      redeemable: true,
      grant: 'cabinet-register',
      uses: { used: 0, max: 2 },
    });
    expect(store.current().codes.find((c) => c.id === codeId)!.usedCount).toBe(0);
  });

  it('redeem → 200 после приращения, пользователь панели не создан', async () => {
    const { state, code, codeId } = withCabinetCode();
    const store = fakeStore(state);
    const controller = controllerWith(store);

    await expect(controller.consume({ code, mode: 'redeem' })).resolves.toEqual({
      ok: true,
      code,
      grant: 'cabinet-register',
      uses: { used: 1, max: 2 },
    });
    expect(store.current().codes.find((c) => c.id === codeId)!.usedCount).toBe(1);
    expect(store.current().users).toHaveLength(0);
  });

  it('отказ → 409 с телом { ok: false, reason }', async () => {
    const { state } = withCabinetCode();
    const controller = controllerWith(fakeStore(state));

    await expect(controller.consume({ code: 'НЕТТАКОГО', mode: 'redeem' })).rejects.toMatchObject({
      status: 409,
      response: { ok: false, reason: 'not_found' },
    });
  });

  // Разъяснение ведущей 22.09 при исполнении M1: деградация стора — не отказ из
  // пяти, а недоступность; тела { ok:false, reason } у неё нет, аудит писать некуда.
  it('стор в деградации → 503 на обоих режимах, без тела отказа', async () => {
    const { state, code } = withCabinetCode();
    const controller = controllerWith(fakeStore(state, true));

    await expect(controller.consume({ code, mode: 'redeem' })).rejects.toMatchObject({
      status: 503,
    });
    await expect(controller.consume({ code, mode: 'check' })).rejects.toMatchObject({
      status: 503,
    });
  });

  it('повтор исчерпанного кода → 409 exhausted', async () => {
    const { state, code } = withCabinetCode(1);
    const controller = controllerWith(fakeStore(state));

    await expect(controller.consume({ code, mode: 'redeem' })).resolves.toMatchObject({ ok: true });
    await expect(controller.consume({ code, mode: 'redeem' })).rejects.toMatchObject({
      status: 409,
      response: { ok: false, reason: 'exhausted' },
    });
  });
});
