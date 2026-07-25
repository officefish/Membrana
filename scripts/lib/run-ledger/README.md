# run-ledger

Append-only **цепь прогонов процедур** с подписанными Merkle-чекпойнтами.

```
канонформа → sha256-лист → Merkle-корень → Ed25519-чекпойнт  +  verify(checkpoint, proof)
```

## Что делает

- **`canonical.mjs`** — детерминированная сериализация записи прогона (LF, NFC, sorted keys).
- **`merkle.mjs`** — Merkle-дерево, inclusion/consistency proofs.
- **`checkpoint.mjs`** — Ed25519 подпись головы дерева.
- **`index.mjs`** — фасад `RunLedger`: `appendRun`, `checkpointOf`, `verify`.

## Использование

```js
import { generateKeyPairSync } from 'node:crypto';
import { RunLedger, verify } from './index.mjs';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const ledger = new RunLedger();
ledger.appendRun({ procedureId: 'one-shot', frameId: 'f1', outcome: 'success', sequence: 1 });
const cp = ledger.checkpointOf(privateKey, 'dev');
const proof = ledger.inclusionProofAt(0);
verify(cp, publicKey, { kind: 'inclusion', proof }); // true
```

## Публичные ключи

`keys/dev.pub.pem` — тестовый/дев ключ для офлайн-verify (приватный **не** в репозитории).
Ротация серверного ключа — открытый вопрос (следующая карточка).

## Честный предел

**Цепь защищает историю, а не суждение.** Прогон может быть честно записан, честно подписан
и опираться на кривую рамку: рамку для судьи сегодня готовит тот, кого судят. Принять цепь
за гарантию качества процедуры — ошибка.

## Тесты

```bash
node --test scripts/run-ledger.test.mjs
```
