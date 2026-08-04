[llm] chain(ask) = anthropic/claude-opus-4-7 → openrouter/anthropic/claude-sonnet-4.6 → deepseek/deepseek-chat → xai/grok-4.5 (источник: overlay панели)
[память:подсознание] emerge ozhegov-2026-07-22-insight-precedent-container — здесь та же тема: генератор как **regenerated-снимок**, а не рукописный источник истины; применимо к вопросу об идемпотентности.

---

Форма честная — два изменения точечные, контракт не нарушается.

Теперь про идемпотентность: ты сам назвал главное. Если `generate-office-env.sh` отказывается перезаписывать существующий файл (guard «уже есть — выходим»), то на **живом VDS с уже выложенным `office.env`** новые пары `ARCHIVARIUS_MONGO_URI` / `ARCHIVARIUS_MONGO_DB` не появятся автоматически. Это не баг скрипта — это его задокументированная политика. Но тогда вывод скрипта обязан это проговорить явно.

Предлагаю формулировку в stdout (или в блоке `# INFO` скрипта):

```
# INFO: existing /etc/membrana/office.env not modified.
# To apply new ARCHIVARIUS_MONGO_* defaults, append manually:
#   echo "ARCHIVARIUS_MONGO_URI=mongodb://archivarius-mongo:27017/membrana_archivarius" >> /etc/membrana/office.env
#   echo "ARCHIVARIUS_MONGO_DB=membrana_archivarius" >> /etc/membrana/office.env
```

Это не «тихий успех» — это явная инструкция. Владелец решает, дописывать ли вручную, прежде чем smoke.

По smoke-команде: `curl -fsS` + `jq .ok` или `grep '"ok":true'` — форма правильная. Единственный риск: если `OFFICE_PORT` не задан в ENV_FILE и не экспортирован в shell, подстановка `${OFFICE_PORT:-3000}` сработает молча с дефолтом. Нарушения связанности нет — smoke читает тот же `ENV_FILE`, что и stack. Это чисто.

Итог: **вердикт — принять**, с обязательным явным предупреждением о неперезаписи в stdout генератора.
