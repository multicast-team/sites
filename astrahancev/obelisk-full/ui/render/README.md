# ui/render — вывод кадра игры (этапы 3.10–3.12)

| Файл | Что |
|---|---|
| `present.mjs` | 3.10: кадр RGBA → canvas (ImageData + putImageData, альфа 255, масштаб только CSS `pixelated`) |
| `raster.mjs` | 3.11: `FrameRaster` — программный растр кадра в буфер RGBA по модели эталона R (llvmpipe, калибровка 3.1–3.6): вершины float32, сетка 1/256, плоскости атрибутов, отсечение по объёму видимости, nearest/linear, смешивание в байтах, глубина, трафарет, линии, точки, текстуры-цели. Без Node и DOM |
| `parallel.mjs`, `band-worker.mjs` | 3.12: `ParallelRaster` — тот же кадр n потоками-полосами строк (общая память SharedArrayBuffer; нужна изоляция страницы COOP/COEP) |
| `layers.mjs` | 3.12 (раунд исправлений 2): `LayerCache` — кэш кадра по грязным прямоугольникам над `FrameRaster`: неизменное с прошлого кадра (фон, тайлы, панели) не перерисовывается, перерисовываются только прямоугольники изменений; побайтно = `FrameRaster` |
| `pick.mjs` | 3.12 (раунд исправлений 2): `createRaster(W, H, {threads, cache})` — выбор растра: параллельный только при `crossOriginIsolated`, иначе откат на `FrameRaster` + `LayerCache` (по умолчанию) |
| `effects.mjs` | 3.11: эффекты по нашим ключам (`fill`, `sprite`, `gold`, `blurDown`, `blurUp`, `glyph`, `glyphSdf`, `glyphSdfShadow`, `sdf`, `sdfFx`, `sdfBlur`): вершина и фрагмент (float16 как lowp/mediump) |

Вход растра — наш список команд: `draw({target, mode, effect: {key}, params, matrix, pos, colour, uv, texture, blend, …})`, режимы и
множители смешивания — строками. Имён и номеров оригинала (атрибутов, uniform-ов, исходников шейдеров, констант GL) здесь нет: запись O
переводит в эти команды только тестовый переходник `oracle/canvas/adapt311.mjs`.

Кадр: вызовы растра → `await raster.finish()` → `raster.readFrame()` (у всех трёх растров одинаково).

**Требование к выкладке (этап «Публикация»).** Параллельный растр работает только на изолированной странице: сервер отдаёт
`Cross-Origin-Opener-Policy: same-origin` и `Cross-Origin-Embedder-Policy: require-corp` (свои ресурсы — `Cross-Origin-Resource-Policy:
same-origin`). Без этих заголовков `createRaster` сам откатывается на однопоточный `FrameRaster` с кэшем кадра (рендер не ломается).

Проверка: `nice node oracle/canvas/run310.mjs --quiet` (50 кадров O в Chrome: canvas игрового растра = R побайтно),
`node --test tests/render311.test.mjs tests/speed312.test.mjs tests/layers312.test.mjs`. Скорость (≤16 мс на кадр) — этап 3.12
(`oracle/canvas/speed312.mjs`, см. `oracle/canvas/README.md`).
