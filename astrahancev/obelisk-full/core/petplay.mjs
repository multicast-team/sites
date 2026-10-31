// spec: pets-2250
// Питомцы 2.2.50: имя с прозвищем, питомец под точкой, «погладить».
// Код по спеке oracle/specs/pets-2250.md (правила 1–9). Данные — data/systems/petplay.json, тексты — strings; передаёт вызывающий: ядро само в файлы не ходит.

function tableRows(t) {
  return t.rows.map((r) => Object.fromEntries(t.columns.map((c, i) => [c, r[i]])));
}

/**
 * @param {object} data содержимое data/systems/petplay.json
 * @param {object} strings поле strings файла data/strings.json
 */
export function makePetPlay(data, strings) {
  const C = data.constants;
  const pets = tableRows(data.tables.pets);
  if (pets.length !== C.count) throw new Error('petplay: число питомцев данных ≠ count');
  pets.forEach((p, i) => { if (p.id !== i) throw new Error(`petplay: питомец ${i} не на месте`); });

  // правило 1
  function baseName(i) {
    return strings[pets[i].name];
  }

  // правило 2
  function levelUpName(i, nick) {
    const base = baseName(i);
    if (nick === '' || nick == null) return base;
    return nick + strings[C['name.joiner']] + base;
  }

  // правила 3–4: купленный, квадрат с границей включительно, меньший номер выигрывает
  function petAt(pos, owned, x, y) {
    const h = C['hit.half'];
    for (let i = 0; i < C.count; i++) {
      if (!owned[i]) continue;
      if (Math.abs(x - pos[i][0]) <= h && Math.abs(y - pos[i][1]) <= h) return i;
    }
    return -1;
  }

  // правила 5–7
  function pet(state, x, y, now) {
    const petted = state.petted.slice();
    const i = petAt(state.pos, state.owned, x, y);
    if (i >= 0 && now - petted[i] >= C['pet.cooldownMs']) {
      petted[i] = now;
      return { pet: i, petted };
    }
    return { pet: -1, petted };
  }

  // правило 6
  function never() {
    return C['pet.never'];
  }

  return { baseName, levelUpName, petAt, pet, never };
}
