// Игра (этап 6.33, приёмка мира 1): сборка ядра, пакета skin и экранов в одну игру без DOM.
//
// Состояние игры — словарь сейва «секция/ключ INI → значение» (core/saveini, core/savedict) плюс сессия кадров
// (core/session: таймеры), состояние NPE (core/npe: хаб, кнопки хаба и закрытия, плитки) и вид экранов (прокрутка).
// Экраны (ui/screens): хаб, Workshop, Upgrades; главный экран — HUD (ui/screens/hud). Покупки — ядро (core/workshop,
// core/upgrades), потом состояние пишется обратно в словарь. Привязки к ключам сейва и зоны Buy — data/ui/main.json.
// Страница (ui/main/index.html, boot.mjs) даёт read/readBinary и выводит кадр; тест — oracle/main633/play633.mjs.
import { openSkin } from '../../skin/index.mjs';
import { makeKit } from '../kit/components.mjs';
import { pointer } from '../kit/input.mjs';
import { makeShortFormat } from '../format/number.mjs';
import { makeWorkshop } from '../../core/workshop.mjs';
import { makeUpgrades } from '../../core/upgrades.mjs';
import { makeNpe } from '../../core/npe.mjs';
import { createGame } from '../../core/session.mjs';
import { saveDict, initialTimers } from '../../core/savedict.mjs';
import { encodeIni, decodeIni } from '../../core/saveini.mjs';
import { makeWorkshopScreen } from '../screens/workshop.mjs';
import { makeUpgradesScreen } from '../screens/upgrades.mjs';
import { makeHubScreen } from '../screens/hub.mjs';
import { makeHud } from '../screens/hud.mjs';
import { decodePng } from './png.mjs';
import { deflateStored, inflate } from './flate.mjs';
import { drawList } from './draw.mjs';

const PARTS = [1, 2, 3];
const PART_MARK = ';part ';

/** Загрузить данные, пакет и экраны. read(путь) → JSON, readBinary(путь) → Uint8Array (атласы skin-local). */
export async function loadGame({ read, readBinary, pack = 'gray' }) {
  const J = async (p) => read(p);
  const [strings, kitDoc, mainDoc, wsData, wsDoc, upData, upRules, upDoc, hubUi, hubSys, obSys, tasks, taskRules, boot, save, hudDoc] = await Promise.all([
    'data/strings.json', 'data/ui/kit.json', 'data/ui/main.json', 'data/systems/workshop.json', 'data/ui/workshop.json',
    'data/systems/upgrades.json', 'data/systems/upgraderules.json', 'data/ui/upgrades.json', 'data/ui/hub.json',
    'data/systems/hub.json', 'data/systems/obelisk.json', 'data/systems/tasks.json', 'data/systems/taskrules.json',
    'data/systems/boot.json', 'data/systems/save.json', 'data/ui/hud.json'].map(J));
  const sk = await openSkin(pack, read);
  const cache = new Map();
  const atlasPixels = sk.atlasPixels || ((i) => {
    if (!cache.has(i)) cache.set(i, decodePng(readBinary(sk.atlasFile(i))));
    return cache.get(i);
  });
  return { strings: strings.strings, kitDoc, mainDoc, wsData, wsDoc, upData, upRules, upDoc, hubUi, hubSys, obSys, tasks, taskRules, boot, save, hudDoc, sk, atlasPixels, pack };
}

/**
 * Игра по загруженному. opts: { window: {w, h} — окно в px (500×960 или 1000×1920), epochSeconds — часы новой игры }.
 */
export function createApp(L, { window: win = { w: 500, h: 960 }, epochSeconds = 1798000000 } = {}) {
  const { strings, kitDoc, mainDoc: M, sk, save } = L;
  const skin = sk.skin;
  const kit = makeKit(kitDoc, skin);
  const short = L.wsDoc.format.short;
  const fmt = makeShortFormat(short);
  const workshop = makeWorkshop(L.wsData, strings);
  const upgrades = makeUpgrades(L.upData, L.upRules, strings);
  const tasks = { ...L.tasks, constants: { ...L.tasks.constants, ...L.taskRules.constants }, tables: { ...L.tasks.tables, ...L.taskRules.tables } };
  const npe = makeNpe({ hub: L.hubSys, obelisk: L.obSys, tasks, boot: L.boot });
  const NO = L.hubSys.constants.noScreen;
  const wsScreen = makeWorkshopScreen(L.wsDoc, { kit, workshop, strings });
  const upScreen = makeUpgradesScreen(L.upDoc, { kitDoc, skin, upgrades, strings, short, epsilon: L.upRules.constants['afford.epsilon'] });
  const hubScreen = makeHubScreen(L.hubUi, { hub: L.hubSys, obelisk: L.obSys, strings, skin });
  const hud = makeHud(L.hudDoc, { kit, kitDoc, strings });
  const S = M.save;
  const zipOpts = { deflate: deflateStored, inflate };

  let dict, session, nav, view, frameNo, log;

  // ---------- словарь сейва ↔ состояния экранов ----------
  const num = (k) => Number(dict[k] ?? 0);
  const arr = ({ prefix, count }) => Array.from({ length: count }, (_, i) => num(prefix + i));
  const put = ({ prefix }, a) => a.forEach((v, i) => { dict[prefix + i] = v; });

  function wsState() {
    return { obelisk: num(S.obelisk), worlds: num(S.worlds), capBonus: 0, levels: arr(S.workshop), bars: arr(S.bars) };
  }
  function upState() {
    return { levels: arr(S.upgrades), bars: arr(S.bars), gold: num(S.gold), lvl: num(S.lvl), world: num(S.worlds), task: num(S.task),
      obelisk: num(S.obelisk), artifacts: S.artifacts.map(arr) };
  }
  function npeState(prev) {
    const visited = arr(S.visited).map((v) => (v ? 1 : 0));
    return { ...(prev ?? npe.initial()), task: num(S.task), visited };
  }

  function startSession(fromDict) {
    session = createGame({ tick: L.boot, save, epochSeconds });
    if (fromDict) Object.assign(session, initialTimers(fromDict));
    frameNo = 0;
  }

  function reset(d) {
    dict = d;
    startSession(d);
    nav = { ...npeState(null), shown: 1, screen: NO };   // игра открывается на хабе (главного экрана с шахтой в порте нет, ??)
    view = { workshop: { scroll: 0 }, upgrades: { scroll: 0, hideMaxed: false }, hub: {} };
    log = [];
  }

  /** Новая игра: значения новой игры из data/systems/save.json (spec saveini). */
  function newGame() {
    const g = createGame({ tick: L.boot, save, epochSeconds });
    reset({ ...g.initial, ...g.noGlobal });
    note('новая игра');
  }

  function note(what) { log.push({ frame: frameNo, what }); if (log.length > 200) log.shift(); }

  /** Текущий экран: hub | workshop | upgrades | main (главный: HUD). */
  function screenName() {
    if (nav.shown === 1 && nav.screen === NO) return 'hub';
    if (nav.screen === M.screens.workshop) return 'workshop';
    if (nav.screen === M.screens.upgrades) return 'upgrades';
    if (nav.shown === 0) return 'main';
    return 'hub';
  }

  // ---------- кадр ----------
  function step(n = 1) {
    for (let i = 0; i < n; i++) {
      session.step();
      frameNo++;
      const s = npe.step(nav, session.frame, {});
      if (s.unlock === null && nav.unlock !== null) { put(S.visited, s.visited.map((v) => (v ? true : false))); note(`открыто меню ${nav.unlock.index}`); }
      nav = s;
    }
  }

  function buildList() {
    const name = screenName();
    if (name === 'workshop') return wsScreen.build(wsState(), { scroll: view.workshop.scroll, window: win });
    if (name === 'upgrades') return upScreen.build(upState(), { scroll: view.upgrades.scroll, hideMaxed: view.upgrades.hideMaxed });
    const list = kit.newList();
    if (name === 'hub') {
      const ms = Math.floor(frameNo * 1000 / 60);
      hubScreen.build(list, { task: nav.task, obelisk: num(S.obelisk), visited: nav.visited, unlock: nav.unlock }, { insetTop: 0, ms, clock: M.hud.clock, battery: M.hud.battery, music: true, sfx: true });
      return list;
    }
    hud.build(list, {
      shift: false, gifts: null, skill: '0', xp: { capped: true }, plates: [], level: num(S.lvl),
      wallet: [fmt(num(S.gold)), fmt(num(S.gems))], hub: { dot: false }, exit: false, obelisk: null, shop: null, floor: null, gauges: null,
    });
    return list;
  }

  /** Нарисовать кадр на растре R окна W×H. */
  function render(R, W = win.w, H = win.h) {
    const list = buildList();
    R.setClearColor([0, 0, 0, 1]);
    R.clear(0, { color: true, depth: false, stencil: false });
    const calls = drawList(R, list, L.atlasPixels, { W, H, layer: M.layer });
    return { vertices: list.count, calls, screen: screenName() };
  }

  // ---------- ввод ----------
  function maxScroll(name) {
    if (name === 'workshop') return L.wsDoc.root.children.find((c) => c.id === 'scroll').track.maxScroll;
    if (name === 'upgrades') return upScreen.maxScrollOf();
    return 0;
  }
  function scrollBy(dy) {
    const name = screenName();
    if (!view[name] || !('scroll' in view[name])) return;
    view[name].scroll = Math.max(0, Math.min(maxScroll(name), view[name].scroll + dy));
  }

  function buyAt(g) {
    const name = screenName();
    const z = M.buy[name];
    if (!z) return null;
    if (name === 'workshop') {
      const oy = wsScreen.topOf({ window: win });
      for (const e of wsScreen.layout) {
        if (e.kind !== 'row') continue;
        const cx = 250 + z.dx, cy = e.y + oy - view.workshop.scroll + z.dy;
        if (Math.abs(g[0] - cx) <= z.halfW && Math.abs(g[1] - cy) <= z.halfH) {
          const st = wsState();
          const ok = workshop.buy(st, e.row);
          if (ok) { put(S.workshop, st.levels); put(S.bars, st.bars); }
          note(`workshop buy ${e.row}: ${ok ? 'да' : 'нет'}`);
          return { screen: name, row: e.row, ok };
        }
      }
    } else if (name === 'upgrades') {
      const st = upState();
      const x0 = L.upDoc.list.x;
      for (const e of upScreen.layout(st, view.upgrades.hideMaxed)) {
        if (e.kind !== 'row') continue;
        const cx = x0 + z.dx, cy = e.y - view.upgrades.scroll + z.dy;
        if (Math.abs(g[0] - cx) <= z.halfW && Math.abs(g[1] - cy) <= z.halfH) {
          const ok = upgrades.buy(e.row, st);
          if (ok) { put(S.upgrades, st.levels); put(S.bars, st.bars); dict[S.gold] = st.gold; }
          note(`upgrades buy ${e.row}: ${ok ? 'да' : 'нет'}`);
          return { screen: name, row: e.row, ok };
        }
      }
    }
    return null;
  }

  /** Касание окна (px, py). → что произошло. */
  function tap(px, py) {
    const g = pointer(px, py, win).gui;
    const before = screenName();
    const b = buyAt(g);
    if (b) return { ...b, g };
    const s = npe.down(nav, g[0], g[1], { overlay: 0, obeliskLevel: num(S.obelisk), taskProgress: 0 });
    // плитки экранов, которых в игре ещё нет, не открываются (порт мира 1 собран из Workshop и Upgrades)
    if (s.screen !== NO && s.screen !== M.screens.workshop && s.screen !== M.screens.upgrades) {
      note(`экран ${s.screen} не собран в игру`);
      return { screen: before, ignored: s.screen, g };
    }
    if (s.task !== nav.task) dict[S.task] = s.task;
    nav = s;
    const after = screenName();
    if (after !== before) note(`${before} → ${after}`);
    return { screen: after, from: before, g };
  }

  // ---------- сейв ----------
  function exportDict() {
    const out = { ...dict };
    const sd = saveDict(session);
    if (sd) for (const [k, v] of Object.entries(sd)) if (!(k in dict) || v !== session.initial[k]) out[k] = v;
    return out;
  }
  /** Текст сейва: части INI 1–3 подряд, каждая после строки «;part N». */
  function exportSave() {
    const d = exportDict();
    return PARTS.map((p) => `${PART_MARK}${p}\r\n${encodeIni(d, save, { part: p, ...zipOpts })}`).join('');
  }
  /** Загрузить текст сейва: наш (с метками частей) или один файл INI (например, сейв игры). */
  function importSave(text) {
    const chunks = new Map();
    if (text.startsWith(PART_MARK)) {
      for (const c of text.split(PART_MARK).slice(1)) {
        const nl = c.indexOf('\n');
        chunks.set(Number(c.slice(0, nl).trim()), c.slice(nl + 1));
      }
    } else for (const p of PARTS) chunks.set(p, text);   // один файл INI (сейв игры): каждая часть берёт свои ключи
    const g = createGame({ tick: L.boot, save, epochSeconds });
    const d = { ...g.initial, ...g.noGlobal };
    for (const [p, t] of chunks) Object.assign(d, decodeIni(t, save, { part: p, ...zipOpts }));
    reset(d);
    note('сейв загружен');
  }

  newGame();
  return {
    newGame, importSave, exportSave, tap, step, render, buildList, scrollBy, screenName,
    get frame() { return frameNo; },
    get log() { return log.slice(); },
    /** Числа для проверки: валюты, уровни и прокрутка. */
    peek() {
      return { screen: screenName(), gold: num(S.gold), lvl: num(S.lvl), obelisk: num(S.obelisk), task: num(S.task),
        workshop: arr(S.workshop), upgrades: arr(S.upgrades), bars: arr(S.bars), scroll: { workshop: view.workshop.scroll, upgrades: view.upgrades.scroll },
        seconds: session.gameSeconds };
    },
    window: win,
  };
}
