# Firebat duty readiness

`yarn node:duty-ready` is a read-only predicate for Issue #2049. It does not change Windows
settings; it only reads `powercfg`, Winlogon autologon flags, and the `MembranaNode` scheduled task.

PASS means all required switches are ready for night duty:

| Predicate | Owner action when red |
|---|---|
| Sleep timeout off | Open Windows power settings and set sleep on AC/DC to `Never`, or run the owner-approved equivalent of `powercfg /change standby-timeout-ac 0` and `powercfg /change standby-timeout-dc 0`. |
| Hibernate off | Disable hibernation by owner action (`powercfg /hibernate off`) and keep hibernate timeout at `0`. |
| AutoAdminLogon enabled | Enable Windows autologon for the Firebat duty user via `netplwiz`/Sysinternals Autologon. Do not write the password into the repo. |
| `MembranaNode` task enabled | Re-run `scripts/firebat-service-install.ps1` or enable the existing scheduled task in Task Scheduler. |

Command on the node:

```powershell
yarn node:duty-ready
```

Agent/off-node parser test:

```powershell
node scripts/node-duty-ready.mjs --fixture path\to\snapshot.json
```
