import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';

import {
  expandWildcard,
  fetchAdminCodes,
  fetchAdminUsers,
  formatAuditEntry,
  grantCellState,
  mintPromoCode,
  patchUserGrants,
  revokePromoCode,
  revokeUser,
  toggleGrant,
  type AdminAuditEntry,
  type AdminPromoCode,
  type AdminUser,
  type MintedCode,
} from '@/lib/adminApi';
import { PANEL_SECTIONS } from '@/lib/sections';

/**
 * Owner-раздел «Пользователи» (PU3, #463): матрица «пользователь × раздел»
 * с тремя состояниями ячейки (грант / нет / покрыто '*'), чеканка промокодов
 * (код показывается ОДИН раз), revoke, аудит-хвост. Оптимистичные галочки
 * с откатом; store — истина (ADR 0005), борд только отражает её.
 */

type LoadState = 'loading' | 'error' | 'ready';

/**
 * Разделы, которыми управляем грантами. Owner-разделы исключены: грант не
 * открыл бы их всё равно (admin-ручки гейтятся ролью, консилиум Р1), а
 * галочка создавала бы ложное ожидание.
 */
const SECTION_COLUMNS = PANEL_SECTIONS.filter((s) => s.minRole !== 'owner').map((s) => ({
  id: s.id,
  title: s.title,
}));

function GrantCell({
  user,
  sectionId,
  onToggle,
  busy,
}: {
  user: AdminUser;
  sectionId: string;
  onToggle: (user: AdminUser, sectionId: string) => void;
  busy: boolean;
}) {
  const state = grantCellState(user.grants, sectionId);
  if (state === 'wildcard') {
    return (
      <td className="text-center">
        <span
          className="badge badge-ghost badge-sm"
          title="Покрыто wildcard «*» — разверните «*», чтобы управлять по-разделочно"
          aria-label={`${sectionId} для ${user.name}: покрыто wildcard`}
        >
          ●
        </span>
      </td>
    );
  }
  return (
    <td className="text-center">
      <input
        type="checkbox"
        className="checkbox checkbox-sm align-middle"
        checked={state === 'granted'}
        disabled={busy || user.revoked}
        onChange={() => onToggle(user, sectionId)}
        aria-label={`${sectionId} для ${user.name}`}
      />
    </td>
  );
}

function MintCodeForm({ onMinted }: { onMinted: (code: MintedCode) => void }) {
  const [label, setLabel] = useState('');
  const [fullAccess, setFullAccess] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [days, setDays] = useState(30);
  const [maxUses, setMaxUses] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const grants = fullAccess ? ['*'] : picked;
    if (!label.trim() || grants.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      onMinted(await mintPromoCode({ label: label.trim(), grants, days, maxUses }));
      setLabel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не получилось создать код.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card bg-base-200 p-4" aria-label="Новый промокод">
      <h3 className="mb-2 text-sm font-semibold">Новый промокод</h3>
      <div className="flex flex-wrap items-end gap-3">
        <label className="form-control">
          <span className="label-text text-xs">Для кого / случая</span>
          <input
            className="input input-bordered input-sm"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={64}
            placeholder="напр. press-июль"
          />
        </label>
        <label className="flex items-center gap-2 pb-1 text-sm">
          <input
            type="checkbox"
            className="checkbox checkbox-sm"
            checked={fullAccess}
            onChange={(e) => setFullAccess(e.target.checked)}
          />
          полный доступ («*», все разделы)
        </label>
        <label className="form-control w-20">
          <span className="label-text text-xs">Дней</span>
          <input
            type="number"
            className="input input-bordered input-sm"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            aria-label="Срок действия, дней"
          />
        </label>
        <label className="form-control w-24">
          <span className="label-text text-xs">Использований</span>
          <input
            type="number"
            className="input input-bordered input-sm"
            min={1}
            max={1000}
            value={maxUses}
            onChange={(e) => setMaxUses(Number(e.target.value))}
            aria-label="Максимум использований"
          />
        </label>
        <button type="submit" className="btn btn-primary btn-sm" disabled={submitting || !label.trim() || (!fullAccess && picked.length === 0)}>
          {submitting ? <span className="loading loading-spinner loading-xs" /> : 'Создать код'}
        </button>
      </div>
      {!fullAccess && (
        <div className="mt-2 flex flex-wrap gap-3" role="group" aria-label="Разделы кода">
          {SECTION_COLUMNS.map((s) => (
            <label key={s.id} className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                className="checkbox checkbox-xs"
                checked={picked.includes(s.id)}
                onChange={() => setPicked((prev) => toggleGrant(prev, s.id))}
                aria-label={`Код открывает ${s.title}`}
              />
              {s.title}
            </label>
          ))}
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-xs text-error">
          {error}
        </p>
      )}
    </form>
  );
}

/** Код показывается ОДИН раз — в <dialog> с кнопкой «скопировать». */
function MintedCodeDialog({ minted, onClose }: { minted: MintedCode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog ref={ref} className="modal" onClose={onClose} aria-label="Новый промокод создан">
      <div className="modal-box max-w-md">
        <h3 className="text-lg font-semibold">Код для «{minted.label}»</h3>
        <p className="mt-2 text-sm text-base-content/70">
          Скопируйте сейчас — повторно код не показывается (в списке останется только префикс).
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 rounded bg-base-200 p-3 text-center font-mono text-lg tracking-widest">
            {minted.code}
          </code>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              void navigator.clipboard.writeText(minted.code).then(() => setCopied(true));
            }}
          >
            {copied ? '✓ скопировано' : 'Скопировать'}
          </button>
        </div>
        <div className="modal-action">
          <button type="button" className="btn btn-sm" onClick={() => ref.current?.close()}>
            Закрыть
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function PanelUsersBoard() {
  const [state, setState] = useState<LoadState>('loading');
  const [errorText, setErrorText] = useState('');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [audit, setAudit] = useState<AdminAuditEntry[]>([]);
  const [codes, setCodes] = useState<AdminPromoCode[]>([]);
  const [degraded, setDegraded] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [minted, setMinted] = useState<MintedCode | null>(null);
  const [notice, setNotice] = useState('');

  const reload = useCallback(async () => {
    const [usersData, codesData] = await Promise.all([fetchAdminUsers(), fetchAdminCodes()]);
    setUsers(usersData.users);
    setAudit(usersData.audit);
    setDegraded(usersData.degraded);
    setCodes(codesData);
  }, []);

  useEffect(() => {
    let cancelled = false;
    reload()
      .then(() => {
        if (!cancelled) setState('ready');
      })
      .catch((e) => {
        if (cancelled) return;
        setErrorText(e instanceof Error ? e.message : 'Не удалось загрузить пользователей.');
        setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  /** Оптимистичная галочка с откатом при ошибке (DESIGN.md). */
  async function onToggle(user: AdminUser, sectionId: string) {
    const nextGrants = toggleGrant(user.grants, sectionId);
    const prevUsers = users;
    setBusyUserId(user.id);
    setUsers((list) => list.map((u) => (u.id === user.id ? { ...u, grants: nextGrants } : u)));
    try {
      await patchUserGrants(user.id, nextGrants);
      setNotice(`Доступ обновлён: ${user.name}`);
      await reload();
    } catch (e) {
      setUsers(prevUsers);
      setNotice(e instanceof Error ? e.message : 'Не получилось изменить доступ.');
    } finally {
      setBusyUserId(null);
    }
  }

  async function onExpandWildcard(user: AdminUser) {
    const explicit = expandWildcard(
      user.grants,
      SECTION_COLUMNS.map((s) => s.id),
    );
    setBusyUserId(user.id);
    try {
      await patchUserGrants(user.id, explicit);
      setNotice(`«*» развёрнут в явный список: ${user.name}`);
      await reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Не получилось развернуть «*».');
    } finally {
      setBusyUserId(null);
    }
  }

  async function onRevokeUser(user: AdminUser) {
    setBusyUserId(user.id);
    try {
      await revokeUser(user.id);
      setNotice(`Доступ отозван: ${user.name}`);
      await reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Не получилось отозвать доступ.');
    } finally {
      setBusyUserId(null);
    }
  }

  async function onRevokeCode(code: AdminPromoCode) {
    try {
      await revokePromoCode(code.id);
      setNotice(`Код отозван: ${code.label}`);
      await reload();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Не получилось отозвать код.');
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex justify-center py-16" aria-busy="true">
        <span className="loading loading-spinner loading-lg text-primary" aria-label="Загрузка пользователей" />
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="alert alert-error" role="alert">
        <span>{errorText}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {degraded && (
        <div className="alert alert-warning" role="alert">
          <span>Хранилище реестра в деградации (см. логи office) — изменения недоступны, восстановите из бэкапа.</span>
        </div>
      )}
      <p aria-live="polite" className="min-h-4 text-xs text-base-content/60">
        {notice}
      </p>

      <section aria-label="Пользователи и доступ к разделам">
        <h3 className="mb-2 text-sm font-semibold">Пользователи ({users.length})</h3>
        {users.length === 0 ? (
          <p className="text-sm text-base-content/60">
            Пока никто не зарегистрировался — создайте промокод и передайте партнёру.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Партнёр</th>
                  {SECTION_COLUMNS.map((s) => (
                    <th key={s.id} className="text-center text-xs">
                      {s.title}
                    </th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className={u.revoked ? 'opacity-50' : ''}>
                    <td>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-base-content/50">
                        код: {u.codeLabel ?? '—'} · с {new Date(u.createdAt).toLocaleDateString('ru-RU')}
                        {u.revoked ? ' · отозван' : ''}
                      </div>
                    </td>
                    {SECTION_COLUMNS.map((s) => (
                      <GrantCell key={s.id} user={u} sectionId={s.id} onToggle={onToggle} busy={busyUserId === u.id} />
                    ))}
                    <td className="whitespace-nowrap text-right">
                      {u.grants.includes('*') && !u.revoked && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs"
                          onClick={() => void onExpandWildcard(u)}
                          disabled={busyUserId === u.id}
                          aria-label={`Развернуть «*» в явный список для ${u.name}`}
                        >
                          развернуть «*»
                        </button>
                      )}
                      {!u.revoked && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => void onRevokeUser(u)}
                          disabled={busyUserId === u.id}
                          aria-label={`Отозвать доступ: ${u.name}`}
                        >
                          отозвать
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <MintCodeForm onMinted={(code) => setMinted(code)} />

      <section aria-label="Промокоды">
        <h3 className="mb-2 text-sm font-semibold">Промокоды ({codes.length})</h3>
        {codes.length === 0 ? (
          <p className="text-sm text-base-content/60">Кодов ещё нет.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Код</th>
                  <th>Для кого</th>
                  <th>Разделы</th>
                  <th className="text-right">Использован</th>
                  <th>Истекает</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => (
                  <tr key={c.id} className={c.revoked ? 'opacity-50' : ''}>
                    <td className="font-mono">{c.codePrefix}</td>
                    <td>{c.label}</td>
                    <td className="text-xs">{c.grants.join(', ')}</td>
                    <td className="text-right tabular-nums">
                      {c.usedCount}/{c.maxUses}
                    </td>
                    <td className="text-xs tabular-nums">
                      {c.expiresAt ? new Date(c.expiresAt * 1000).toLocaleDateString('ru-RU') : 'бессрочный'}
                      {c.revoked ? ' · отозван' : ''}
                    </td>
                    <td className="text-right">
                      {!c.revoked && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => void onRevokeCode(c)}
                          aria-label={`Отозвать код ${c.label}`}
                        >
                          отозвать
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-label="Журнал изменений">
        <h3 className="mb-2 text-sm font-semibold">Журнал</h3>
        {audit.length === 0 ? (
          <p className="text-sm text-base-content/60">Записей пока нет.</p>
        ) : (
          <ul className="space-y-1 text-xs text-base-content/70">
            {[...audit].reverse().map((entry, i) => (
              <li key={`${entry.at}-${i}`}>{formatAuditEntry(entry)}</li>
            ))}
          </ul>
        )}
      </section>

      {minted && <MintedCodeDialog minted={minted} onClose={() => {
        setMinted(null);
        void reload();
      }} />}
    </div>
  );
}
