// spec: tasks-panel
// Панель Intro Tasks (этап 6.7): вёрстка — data/ui/tasks.json, задания — data/systems/tasks.json, тексты — strings.json.
// Порядок рисования — spec tasks-panel правило 4: шапка, тело, значки, заголовок, поле описания, текст, полоса, «Complete Task».

/** @param {object} deps { kit (makeKit), tasks (data/systems/tasks.json), strings (strings.json → .strings) } */
export function makeTasksPanel(doc, { kit, tasks, strings }) {
  const cols = tasks.tables.tasks.columns;
  const rows = new Map(tasks.tables.tasks.rows.map((r) => {
    const row = Object.fromEntries(cols.map((c, k) => [c, r[k]]));
    return [row.id, row];
  }));
  const first = tasks.constants.firstId;
  const count = tasks.constants.count;

  /** Сдвиг въезда, px: slideFrames — кадры с начала въезда; не задано — въезд закончен. */
  function slideOffset(slideFrames) {
    if (slideFrames == null) return 0;
    return Math.max(0, doc.slide.from - doc.slide.perFrame * slideFrames);
  }

  /** Описание панели или null, если её нет. */
  function view(st, v = {}) {
    if (st.shown) return null;
    const row = st.task >= first && st.task <= count ? rows.get(st.task) : undefined;
    if (!row) return null;
    const last = st.task === count;
    const progress = last && doc.final.progressIsGoal ? row.goal : st.progress;
    const p = progress / row.goal;
    return {
      top: doc.base + (v.insetTop ?? 0) + slideOffset(v.slideFrames),
      title: strings[doc.title.prefix] + st.task + '/' + count + doc.title.suffix,
      icon: row.icon,
      text: strings[row.text],
      textColor: last ? doc.final.color : undefined,
      p,
      label: progress + '/' + row.goal,
      complete: progress >= row.goal,
    };
  }

  const piece = (list, d, x, y, sprite) => kit.part(list, { sprite: sprite ?? d.sprite, dx: 0, dy: 0, sx: d.sx, sy: d.sy }, x, y);

  function build(list, st, v = {}) {
    const w = view(st, v);
    if (!w) return null;
    const t = w.top;
    piece(list, doc.header, doc.header.x, t + doc.header.y);
    piece(list, doc.body, doc.body.x, t + doc.body.y);
    for (const ic of doc.icons) piece(list, ic, ic.x, t + ic.y, w.icon);
    kit.label(list, doc.title.style, doc.title.x, t + doc.title.y, w.title, doc.title.color);
    piece(list, doc.desc, doc.desc.x, t + doc.desc.y);
    kit.label(list, doc.descText.style, doc.descText.x, t + doc.descText.y, w.text, w.textColor);
    kit.progress(list, doc.progress.style, doc.progress.x, t + doc.progress.y, w.p, w.label);
    if (w.complete) {
      for (const d of doc.complete.parts) piece(list, d, d.x, t + d.y);
      const c = doc.complete.text;
      kit.label(list, c.style, c.x, t + c.y, strings[c.key]);
    }
    return w;
  }

  /** Тексты панели в порядке рисования. */
  function texts(st, v = {}) {
    const w = view(st, v);
    if (!w) return [];
    const out = [w.title, w.text, w.label];
    if (w.complete) out.push(strings[doc.complete.text.key]);
    return out;
  }

  return { view, build, texts, slideOffset };
}
