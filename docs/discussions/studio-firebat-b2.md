# Обсуждение: studio-firebat-b2

<!-- Автогенерация yarn ask. Каждый блок ниже — одно обращение к персонажу. -->

## 2026-08-20 10:23 UTC · ozhegov

**Контекст:** C:/Users/USER19~1/AppData/Local/Temp/b2s.md
**Вопрос:** Блок b2 studio-firebat-user-pairing исполнен (в ticket): порт PairingCredentialsStore (три глагола read/write/clear), валидация формы в parsePersisted (перенесена из nodeConnectionStore), web-адаптер один-к-одному, Electron-заглушка делегирует web (@stage ADR-0028 — один формат хранения, без второй правды), resolve по мосту preload с параметром для зубов; nodeConnectionStore зовёт только порт, прямого localStorage в нём нет. 5 зубов. Как структурщик — подписываешь b2? «подписываю» или список недостающего, коротко.

**Ответ:**

Контекст: смотрю b2 глазами границ словаря и слабой связанности.

Проверка:
- Имя порта однозначно: `PairingCredentialsStore`, три глагола — read/write/clear. Синонимов (vault/keychain/secureStorage) в клиентском словаре нет. ✓
- Граница словаря держится: `parsePersisted` — единственное место валидации формы; `PAIRING_STORAGE_KEY` живёт в порту, не утекает в store. ✓
- Слабая связанность: `nodeConnectionStore` знает только порт и `PersistedNodeConnection`; прямого `localStorage` не осталось (включая `resetNodeConnectionStoreForTests`). ✓
- Electron-заглушка делегирует web-адаптеру — один формат хранения, второй правды нет; `@stage ADR-0028` явно помечен. ✓
- `resolvePairingCredentialsStore(bridge?, base?)` — параметры для зубов, детект через `window.membranaSecureStorage`. ✓
- `MembranaSecureStorageBridge.available` — «наличие ≠ шифрование», формулировка чистая; расширение под b4 не ломает контракт трёх глаголов. ✓

Одно наблюдение (не блокер, для b4/ADR-0028): когда мост оживёт, не размывать `PairingCredentialsStore` асинхронностью — либо ввести отдельный `AsyncPairingCredentialsStore`, либо согласовать sync-контракт с preload через кэш. Решить в ADR-0028, не сейчас.

Подписываю.

---
