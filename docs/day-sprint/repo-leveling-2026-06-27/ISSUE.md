# GitHub Issue (черновик) — repo-leveling

> Issue из Cowork-песочницы создать нельзя (нет доступа к GitHub). Запусти команду ниже **локально**, затем впиши полученный `#N` в `registry.json` (`githubIssue`), в шапку `REPO_LEVELING_SPRINT_PROMPT.md` и `OPEN.md`.

**Тип:** `imperfection` · **Labels:** `imperfection`, `status:triage` · **Title:** `[Imperfection] Выровнять рабочее дерево main: gitignore secret, артефакты, докоммит готовой работы`

---

## Команда (локально)

```bash
gh issue create \
  --repo officefish/Membrana \
  --title "[Imperfection] Выровнять рабочее дерево main: gitignore secret, артефакты, докоммит готовой работы" \
  --label imperfection --label "status:triage" \
  --body-file docs/day-sprint/repo-leveling-2026-06-27/ISSUE_BODY.md
```

После создания:

```bash
N=<номер>   # из вывода gh
# вписать в реестр
node -e "const f='docs/tasks/registry.json';const d=require('./'+f);const t=d.tasks.find(t=>t.id==='repo-leveling');t.githubIssue=$N;require('fs').writeFileSync(f,JSON.stringify(d,null,2)+'\n');console.log('issue set',$N)"
yarn task:sync-readme
```
