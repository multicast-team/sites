// spec: tasks
// Задания обучения: цель, прогресс, проверка при старте, закрытие.
// Код по спеке oracle/specs/tasks.md (правила 1–4). Данные — data/systems/tasks.json,
// их передаёт вызывающий: ядро само в файлы не ходит.

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/** @param {object} tasksData содержимое data/systems/tasks.json */
export function makeTasks(tasksData) {
  const C = tasksData.constants;
  const goals = new Map(tableRows(tasksData.tables.tasks).map((r) => [r.id, r.goal]));
  const counterOf = new Map(tableRows(tasksData.tables.onStart).map((r) => [r.task, r.counter]));

  function goal(task) {
    return task >= C.firstId && task <= C.count && goals.has(task) ? goals.get(task) : null;
  }

  function progress(task, value, id, mode, amount) {
    if (task !== id) return value;
    if (mode === 0) return value + amount;
    if (mode === 1) return Math.max(value, amount);
    return value;
  }

  function onStart(task, value, counters) {
    const name = counterOf.get(task);
    return name === undefined ? value : Math.max(value, counters[name]);
  }

  function claim(state, counters) {
    const g = goal(state.task);
    if (g === null || state.taskProgress < g) return null;
    const s = { ...state, consumables: state.consumables.slice() };
    if (state.task === C.count) {
      s.gems = state.gems + C['final.gems'];
      s.dronePoints = state.dronePoints + C['final.dronePoints'];
      s.consumables[C['final.item']] = state.consumables[C['final.item']] + C['final.itemCount'];
      s.freebieCountdown = C['final.freebieCountdown'];
    }
    s.task = state.task + 1;
    s.taskProgress = 0;
    s.taskProgress = onStart(s.task, 0, counters);
    return s;
  }

  return { goal, progress, onStart, claim };
}
