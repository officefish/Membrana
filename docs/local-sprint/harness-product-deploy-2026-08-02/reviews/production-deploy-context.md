# Context run: production-deploy

**Держатель:** Vesnin · **статус:** контекст проверен, доставка ожидает подтверждения

Проверены custom-domain contracts, DNS policy и фактический DNS. Harness и Product
указывают на `cname.mintlify.builders`; Product отмечен Connected в dashboard, а
`/product/overview` и `/product/tariffs` отвечают по HTTPS с кодом 200. Визуальный
smoke Harness остаётся гейтом после merge: текущий production ещё несёт старый корпус.
