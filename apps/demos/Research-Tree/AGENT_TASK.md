# AGENT_TASK — Research Tree: посадить файлы, сверить verify, открыть PR

## Контекст

`apps/demos/Research-Tree/` — модель графа знаний проекта (см. `README.md` и
`KNOWLEDGE_GRAPH_SPEC.md`). Единственный источник истины —
`membrana-knowledge-graph.json`. У тебя есть доступ к репозиторию; у автора модели
его не было, поэтому часть состояний проставлена по памяти и помечена
`"verify": true`. Твоя работа — заземлить их на реальный репозиторий.

## Цель

Свести модель с фактическим состоянием репозитория, прогнать валидатор и открыть
PR. Схему и структуру не менять — только заземлять значения.

## Входные данные

Три файла в `apps/demos/Research-Tree/`:
`membrana-knowledge-graph.json`, `KNOWLEDGE_GRAPH_SPEC.md`, `README.md`.

## Задачи

### 1. Файлы на месте и согласованы

Убедиться, что три файла лежат в папке и JSON валиден (`python -m json.tool`).

### 2. Verify-сверка

Для каждого помеченного узла сверить с репозиторием реальное состояние и снять
флаг `verify` (или оставить с коротким `note`, если факт недоступен). Состояния:
`fog | available | exploring | established` по правилу из SPEC.

Узлы под сверку:

- `stack.sample-library`, `stack.docker`, `stack.vps-timeweb` — помечены
  `established`: подтвердить, что реально работают/развёрнуты.
- `stack.electron-studio`, `stack.perplexity-sonar`, `stack.mcp-client`,
  `stack.embeddings`, `stack.vps-deploy` — `available`: подтвердить, что
  предпосылки закрыты, но работа не начата (иначе поднять до exploring/established).
- `stack.linear-agents`, `stack.pinecone` — `fog`: подтвердить, что предпосылка
  держит их за туманом.
- `comm.white-paper`, `comm.pitch-deck`, `comm.landing` — `available`;
  `comm.grant-report` — `exploring`: сверить с фактическим наличием черновиков.

Артефакты под сверку (проставить реальный `path`):

- `art.field-dataset` — путь к полевому датасету (или статус, если ещё нет).
- `art.research-digest` — путь/команда дайджеста (`yarn research:digest`).
- `art.grant-report-md` — путь к `MEMBRANA_GRANT_REPORT.md`.

Метеред-тарифы `openrouter` и `glm-5.2` — дотянуть публичные ставки **только**
если сервис активирован; иначе оставить `null`/`potential`.

### 3. Валидатор (должен быть зелёным)

```python
import json, collections, functools
g=json.load(open('apps/demos/Research-Tree/membrana-knowledge-graph.json'))
n={x['id']:x for x in g['nodes']}
assert not [(x['id'],r) for x in g['nodes'] for r in x.get('requires',[]) if r not in n], 'битые requires'
assert not [a['id'] for a in g['artifacts'] if a['node'] not in n or any(z not in n for z in a.get('also',[]))], 'битые артефакты'
# ацикличность
ind={i:0 for i in n}; adj=collections.defaultdict(list)
for x in g['nodes']:
    for r in x.get('requires',[]): adj[r].append(x['id']); ind[x['id']]+=1
q=[i for i in n if ind[i]==0]; s=0
while q:
    a=q.pop(); s+=1
    for b in adj[a]:
        ind[b]-=1
        if ind[b]==0: q.append(b)
assert s==len(n), 'граф не ацикличен'
est={i for i,x in n.items() if x['state']=='established'}
# инвариант: exploring/established => все requires established
for x in g['nodes']:
    if x['state'] in ('exploring','established'):
        assert all(r in est for r in x.get('requires',[])), f"{x['id']}: requires не established"
    if x['state'] in ('fog','available'):
        base='available' if all(r in est for r in x.get('requires',[])) else 'fog'
        assert x['state']==base, f"{x['id']}: state не совпал с правилом ({base})"
# инвариант: established => нет missing требуемых артефактов
miss=collections.defaultdict(list)
for a in g['artifacts']:
    if a['status']=='missing': miss[a['node']].append(a['id'])
for nid in est:
    assert not miss.get(nid), f"{nid}: established, но есть missing артефакты {miss[nid]}"
print('OK: узлов', len(n), 'артефактов', len(g['artifacts']))
```

Если правишь состояние — `fog`/`available` обязаны совпадать с выводом из графа;
`exploring`/`established` ставятся вручную, но с закрытыми предпосылками.

### 4. Открыть PR

```bash
git switch -c feat/research-tree-knowledge-graph
git add apps/demos/Research-Tree/
git commit -m "feat(research-tree): граф знаний v0.3, README, verify-сверка"
git push -u origin feat/research-tree-knowledge-graph
```

PR: **Research Tree: граф знаний v0.3 + README**. В описании — что обновлено,
какие узлы сверены, что валидатор зелёный.

## Не-цели

- **Рендер** (интерактивная карта) — следующая фаза, отдельное задание.
- **Приватные числа**: `stamina.daily`/`wip_limit`, дневной баланс токенов,
  спеки железа, пороги `capacity_gate`, цены подписок/накладных — ввод основателя,
  агент их не выдумывает.
- **Новые узлы или изменение схемы** без согласования.
- Заполнение `cost.tokens_*` числами без реального учёта.

## Критерии готовности

1. Три файла в `apps/demos/Research-Tree/`, JSON валиден.
2. Все 14 verify-узлов и 3 verify-артефакта либо сверены и флаг снят, либо
   помечены обоснованным TBD-`note`.
3. Валидатор проходит без ошибок.
4. PR открыт с осмысленным описанием.

При необходимости зарегистрировать задание по `docs/prompts/TASK_PROMPT_WORKFLOW.md`.
