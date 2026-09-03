-- #2271, вердикт M3 заседания `library-open-api`: ключ-предъявитель для треков.
--
-- УНИКАЛЬНОСТЬ НА МЕМБРАНУ — НЕСУЩЕЕ, А НЕ УКРАШЕНИЕ. Ревью #2267 (Математик) назвало прямо:
-- без неё `createIfAbsent` держится на порядке вызовов. Параллельная первая выдача заводит
-- ключ дважды, второй секрет затирает первый, и ссылка приходит с вердиктом `tampered` —
-- система сообщает о ПОДДЕЛКЕ там, где тела ключа никто не трогал. Гонку нашёл зуб ротации
-- в блоке `key-ttl` коворка; здесь она закрыта на уровне БД, а не соглашением кода.

CREATE TABLE "TrackKeySecret" (
    "id" UUID NOT NULL,
    "membraneId" UUID NOT NULL,
    "generation" INTEGER NOT NULL DEFAULT 1,
    "secret" TEXT NOT NULL,
    "rotatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrackKeySecret_pkey" PRIMARY KEY ("id")
);

-- Вот эта строка и есть починка гонки: вторая параллельная вставка получает отказ БД,
-- а не заводит дубль.
CREATE UNIQUE INDEX "TrackKeySecret_membraneId_key" ON "TrackKeySecret"("membraneId");

-- Настройка срока — мембранный выключатель (M3). Масштаб — мембрана; приёмный лоток под него
-- ПОПАДАЕТ и в отдельную область управления не выделен. Это названная цена: сняв срок ради
-- разобранных наборов, человек снимает его и с записей двора.
--
-- Три состояния, а не два: `default` | `seconds` | `lifted`. `lifted` — единственный законный
-- источник «срока нет»; пустая, повреждённая или прошедшая величина даёт fail-closed на
-- DEFAULT_TRACK_KEY_TTL. Снятие обязано нести подпись (`liftedAt`/`liftedBy`) — без неё это
-- порча записи, а не движение человека.
CREATE TABLE "TrackKeyTtlSetting" (
    "id" UUID NOT NULL,
    "membraneId" UUID NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'default',
    "seconds" INTEGER,
    "liftedAt" TIMESTAMP(3),
    "liftedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TrackKeyTtlSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TrackKeyTtlSetting_membraneId_key" ON "TrackKeyTtlSetting"("membraneId");
