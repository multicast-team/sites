# ui/kit — UI-кит (этапы 4.1, 4.3, 6.1)

Свой код по спекам `oracle/specs/{sprite-layout,text-layout,shape-layout}.md`. Записи O сюда не попадают: они только эталон теста.

| Файл | Что |
|---|---|
| `prims.mjs` | Примитивы → список вершин (`VertexList`: позиция float32, uv float32, RGBA unorm8, номер атласа): `drawSprite` (кадр, nine-slice, отсечение окном вида), `drawText`, `fillRect`, `lineWidth` |
| `components.mjs` | `makeKit(kit.json, skin)`: `panel`, `label` (тень первой), `button` (nine-slice + надпись, «можно/нельзя купить»), `badge` (плашка уровня), `header` (заголовок секции), `buyRow` (строка покупки целиком: плашка, фон, поле, иконка, значок, кнопка, рамка и заголовок, 3 цены, замки), `scrollThumb`, `subtitleBar`, `menuButton` |

Стили — `data/ui/kit.json` (схема `data/schemas/ui-kit.schema.json`): ключи skin, масштабы, смещения от якоря, цвета `#rrggbb`,
окно вида и запас отсечения. Ассеты — `skin/model.mjs` (`makeSkin`): JSON пакета skin читает вызывающий (страница или тест).

Проверка (критерий 4.1 — каждый компонент против группы команд O, 0 px):

```sh
nice node oracle/ui41/run41.mjs --json ../../.cache/obelisk-full/u41/run41.json   # ~25 с
node --test tests/ui-kit41.test.mjs
```

Вывод кадра на Canvas — `ui/render/` (3.10–3.12): кит отдаёт вершины, растр и `present.mjs` их рисуют.

## Этап 4.3: экран Workshop из кита

- `ui/screens/workshop.mjs` — экран: вёрстка `data/ui/workshop.json` (секции миров, шаги рядов, ползунок, подзаголовок, ☰) +
  привязки к ядру `core/workshop.mjs` (цены, капы, замки, «хватает баров», тексты). `build(state, { scroll, tasksPanel })` → вершины.
- `ui/format/number.mjs` — короткий вывод чисел («4.10t», «1234», «3.50e63»), правила — `data/ui/workshop.json → format.short`.
- Кит дополнен: строка на капе (`maxed`), заголовок меньшим шрифтом при ширине > `fitWidth`, подложка секции у плашки уровня и
  рамки заголовка, прокрутка шума панели, якорь подзаголовка. Отсечение спрайтов — spec sprite-layout п.6 v9 (этап 8.3: ρ = ⌈·⌉ · больший масштаб, окно полуоткрытое; `view.cullPad` v2 правилом не читается).
- Проверка: `oracle/workshop43/README.md`.

## Этап 6.1: вкладки, полосы прогресса, палитра

- `tabs(list, style, x, y, labels, selected, caption?)` — подложка-прямоугольники, подпись (плашка + лейбл), ряд вкладок по шагу;
  у выбранной свой спрайт тела и/или оттенок и цвет текста. Стили: `tabs.options` (ряд категорий настроек), `tabs.pages` (страницы статистики).
- `progress(list, style, x, y, p, text?)` — фон (кадр или часть спрайта), заполнение частью спрайта длиной `fill.length · p`
  по оси x или y (угол 0 / 180), шапка, которая едет за краем, подпись. Стили: `progress.xp`, `.task`, `.bomb`, `.fish`, `.fishTop`, `.chest`, `.relic`.
- `drawSpritePart` (`sprite.mjs`, spec sprite-layout п.7) — часть спрайта: origin не берётся, запрос ∩ dst кадра. Реализатор — отдельный процесс по спеке.
- Палитра: `kit.json → palette`; в любом поле стиля цвет `@имя` (`resolvePalette`, подстановка при `makeKit`).
- Проверка (критерий 6.1 — каждый компонент 0 px против групп O во всех записях golden-2250):

```sh
nice node oracle/ui61/run61.mjs --json ../../.cache/obelisk-full/u61/run61.json   # ~1–6 мин по load хаба
node --test tests/ui-kit61.test.mjs
```

## Этап 6.2: ввод — координаты касания и попадание

- `input.mjs` (spec `oracle/specs/input-layout.md`, реализатор — отдельный процесс): `GUI` (слой 500×960 при любом окне — якоря
  и прямоугольники нажатий живут в нём), `pointer(px, py, { w, h })` → `{ raw, gui, room }` (целая часть касания, ⌊·500/W⌋),
  `hitArea(g, a, b, c, d)` — a ≤ x ≤ b и c ≤ y ≤ d, границы включены и не округляются.
- Ворота проверки (правило 7): пока открыто окно (например, валют), проверка O отвечает 0 везде. Ворота — состояние экрана:
  экран вызывает `open && hitArea(...)`.
- Проверка (критерий 6.2 — координаты кликов = O на 100 тапах; эталон `oracle/ui62/golden62.json` в git):

```sh
node --test tests/ui-kit62.test.mjs
nice python3 -I oracle/ui62/run62.py      # пересъёмка эталона с O, ~15–60 с
```

## Этап 6.4: таблицы вёрстки из записей (черновики)

- `table.mjs` — рисовальщик таблицы вёрстки `data/ui/drafts/<экран>.json` (схема `ui-draft`): `expandTable` (дерево → листья с
  координатами экрана; `group` с якорем, `repeat` с шагом и заменами полей копий; тексты `t.*` из `strings.json`), `drawLeaf`
  (sprite/text/rect/line → примитивы кита), `renderTable`. Рамки и линии без ширины (режим линий) и `todo` кит пока не рисует.
- Черновики 11 меню собирает разовый конвертер в `oracle/ui64/` из записей O; в рантайм он не попадает (страж 1 и тест).
  Привязок к ядру в черновиках нет: это вёрстка кадра записи, экран своей системы заменит значения привязками.
- Проверка (критерий 6.4):

```sh
nice node oracle/ui64/draft64.mjs --json ../../.cache/obelisk-full/u64/run64.json   # ~7–30 с; --write пересобирает черновики
OBELISK_REQUIRE_ARTIFACTS=1 node --test tests/ui-draft64.test.mjs
```

## Этап 6.3: ворота проверки области (долг 6.2)

- `gate.mjs` — `makeGate(kit.gate)` → `{ press(g), release(g), isOpen(), window(), hit(g, a, b, c, d) }` по spec input-layout п.7 v3:
  окно значков вверху справа (левый — Stat Pages, правый — Currencies) закрывает ворота; повторное касание того же значка
  закрывает окно на нажатии, другого — переключает, кнопка закрытия внизу закрывает на отпускании. `hit` = ворота и правило 5.
  Области — `data/ui/kit.json → gate`. Реализатор — отдельный процесс (агент 6.3-impl) по спеке.
- Экран вызывает `press(pointer(...).gui)` на DOWN и `release(...)` на UP; проверки кнопок экрана — через `gate.hit`.
- Проверка (704 касания O при 500×960 и 1000×1920; эталоны `oracle/ui63/golden63{g,e}.json` в git):

```sh
node --test tests/ui-kit63.test.mjs
nice python3 -I oracle/ui63/run63g.py; nice python3 -I oracle/ui63/run63e.py   # пересъёмка эталонов, ~1 мин каждый
```

## Этап 6.3 (раунд исправлений): модальные окна, меню ☰, тосты — Эк(kit-modal)

- Компоненты (`components.mjs`, стили `data/ui/kit.json`): `box` (рамка-фаска из 3 прямоугольников), `modal` (затемнение, панель,
  кнопка закрытия; `top` окна 62, при панели заданий NPE + 64), `iconTabs` (вкладки-значки окна валют: обычная / открытая / закрытая),
  `toast` (полоса во всю ширину, текст с альфой × 2, значок), `menuOptions` (открытое меню ☰: зелёная кнопка, скруглённая панель —
  правый край по самой длинной строке, подпись, строки-флажки), `sheet` / `sheetInner` / `sheetButton` (лист офлайна).
- Примитивы: `fillRoundRect` (spec shape-layout п.7а v2) и альфа текста > 1 → 255 (spec text-layout п.6 v3) — реализатор отдельный
  процесс по спеке (агент 6.3r-impl, `oracle/specs/log.md`). Рамку скруглённого прямоугольника (полоса линий) кит не рисует.
- Окна мира 1 — `ui/screens/modals.mjs`: Stat Pages, Currencies, тост хаба, меню ☰, листы офлайна (только рамка компонента;
  содержимое окон — экраны систем).
- Проверка: группа `kit-modal` (`oracle/screens/kit-groups.json` над каталогом `oracle/screens.json`, 15 состояний мира 1):

```sh
nice node oracle/ui63/modal63.mjs --json ../../.cache/obelisk-full/km63/run63m.json        # L1, ~4–5 мин при load 90
nice node oracle/workshop43/canvas43.mjs --in ../../.cache/obelisk-full/km63/run63m.json --dir ../../.cache/obelisk-full/km63 \
  --json ../../.cache/obelisk-full/km63/canvas63m.json                                       # L2 (Chrome, ui/render)
node --test tests/kit-modal63.test.mjs
```

## Этап 6.26: экран «Настройки» — Эк(options)
- `ui/screens/options.mjs` + `data/ui/options.json` (схема `ui-options`): 6 вкладок, секции со строками-флажками (шаблоны
  заголовка и строки, подстановка `@поле`), шаги списка, ползунок, строка «More options unlock at Obelisk Level N», ряд вкладок
  `tabs.options`, нижняя панель ссылок. Листья рисует `ui/kit/table.mjs`.
- `sprite.mjs`: правило 2а spec sprite-layout v5 — nine-slice ниже суммы краёв (флажок строки 16 × 0,5). Реализатор — отдельный
  процесс (агент 6.26-impl). Подчёркивания ссылок (линии) кит не рисует — долг 6.3.

## Этап 6.28: окна Stat Pages и Currencies — Эк(stats)
- `ui/screens/stats.mjs` + `data/ui/stats.json` (схема `ui-stats`): содержимое страниц 1–3 поверх окна кита `window.stats`
  (6.3, `ui/screens/modals.mjs`). Секции (колонка, заголовок на подложке `patch_desc`, места строк, шаг 22/19/18/20), строки —
  полоса через одну #404040/#000000 (альфа 0.4), значок, «Подпись: значение»; место без строки — «?» и 20 тире.
- Значения — клетки сводки статов (`core/stats`) и входы сессии; вид значения: клетка, `mul`, `per`, доля «+N%» над базой
  (`over`), время «0d00h00m»; формат — короткий формат UI (`ui/format/number.mjs`, 4.3). Условие показа — `always` или
  «клетка > порога» (?? по 3 сейвам).
- Окно Currencies (`currenciesParts(wallet, {tab, locked, tasksPanel})`, стиль `stats.currencies`) поверх окна кита
  `window.currencies`: проход руд (26 строк: имя, значок и число руды, значок и число слитков; строка без руды и слитков закрыта
  полосой поверх) и на вкладке 0 — проход сундуков и очков (27 полос, 6 строк «Подпись: значение»). Значения — кошелёк сессии.
- Состояния — `oracle/stats628/group628.json`: вся группа stats каталога (7) и все записи record628 (9).
- Проверка: `oracle/stats628/run628.mjs` (L1) → `canvas43.mjs --dir .cache/obelisk-full/st628/l1` (L2), `tests/stats628.test.mjs`.

## Этап 6.6: попапы урона, альфа текста к ближайшему

- `ui/screens/popups.mjs` — слой попапов урона: у каждого попапа ядра (`core/popups.mjs`, spec `damage-popup`) `label`
  стиля `text.popup.<вид>` (white / yellow) с альфой попапа: тень чёрным (+1, +1), затем текст, font.size12 по центру.
- `alphaByteRound` (`prims.mjs`) и поле стиля текста `alphaRound`: у вывода текста с цветами и альфой аргументом O
  округляет альфу к ближайшему (spec text-layout п.6а), у `draw_text` с текущей альфой — вниз (п.6).
- Проверка (критерий 6.6 — Ан(damage-popup, 120): кадры 651…771 записи O, вершины = O, L1 и L2 0 px):

```sh
nice python3 -I oracle/ui66/record66.py && python3 -I oracle/ui66/extract66.py   # записи O, ~3–5 мин
for i in 0 1 2 3; do nice node oracle/ui66/dp66.mjs --shard $i/4 --json ../../.cache/obelisk-full/dp66/run66-p$i.json & done; wait
node oracle/ui66/dp66.mjs --merge ../../.cache/obelisk-full/dp66/run66-p{0,1,2,3}.json --json ../../.cache/obelisk-full/dp66/run66.json
nice node oracle/workshop43/canvas43.mjs --in ../../.cache/obelisk-full/dp66/run66.json --dir ../../.cache/obelisk-full/dp66 --json ../../.cache/obelisk-full/dp66/canvas66.json
OBELISK_REQUIRE_ARTIFACTS=1 node --test tests/dp66.test.mjs
```

## Этап 6.9: экран Upgrades — Эк(upgrades-ui)
- `ui/screens/upgrades.mjs` + `data/ui/upgrades.json` (схема `ui-upgrades`, генератор `oracle/upgrades69/mkdata69.mjs`): секции
  миров 1–4 (заголовок «World N Upgrades» цветом секции; ряд мира 1 — рамка прямоугольниками, миров 2–4 — подложка
  `patch_backing_magma` / `_green` / `_purple`), шаги списка 80 / 104 / 84, обрыв рисования ниже 1160 (??, между 1152 и 1176),
  ползунок с постоянным пределом прокрутки 9705, полоса ☰ с флажком «Hide Maxed Upgrades» (`menuOptions` кита), нижняя полоса
  с Buy All. Кит не менялся: экран кладёт свои стили (`upgrades.*`) поверх `data/ui/kit.json`.
- Ряд: плашка уровня (0 < L < кап), подложка, поле описания, значок, плашка итога «+N%» у строк 32, 36, 43, 50 при L > 0,
  кнопка Buy (нет у строки под замком по уровню), заголовок (шире 320 — size10), цены (1 или 2 столбца; текст шире 112 в size12 —
  size10, ?? порог между 108 и 117), замки «Unlock At Level N» и «Reach World N To Unlock».
- Числа строк (цены, руды, кап, пороги, тексты, «можно купить») — только из ядра `core/upgrades.mjs` (spec upgrades v3): экран
  передаёт ядру состояние целиком (`task`, `obelisk`, `artifacts` нужны для цены кирки и округления).
- Проверка: `oracle/upgrades69/run69.mjs` (L1) → `canvas43.mjs --in … --dir .cache/obelisk-full/up69/l1` (L2),
  `tests/upgrades69.test.mjs`; записи O — `oracle/upgrades69/record69.py` (osbx, A = B).

## Этап 6.15: растянутый спрайт и прямоугольник с 4 цветами
- `drawSpriteStretched(list, skin, key, frame, x, y, w, h, rgb, alpha)` (`sprite.mjs`, spec sprite-layout п.8 v6): origin не берётся,
  (x, y) — лево-верх области w × h; раскладка `drawSprite` с привязкой (0, 0) и масштабами float32(w / ширина холста), float32(h / высота
  холста) — общее ядро раскладки (кадр, nine-slice). Отсечения окном нет.
- `fillRect(…, alpha, colors?)` (`prims.mjs`, spec shape-layout п.2 v4): `colors` — 4 цвета углов лево-верх, право-верх, право-низ, лево-низ.
- Таблицы вёрстки (`table.mjs`): компонент `stretched {sprite, frame, x, y, w, h, color, alpha}`, у `rect` поле `colors` (4 × `#rrggbb`).

## 6.15: текст — высота блока по п. 3а (v5)
- `drawText` (`prims.mjs`, spec text-layout п.3а v5): высота блока для сдвига по вертикали (valign 1 и 2): у «ext» (задан sep ≥ 0)
  H = n · шаг − (n − 1), n — число строк после переноса; у обычного вывода (sep не задан или < 0) H = n · шаг (п. 2). У одной строки
  H = шаг, вершины прежние. Шаг между строками на экране не меняется. Интерфейс не менялся.
  ?? valign bottom у нескольких строк: взято то же H (в записях нет).

6.16: text-layout v6 п. 3б — `drawText`: при valign 1 у обычного вывода (без sep) со snap = true сдвиг = −n · ⌊шаг / 2⌋ (size10, 2 строки: −14); «ext», snap = false и valign bottom — без изменений.

6.20: text-layout v7 п. 3в (составитель 6.20) — у «ext» (sep ≥ 0) с n ≥ 2 строками H = (n − 1)·шаг + line_height шрифта (size12 sep 18, 2 строки: −18, а п. 3а давал −17). В `drawText` отдельной правки нет: формула входит в v8 п. 3г (6.25, реализатор — отдельный процесс), группа drones-nav проверена на ней.

6.25: text-layout v8 п. 3г — `drawText`: у «ext» (sep ≥ 0) H = (n − 1)·sep + line_height шрифта при любом n ≥ 1, в том числе при одной строке (size12, sep 14: верх строки y − 9, а не −7); обычный вывод без sep, п. 3б и snap — без изменений.

## Этап 6.19: якоря

- `anchors.mjs` (spec `oracle/specs/input-layout.md`, правило 1): `makeLayer({ w, h }, { safeTop })` → слой 500×960 при любом окне; `point(якорь, dx, dy)` — якоря `topLeft…bottomRight` (имена схемы ui-screen), верхние сдвигаются на `safeTop` (вырез, px слоя; `safeTopOfInset(вырез окна, окно)`), `toWindow`, `touch` (правила 2–3), `hit` (правило 5).
- `buyRow`: строка на капе под замком — кнопка Maxed и текст, затем плашки замков (записи O 6.19).
- Проверка: `nice node oracle/workshop619/run619.mjs`, `node --test tests/workshop619.test.mjs`.

## Этап 6.10: прокрутка списка жестом — `scroll.mjs`
- Spec `oracle/specs/scroll-list.md` (v1). `makeScrollList({ divisor, maxScroll, repeatEvery, scroll = 0 })` — числа только из
  параметров (Upgrades: `data/ui/upgrades.json → scroll.drag.divisor / repeatEvery`, `scroll.track.maxScroll`).
- События кадра: `press(x, y)`, `move(x, y)`, `release(x, y)` (дробная часть отбрасывается, input-layout п. 3), затем один
  `frame(hitTest)` → `{ scroll, speed, tap, repeat }`. `hitTest(x, y, scroll)` → есть ли под пальцем кнопка; может отсутствовать.
- Правила: нажатие — A = gy, v = 0, s не меняется (3); пока палец прижат (кроме кадра отпускания) v = (gy − A) / divisor,
  s := clamp(s − round(v), 0, maxScroll) каждый кадр, даже если палец стоит (4); отпускание — s не меняется, инерции нет (5);
  `tap` — в кадре нажатия по точке нажатия, без порога (6); `repeat` — счётчик c = 1 в кадре нажатия, +1 в кадре удержания,
  при c ≥ repeatEvery c := 0 и повтор по текущему (gy, s) (7). Геттеры `scroll` (есть сеттер, целое, зажимается), `speed`, `held`.
- Не реализовано (неясности спеки, ??): полоса ☰ (счётчик удержания не растёт при gy примерно 121–171, границы не измерены);
  прямоугольник попадания кнопки Buy — на вызывающем (`hitTest`); нажатие на нижней полосе и кнопках; сохранение s между
  открытиями меню; два пальца.
