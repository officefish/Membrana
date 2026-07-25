## Полезные yarn-команды

```bash
# Добавить зависимость в конкретный пакет
yarn workspace @membrana/agenda add some-lib
yarn workspace @membrana/client add -D @types/some-lib

# Выполнить любую команду из конкретного пакета
yarn workspace @membrana/client <script>

# Выполнить во ВСЕХ пакетах сразу
yarn workspaces foreach -A run build
```
