(() => {
  'use strict';

  const STORAGE_KEY = 'dubai-villas.notes.v1';
  const SHARED_STORAGE_KEY = 'dubai-villas.shared.v1';
  const TOGGLES_STORAGE_KEY = 'dubai-villas.toggles.v1';
  const CLIENT_STORAGE_KEY = 'dubai-villas.client.v1';
  const AUTHOR_STORAGE_KEY = 'dubai-villas.author.v1';
  const CLOUD_OBJECT_URL = 'https://api.restful-api.dev/objects/ff808181a09d98f701a19e08924213e1';
  const CLOUD_STREAM_URL = 'https://ntfy.sh/dubai_villas_krivsunov_comments_v1';
  const INITIAL_SHARED_SEED = {
    war4_6br_tayyab_pdf: { owner: { id: 'owner', author: 'Автор подборки', text: 'Круто, надо посмотреть обязательно. ВДруг все таки зеленом там и вид нормальный', updatedAt: 1000 } },
    samantha_ji_gardenhall500: { owner: { id: 'owner', author: 'Автор подборки', text: 'Второй свет нормалексный ваще', updatedAt: 1000 } },
    polo: { owner: { id: 'owner', author: 'Автор подборки', text: 'красивенько, чисьенько, аккуратненько', updatedAt: 1000 } }
  };
  const MAX_BYTES = 2 * 1024 * 1024;
  const MAX_NOTE = 20000;
  const MAX_ENTRIES = 10000;
  const $ = (id) => document.getElementById(id);
  const strings = (value) => Array.isArray(value) ? value.filter((item) => typeof item === 'string' && item.trim()) : [];
  const text = (value) => typeof value === 'string' ? value.trim() : '';
  const number = (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
  const format = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 });
  const statuses = { selected: 'Выбрано', review: 'На рассмотрении', rejected: 'Отказано', unavailable: 'Недоступно', historical: 'Архив' };
  const types = { villa: 'Вилла', townhouse: 'Таунхаус', linked: 'Смежная вилла', unknown: 'Тип не указан' };
  const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
  const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
  const validId = (value) => typeof value === 'string' && value.length > 0 && value.length <= 256 && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
  const isTestNote = (value) => typeof value === 'string' && /Проверка заметки <script>|Импортированная проверка|Заметка из другой вкладки|Новая версия другой вкладки|Моя правка после другой вкладки/.test(value);
  let notes = Object.create(null);
  let sharedComments = Object.create(null);
  let sharedToggles = Object.create(null);
  let boundEntryIds = Object.create(null);
  let clientId = 'guest';
  let authorName = '';
  let storageReadable = true;
  let savedToDevice = true;
  let savedSnapshot = null;
  let noteSequence = 0;
  let lastOpener = null;
  let galleryDialog = null;
  const publishTimers = new Map();
  let cloudPutTimer = null;
  const noteFields = new Set();
  const toggleWidgets = new Set();

  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function safeUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    try {
      const url = new URL(value);
      return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  }

  function imageUrl(value) {
    const source = text(value);
    if (/^(?:\.\/)?(?:assets|gallery|videos)\//.test(source)) {
      try {
        const path = decodeURIComponent(source.split(/[?#]/)[0]);
        if (!source.includes('\\') && !path.includes('\\') && !path.split('/').includes('..') && !/[\u0000-\u001f\u007f]/.test(source + path)) return source;
      } catch { return ''; }
      return '';
    }
    return safeUrl(source);
  }

  function externalLink(label, href, className = 'button button-quiet') {
    const link = el('a', className, label);
    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }

  function documentUrl(value) {
    const source = text(value);
    if (/^materials\/[a-z0-9_-]+\.pdf$/i.test(source)) return source;
    return safeUrl(source);
  }

  let notifyTimer = 0;
  function notify(message, error = false) {
    const node = $('notification');
    node.textContent = message;
    node.className = error ? 'toast toast-error' : 'toast';
    node.hidden = false;
    clearTimeout(notifyTimer);
    notifyTimer = setTimeout(() => { node.hidden = true; }, error ? 9000 : 4500);
  }

  function storageWarning(message) {
    $('storage-warning').textContent = message;
    $('storage-warning').hidden = false;
  }

  function validateNotes(payload) {
    if (!object(payload) || payload.version !== 1 || !object(payload.notes)) throw new Error('Ожидается JSON экспорта заметок версии 1 с объектом notes.');
    if (own(payload, 'exportedAt') && (typeof payload.exportedAt !== 'string' || payload.exportedAt.length > 64 || !Number.isFinite(Date.parse(payload.exportedAt)))) throw new Error('Некорректная дата экспорта.');
    const entries = Object.entries(payload.notes);
    if (entries.length > MAX_ENTRIES) throw new Error('В файле слишком много записей. Допустимо до 10 000.');
    const result = Object.create(null);
    for (const [id, note] of entries) {
      if (!validId(id) || typeof note !== 'string' || note.length > MAX_NOTE) throw new Error('Некорректная запись: нужен стабильный ID и текст до 20 000 символов.');
      if (note.trim()) result[id] = note;
    }
    checkSize(result);
    return result;
  }

  function checkSize(value) {
    if (Object.keys(value).length > MAX_ENTRIES || new Blob([JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), notes: value }, null, 2)]).size > MAX_BYTES) throw new Error('Общий объём заметок превышает 2 МБ или 10 000 записей. Существующие заметки не изменены.');
  }

  function readNotes() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      savedSnapshot = raw;
      if (raw) {
        if (new Blob([raw]).size > MAX_BYTES) throw new Error('Слишком большой объём заметок.');
        notes = validateNotes(JSON.parse(raw));
      }
    } catch {
      storageReadable = false;
      savedToDevice = false;
      storageWarning('Не удалось прочитать хранилище браузера. Его содержимое не перезаписывается. Новые заметки останутся в этой вкладке: сохраните их через «Экспорт JSON» до закрытия страницы.');
    }
    updateNotesCount();
  }

  function commitNotes(next) {
    checkSize(next);
    if (storageReadable) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const current = raw ? validateNotes(JSON.parse(raw)) : Object.create(null);
        const merged = Object.assign(Object.create(null), current);
        for (const id of new Set([...Object.keys(notes), ...Object.keys(next)])) {
          if (notes[id] === next[id]) continue;
          if (own(next, id)) merged[id] = next[id];
          else delete merged[id];
        }
        checkSize(merged);
        const serialized = JSON.stringify({ version: 1, notes: merged });
        localStorage.setItem(STORAGE_KEY, serialized);
        notes = merged;
        savedSnapshot = serialized;
        savedToDevice = true;
        $('storage-warning').hidden = true;
      } catch {
        notes = next;
        savedToDevice = false;
        storageWarning('Браузер не смог сохранить заметки на устройстве. Они доступны в этой вкладке. Экспортируйте JSON до закрытия страницы.');
      }
    } else {
      notes = next;
      savedToDevice = false;
    }
    refreshNoteFields();
    updateNotesCount();
  }

  function pauseForStorageConflict() {
    storageReadable = false;
    savedToDevice = false;
    storageWarning('Заметки изменились в другой вкладке. Чтобы не перезаписать другую версию, запись на устройство приостановлена. Экспортируйте текущие заметки, обновите страницу и импортируйте файл: тексты будут объединены.');
  }

  function currentAuthor() {
    return text(authorName).slice(0, 40) || 'Автор комментария';
  }

  function normalizeSharedEntry(rawEntry, fallbackId = '') {
    if (!object(rawEntry)) return null;
    const id = validId(rawEntry.id) ? rawEntry.id : (validId(fallbackId) ? fallbackId : '');
    if (!id) return null;
    const rawText = typeof rawEntry.text === 'string' ? rawEntry.text.slice(0, MAX_NOTE) : '';
    if (isTestNote(rawText)) return null;
    const updatedAt = typeof rawEntry.updatedAt === 'number' && Number.isFinite(rawEntry.updatedAt)
      ? rawEntry.updatedAt
      : (typeof rawEntry.updatedAt === 'string' && Number.isFinite(Date.parse(rawEntry.updatedAt)) ? Date.parse(rawEntry.updatedAt) : 1000);
    const deleted = !!rawEntry.deleted || !rawText.trim();
    return {
      id,
      author: text(rawEntry.author).slice(0, 40) || 'Автор комментария',
      text: deleted ? '' : rawText.trim(),
      updatedAt,
      clientId: text(rawEntry.clientId).slice(0, 64),
      deleted
    };
  }

  function mergeSharedEntry(propertyId, rawEntry, fallbackId = '') {
    if (!validId(propertyId)) return false;
    const entry = normalizeSharedEntry(rawEntry, fallbackId);
    if (!entry) return false;
    if (!own(sharedComments, propertyId)) sharedComments[propertyId] = Object.create(null);
    const existing = sharedComments[propertyId][entry.id];
    if (existing) {
      if (existing.updatedAt > entry.updatedAt) return false;
      if (existing.updatedAt === entry.updatedAt && existing.text === entry.text && existing.author === entry.author && existing.deleted === entry.deleted) return false;
    }
    sharedComments[propertyId][entry.id] = entry;
    return true;
  }

  function mergeSharedMap(rawMap) {
    if (!object(rawMap)) return false;
    let changed = false;
    for (const [propertyId, entries] of Object.entries(rawMap)) {
      if (!validId(propertyId)) continue;
      if (Array.isArray(entries)) {
        for (const item of entries) if (mergeSharedEntry(propertyId, item)) changed = true;
      } else if (object(entries)) {
        for (const [entryId, item] of Object.entries(entries)) if (mergeSharedEntry(propertyId, item, entryId)) changed = true;
      }
    }
    return changed;
  }

  function normalizeToggleEntry(rawToggle) {
    if (!object(rawToggle)) return null;
    const viewed = !!rawToggle.viewed;
    const rent = !!rawToggle.rent;
    const updatedAt = typeof rawToggle.updatedAt === 'number' && Number.isFinite(rawToggle.updatedAt) ? rawToggle.updatedAt : 1000;
    const author = text(rawToggle.author).slice(0, 40);
    return { viewed, rent, updatedAt, author };
  }

  function mergeToggleEntry(propertyId, rawToggle) {
    if (!validId(propertyId)) return false;
    const entry = normalizeToggleEntry(rawToggle);
    if (!entry) return false;
    const existing = sharedToggles[propertyId];
    if (existing) {
      if (existing.updatedAt > entry.updatedAt) return false;
      if (existing.updatedAt === entry.updatedAt && existing.viewed === entry.viewed && existing.rent === entry.rent) return false;
    }
    sharedToggles[propertyId] = entry;
    return true;
  }

  function mergeToggleMap(rawMap) {
    if (!object(rawMap)) return false;
    let changed = false;
    for (const [propertyId, item] of Object.entries(rawMap)) {
      if (mergeToggleEntry(propertyId, item)) changed = true;
    }
    return changed;
  }

  function getPropertyToggle(property) {
    const id = property.id;
    if (own(sharedToggles, id)) return sharedToggles[id];
    return {
      viewed: !!property.viewedDefault,
      rent: !!property.rentDefault,
      updatedAt: 1000,
      author: ''
    };
  }

  function saveSharedToLocal() {
    try {
      localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify({ version: 1, sharedComments, sharedToggles }));
      localStorage.setItem(TOGGLES_STORAGE_KEY, JSON.stringify({ version: 1, sharedToggles }));
    } catch {}
  }

  function getVisibleSharedComments(propertyId) {
    if (!validId(propertyId) || !own(sharedComments, propertyId)) return [];
    return Object.values(sharedComments[propertyId])
      .filter((entry) => entry && !entry.deleted && entry.text && entry.text.trim() && !isTestNote(entry.text))
      .sort((a, b) => (a.updatedAt - b.updatedAt) || a.id.localeCompare(b.id));
  }

  function totalSharedCommentsCount() {
    let total = 0;
    for (const propertyId of Object.keys(sharedComments)) total += getVisibleSharedComments(propertyId).length;
    return total;
  }

  function getActiveEntryId(propertyId) {
    if (own(boundEntryIds, propertyId) && validId(boundEntryIds[propertyId])) return boundEntryIds[propertyId];
    boundEntryIds[propertyId] = clientId;
    return clientId;
  }

  function isOwnSharedEntry(propertyId, entry) {
    if (!entry) return false;
    if (entry.clientId && entry.clientId === clientId) return true;
    if (own(boundEntryIds, propertyId) && boundEntryIds[propertyId] === entry.id) return true;
    if (own(notes, propertyId) && notes[propertyId].trim() && notes[propertyId].trim() === entry.text.trim()) return true;
    return false;
  }

  function updateNotesCount() {
    const count = Object.keys(notes).length;
    const sharedTotal = totalSharedCommentsCount();
    if (count) {
      $('notes-count').textContent = `Заметок: ${count} · Общих комментариев: ${sharedTotal} (видны всем)`;
    } else if (sharedTotal) {
      $('notes-count').textContent = `Общих комментариев: ${sharedTotal} · сохраняются для всех`;
    } else {
      $('notes-count').textContent = 'Все комментарии и переключатели сохраняются автоматически и видны всем';
    }
    updateCommentBadges();
  }

  function formatCommentTime(timestamp) {
    if (typeof timestamp !== 'number' || timestamp <= 1000000000000) return 'сохранено в подборке';
    try {
      return new Date(timestamp).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }

  function renderSharedList(field) {
    const items = getVisibleSharedComments(field.id);
    const signature = JSON.stringify(items.map((item) => [item.id, item.author, item.text, item.updatedAt, isOwnSharedEntry(field.id, item)]));
    if (field.lastSignature === signature) return items.length;
    field.lastSignature = signature;
    field.list.replaceChildren();
    field.list.hidden = items.length === 0;
    for (const item of items) {
      const ownEntry = isOwnSharedEntry(field.id, item);
      const cardNode = el('div', ownEntry ? 'shared-comment-item is-own' : 'shared-comment-item');
      const meta = el('div', 'shared-comment-meta');
      const authorWrap = el('span', 'shared-comment-author', item.author || 'Участник');
      if (ownEntry) authorWrap.append(el('span', 'shared-comment-tag', 'Вы'));
      const right = el('span', 'shared-comment-right');
      const timeLabel = formatCommentTime(item.updatedAt);
      if (timeLabel && timeLabel !== 'сохранено в подборке') right.append(el('span', 'shared-comment-time', timeLabel));
      const editBtn = el('button', 'shared-comment-delete', 'Изм.');
      editBtn.type = 'button';
      editBtn.title = 'Изменить комментарий';
      editBtn.setAttribute('aria-label', 'Изменить комментарий');
      editBtn.addEventListener('click', () => {
        boundEntryIds[field.id] = item.id;
        const next = Object.assign(Object.create(null), notes);
        next[field.id] = item.text;
        try { commitNotes(next); } catch {}
        field.input.focus();
      });
      right.append(editBtn);
      const del = el('button', 'shared-comment-delete', '×');
      del.type = 'button';
      del.title = 'Удалить комментарий';
      del.setAttribute('aria-label', 'Удалить комментарий');
      del.addEventListener('click', () => deleteSharedComment(field.id, item.id));
      right.append(del);
      meta.append(authorWrap, right);
      const body = el('p', 'shared-comment-text', item.text);
      cardNode.append(meta, body);
      field.list.append(cardNode);
    }
    return items.length;
  }

  function refreshNoteFields() {
    for (const field of noteFields) {
      if (!field.input.isConnected) { noteFields.delete(field); continue; }
      const value = notes[field.id] || '';
      if (field.input.value !== value) field.input.value = value;
      const sharedCount = renderSharedList(field);
      const hasAny = !!value.trim() || sharedCount > 0;
      field.block.classList.toggle('has-note', hasAny);
      field.badge.hidden = !hasAny;
      field.badge.textContent = sharedCount > 1 ? `${sharedCount}` : 'Есть';
      field.status.textContent = !savedToDevice ? 'Не сохранено · экспортируйте JSON' : (hasAny ? 'Видно всем' : 'Автосохранение');
      field.status.classList.toggle('error', !savedToDevice);
      if (field.addBtn) field.addBtn.hidden = !value.trim();
      if (field.actionsRow) field.actionsRow.hidden = !value.trim();
    }
  }

  async function pushSnapshotToCloud() {
    try {
      let remoteComments = Object.create(null);
      let remoteToggles = Object.create(null);
      try {
        const getResp = await fetch(CLOUD_OBJECT_URL, { cache: 'no-store' });
        if (getResp.ok) {
          const currentObj = await getResp.json();
          if (currentObj && object(currentObj.data)) {
            if (object(currentObj.data.sharedComments)) remoteComments = currentObj.data.sharedComments;
            if (object(currentObj.data.sharedToggles)) remoteToggles = currentObj.data.sharedToggles;
          }
        }
      } catch {}
      const cChanged = mergeSharedMap(remoteComments);
      const tChanged = mergeToggleMap(remoteToggles);
      if (cChanged || tChanged) {
        saveSharedToLocal();
        if (cChanged) { refreshNoteFields(); updateNotesCount(); }
        if (tChanged) refreshToggleWidgets();
      }
      await fetch(CLOUD_OBJECT_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'dubai-villas-shared-comments-v1',
          data: { version: 1, updatedAt: Date.now(), sharedComments, sharedToggles }
        })
      });
    } catch {}
  }

  async function publishEntryToCloud(propertyId, entryId) {
    if (!validId(propertyId) || !own(sharedComments, propertyId) || !own(sharedComments[propertyId], entryId)) return;
    const entry = sharedComments[propertyId][entryId];
    if (!entry || isTestNote(entry.text)) return;
    try {
      await fetch(CLOUD_STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ type: 'comment', propertyId, entry })
      });
    } catch {}
    clearTimeout(cloudPutTimer);
    cloudPutTimer = setTimeout(pushSnapshotToCloud, 400);
  }

  async function publishToggleToCloud(propertyId) {
    if (!validId(propertyId) || !own(sharedToggles, propertyId)) return;
    const toggle = sharedToggles[propertyId];
    try {
      await fetch(CLOUD_STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ type: 'toggle', propertyId, toggle })
      });
    } catch {}
    clearTimeout(cloudPutTimer);
    cloudPutTimer = setTimeout(pushSnapshotToCloud, 400);
  }

  function scheduleCloudPublish(propertyId, entryId, immediate = false) {
    const key = `${propertyId}::${entryId}`;
    if (publishTimers.has(key)) clearTimeout(publishTimers.get(key));
    if (immediate) {
      publishTimers.delete(key);
      publishEntryToCloud(propertyId, entryId);
      return;
    }
    publishTimers.set(key, setTimeout(() => {
      publishTimers.delete(key);
      publishEntryToCloud(propertyId, entryId);
    }, 600));
  }

  function syncLocalNoteToShared(propertyId, rawValue, immediate = false) {
    if (!validId(propertyId) || isTestNote(rawValue)) return;
    const entryId = getActiveEntryId(propertyId);
    const trimmed = typeof rawValue === 'string' ? rawValue.trim() : '';
    if (!trimmed) {
      if (own(sharedComments, propertyId) && own(sharedComments[propertyId], entryId) && !sharedComments[propertyId][entryId].deleted) {
        mergeSharedEntry(propertyId, {
          id: entryId,
          author: currentAuthor(),
          text: '',
          updatedAt: Date.now(),
          clientId,
          deleted: true
        });
        saveSharedToLocal();
        refreshNoteFields();
        updateNotesCount();
        scheduleCloudPublish(propertyId, entryId, immediate);
      }
      return;
    }
    const existing = own(sharedComments, propertyId) ? sharedComments[propertyId][entryId] : null;
    const authorLabel = existing && existing.id === 'owner' && !text(authorName) ? existing.author : currentAuthor();
    const changed = mergeSharedEntry(propertyId, {
      id: entryId,
      author: authorLabel,
      text: trimmed,
      updatedAt: Date.now(),
      clientId,
      deleted: false
    });
    if (changed) {
      saveSharedToLocal();
      refreshNoteFields();
      updateNotesCount();
      scheduleCloudPublish(propertyId, entryId, immediate);
    }
  }

  function deleteSharedComment(propertyId, entryId) {
    if (!validId(propertyId) || !validId(entryId)) return;
    const existing = own(sharedComments, propertyId) ? sharedComments[propertyId][entryId] : null;
    if (!existing) return;
    mergeSharedEntry(propertyId, {
      id: entryId,
      author: existing.author || currentAuthor(),
      text: '',
      updatedAt: Date.now(),
      clientId,
      deleted: true
    });
    saveSharedToLocal();
    if (own(notes, propertyId) && (getActiveEntryId(propertyId) === entryId || notes[propertyId].trim() === existing.text.trim())) {
      const next = Object.assign(Object.create(null), notes);
      delete next[propertyId];
      try { commitNotes(next); } catch {}
    } else {
      refreshNoteFields();
      updateNotesCount();
    }
    scheduleCloudPublish(propertyId, entryId, true);
  }

  function addSeparateComment(propertyId, inputNode) {
    if (!validId(propertyId)) return;
    const val = inputNode.value.trim();
    if (!val || isTestNote(val)) return;
    syncLocalNoteToShared(propertyId, val, true);
    boundEntryIds[propertyId] = `${clientId}_${Date.now().toString(36)}`;
    const next = Object.assign(Object.create(null), notes);
    delete next[propertyId];
    try { commitNotes(next); } catch {}
    notify('Комментарий опубликован в общую ленту. Поле очищено — при желании можно добавить ещё один комментарий.');
  }

  function noteBlock(property) {
    const block = el('div', 'notes-block');
    const heading = el('div', 'note-heading');
    const label = el('label', '', 'Комментарии');
    const badge = el('span', 'note-badge', 'Есть');
    badge.hidden = true;
    label.append(badge);
    const list = el('div', 'shared-comments-list');
    list.hidden = true;
    const input = el('textarea');
    const status = el('span', 'note-status');
    const actionsRow = el('div', 'note-actions');
    const addBtn = el('button', 'note-add-button', '+ Ещё комментарий');
    addBtn.type = 'button';
    addBtn.hidden = true;
    actionsRow.hidden = true;
    const inputId = `note-${++noteSequence}`;
    label.htmlFor = inputId;
    input.id = inputId;
    input.maxLength = MAX_NOTE;
    input.rows = 2;
    input.placeholder = 'Написать комментарий (виден всем)…';
    input.setAttribute('aria-label', `Ваш комментарий: ${property.title}`);
    status.id = `${inputId}-status`;
    status.setAttribute('aria-live', 'polite');
    input.setAttribute('aria-describedby', status.id);
    if (!property.noteId) {
      input.disabled = true;
      input.placeholder = 'Для сохранения нужен уникальный идентификатор объекта';
      status.textContent = 'Заметки пока недоступны';
    } else {
      input.value = notes[property.noteId] || '';
      const fieldRecord = { id: property.noteId, input, status, block, badge, list, addBtn, actionsRow, lastSignature: '' };
      const sharedCount = renderSharedList(fieldRecord);
      const hasAny = !!input.value.trim() || sharedCount > 0;
      block.classList.toggle('has-note', hasAny);
      badge.hidden = !hasAny;
      badge.textContent = sharedCount > 1 ? `${sharedCount}` : 'Есть';
      status.textContent = !savedToDevice ? 'Не сохранено · экспортируйте JSON' : (hasAny ? 'Видно всем' : 'Автосохранение');
      status.classList.toggle('error', !savedToDevice);
      addBtn.hidden = !input.value.trim();
      actionsRow.hidden = !input.value.trim();
      noteFields.add(fieldRecord);
      input.addEventListener('input', () => {
        const next = Object.assign(Object.create(null), notes);
        if (input.value.trim()) next[property.noteId] = input.value;
        else delete next[property.noteId];
        try {
          commitNotes(next);
          syncLocalNoteToShared(property.noteId, input.value, false);
        } catch (error) {
          input.value = notes[property.noteId] || '';
          status.textContent = 'Изменение не сохранено: лимит объёма';
          status.classList.add('error');
          notify(error.message, true);
        }
      });
      input.addEventListener('change', () => syncLocalNoteToShared(property.noteId, input.value, true));
      addBtn.addEventListener('click', () => addSeparateComment(property.noteId, input));
    }
    heading.append(label, status);
    actionsRow.append(addBtn);
    block.append(heading, list, input, actionsRow);
    return block;
  }

  function media(src, alt, eager = false) {
    const box = el('div', 'media');
    const placeholder = el('div', 'media-placeholder');
    placeholder.append(el('span', '', '◇'), el('p', '', 'Фото пока нет'));
    box.append(placeholder);
    const url = imageUrl(src);
    if (url) {
      const img = el('img');
      img.alt = alt;
      img.loading = eager ? 'eager' : 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      img.addEventListener('load', () => { placeholder.hidden = true; });
      img.addEventListener('error', () => {
        img.remove();
        placeholder.hidden = false;
      }, { once: true });
      img.src = url;
      box.append(img);
    }
    return box;
  }

  function videoElement(item, label, controls = false) {
    const video = el('video');
    video.controls = controls;
    video.playsInline = true;
    video.preload = 'metadata';
    video.muted = true;
    video.defaultMuted = true;
    if (item.poster) video.poster = item.poster;
    if (controls) video.setAttribute('aria-label', label);
    else { video.tabIndex = -1; video.setAttribute('aria-hidden', 'true'); }
    video.src = item.src;
    return video;
  }

  function mediaPreview(item, label, eager = false, thumbnail = false) {
    if (item.type !== 'video') return media(thumbnail && item.thumb ? item.thumb : item.src, label, eager);
    const box = media(item.poster || '', label, eager);
    box.classList.add('video-preview');
    box.querySelector('.media-placeholder p').textContent = 'Видео';
    if (!item.poster && !thumbnail) box.append(videoElement(item, label));
    const play = el('span', 'play-indicator', '▶');
    play.setAttribute('aria-hidden', 'true');
    box.append(play);
    return box;
  }

  function pauseVideos(container) {
    container.querySelectorAll('video').forEach((video) => {
      video.pause();
      video.muted = true;
      video.removeAttribute('src');
      video.load();
    });
  }

  function syncDialogScroll() {
    document.body.classList.toggle('dialog-open', $('property-dialog').open || !!(galleryDialog && galleryDialog.open));
  }

  function openGallery(property, startIndex, opener) {
    if (!property.media.length) return;
    if (galleryDialog) galleryDialog.close();
    const dialog = el('dialog', 'gallery-dialog');
    galleryDialog = dialog;
    dialog.setAttribute('aria-labelledby', 'gallery-title');
    const top = el('div', 'dialog-top');
    const heading = el('h2', 'gallery-title', property.title);
    heading.id = 'gallery-title';
    const close = el('button', 'close-button', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', 'Закрыть галерею');
    top.append(heading, close);
    const counter = el('p', 'gallery-counter');
    counter.setAttribute('role', 'status');
    counter.setAttribute('aria-live', 'polite');
    counter.setAttribute('aria-atomic', 'true');
    const viewport = el('div', 'gallery-viewport');
    const stage = el('div', 'gallery-stage');
    const previous = el('button', 'gallery-nav', '‹');
    const next = el('button', 'gallery-nav', '›');
    previous.type = next.type = 'button';
    previous.setAttribute('aria-label', 'Предыдущее фото или видео');
    next.setAttribute('aria-label', 'Следующее фото или видео');
    previous.disabled = next.disabled = property.media.length < 2;
    viewport.append(previous, stage, next);
    const caption = el('p', 'gallery-caption');
    const thumbnails = el('div', 'gallery-thumbnails');
    thumbnails.setAttribute('role', 'group');
    thumbnails.setAttribute('aria-label', 'Все видео и фотографии');
    let current = startIndex;
    const buttons = property.media.map((item, index) => {
      const button = el('button', 'gallery-thumbnail');
      button.type = 'button';
      button.setAttribute('aria-label', `${item.type === 'video' ? 'Видео' : 'Фото'} · ${index + 1} из ${property.media.length}: ${item.caption || property.title}`);
      button.append(mediaPreview(item, '', false, true), el('span', 'thumbnail-number', String(index + 1)));
      button.addEventListener('click', () => show(index));
      thumbnails.append(button);
      return button;
    });

    function show(index) {
      pauseVideos(stage);
      current = (index + property.media.length) % property.media.length;
      const item = property.media[current];
      const label = item.caption || property.title;
      const kind = item.type === 'video' ? 'Видео' : 'Фото';
      const message = el('p', 'gallery-media-error', `${kind} не удалось загрузить. Выберите другой материал.`);
      message.hidden = true;
      message.setAttribute('role', 'status');
      let node;
      if (item.type === 'video') node = videoElement(item, label, true);
      else {
        node = el('img');
        node.alt = label;
        node.decoding = 'async';
        node.referrerPolicy = 'no-referrer';
      }
      node.addEventListener('error', () => { message.hidden = false; node.hidden = true; }, { once: true });
      if (item.type !== 'video') node.src = item.src;
      stage.replaceChildren(node, message);
      counter.textContent = `${kind} · ${current + 1} из ${property.media.length}`;
      caption.textContent = item.caption || `${kind}: ${property.title}`;
      buttons.forEach((button, i) => {
        button.setAttribute('aria-current', String(i === current));
        button.tabIndex = i === current ? 0 : -1;
      });
      const active = buttons[current];
      thumbnails.scrollLeft = active.offsetLeft - thumbnails.offsetLeft - (thumbnails.clientWidth - active.offsetWidth) / 2;
    }

    close.addEventListener('click', () => { pauseVideos(stage); dialog.close(); });
    previous.addEventListener('click', () => show(current - 1));
    next.addEventListener('click', () => show(current + 1));
    dialog.addEventListener('keydown', (event) => {
      if (event.target.closest('video') || event.altKey || event.ctrlKey || event.metaKey) return;
      const targets = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: property.media.length - 1 };
      if (!own(targets, event.key)) return;
      event.preventDefault();
      show(targets[event.key]);
      if (thumbnails.contains(event.target)) buttons[current].focus({ preventScroll: true });
    });
    let touchStart = null;
    stage.addEventListener('touchstart', (event) => {
      touchStart = event.touches.length === 1 && !event.target.closest('video') ? { x: event.touches[0].clientX, y: event.touches[0].clientY } : null;
    }, { passive: true });
    stage.addEventListener('touchend', (event) => {
      if (!touchStart || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      touchStart = null;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) show(current + (dx < 0 ? 1 : -1));
    }, { passive: true });
    stage.addEventListener('touchcancel', () => { touchStart = null; });
    dialog.addEventListener('cancel', () => pauseVideos(stage));
    dialog.addEventListener('close', () => {
      pauseVideos(stage);
      dialog.remove();
      if (galleryDialog === dialog) galleryDialog = null;
      syncDialogScroll();
      if (!galleryDialog && opener && opener.isConnected) opener.focus({ preventScroll: true });
    });
    dialog.append(top, counter, viewport, caption, thumbnails);
    document.body.append(dialog);
    dialog.showModal();
    syncDialogScroll();
    show(startIndex);
    close.focus({ preventScroll: true });
  }

  const catalog = object(window.VILLA_CATALOG) ? window.VILLA_CATALOG : {};
  const rawProperties = Array.isArray(catalog.properties) ? catalog.properties.filter(object) : [];
  const idCounts = new Map();
  for (const item of rawProperties) if (validId(item.id)) idCounts.set(item.id, (idCounts.get(item.id) || 0) + 1);
  const properties = rawProperties.map((item, index) => {
    const status = own(statuses, item.status) ? item.status : 'review';
    const pictures = (Array.isArray(item.images) ? item.images : []).filter(object).map((picture) => ({ src: imageUrl(picture.src), thumb: imageUrl(picture.thumb), caption: text(picture.caption) })).filter((picture) => picture.src);
    const videos = (Array.isArray(item.videos) ? item.videos : []).filter(object).map((video) => ({ src: imageUrl(video.src), caption: text(video.caption), poster: imageUrl(video.poster), type: 'video' })).filter((video) => video.src);
    const cover = imageUrl(item.cover) || (pictures[0] && pictures[0].src) || '';
    if (cover && !pictures.some((picture) => picture.src === cover)) pictures.unshift({ src: cover, caption: '' });
    return {
      ...item,
      index,
      title: text(item.title) || 'Объект без названия',
      area: text(item.area),
      agent: text(item.agent),
      noteId: validId(item.id) && idCounts.get(item.id) === 1 ? item.id : '',
      status,
      statusLabel: text(item.statusLabel) || (own(statuses, item.status) ? statuses[status] : 'Статус не указан'),
      type: own(types, item.type) ? item.type : 'unknown',
      price: number(item.price),
      priceLabel: text(item.priceLabel),
      priceNote: text(item.priceNote),
      ceilingHeightM: typeof item.ceilingHeightM === 'number' ? item.ceilingHeightM : 3.0,
      ceilingMaxM: typeof item.ceilingMaxM === 'number' ? item.ceilingMaxM : 3.0,
      ceiling: text(item.ceiling),
      ceilingEstimateNote: text(item.ceilingEstimateNote),
      projectType: text(item.projectType),
      doubleHeight: text(item.doubleHeight) || 'no',
      doubleHeightLabel: text(item.doubleHeightLabel) || 'Без второго света',
      waterView: text(item.waterView) || 'no',
      waterViewLabel: text(item.waterViewLabel) || 'Без вида на воду',
      pool: text(item.pool) || 'no',
      poolLabel: text(item.poolLabel) || 'Без своего бассейна',
      viewedDefault: !!item.viewedDefault,
      rentDefault: !!item.rentDefault,
      cover,
      images: pictures,
      videos,
      media: [...videos, ...pictures.map((picture) => ({ ...picture, type: 'image' }))],
      documents: (Array.isArray(item.documents) ? item.documents : []).filter(object).map((doc) => ({ href: documentUrl(doc.href), label: text(doc.label) || 'PDF с фотографиями' })).filter((doc) => doc.href),
      description: text(item.description),
      facts: strings(item.facts),
      caveats: strings(item.caveats),
      missing: strings(item.missing),
      listingUrl: safeUrl(item.listingUrl),
      detailPage: /^properties\/[a-z0-9_-]+\.html$/i.test(text(item.detailPage)) ? text(item.detailPage) : '',
      mapUrl: safeUrl(item.mapUrl),
      locationLabel: text(item.locationLabel),
      agentPhone: text(item.agentPhone),
      search: [
        item.title, item.area, item.agent, item.agentPhone, item.statusLabel,
        item.description, item.locationLabel, item.ceiling, item.ceilingEstimateNote,
        item.projectType, item.doubleHeightLabel, item.waterViewLabel, item.poolLabel,
        item.listingUrl, ...strings(item.facts), ...strings(item.caveats)
      ].filter((value) => typeof value === 'string').join(' ').toLocaleLowerCase('ru-RU')
    };
  });

  const AED_PER_USD = 3.6725;
  const GENERIC_PRICE_NOTE = 'Заявленная цена; актуальные условия уточняются.';
  const statusTabs = [
    ['', 'Все'],
    ['active', 'Актуальные'],
    ['selected', 'Выбрано'],
    ['review', 'На рассмотрении'],
    ['rejected', 'Отказ'],
    ['unavailable', 'Недоступно'],
    ['historical', 'Архив']
  ];
  const standalone = rawProperties.length === 1 && !!document.querySelector('base');
  const state = { status: '', view: 'grid' };
  let visibleList = properties;
  let currentDetail = null;
  let pushedHash = false;
  const ICONS = {
    pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.4"/>',
    chat: '<path d="M4.5 19.5 5.6 16A8 8 0 1 1 8.4 18.6z"/>',
    link: '<path d="M14 5h5v5M19 5l-8 8M17 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h4"/>',
    doc: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    page: '<path d="M4 12h14M13 6l6 6-6 6"/>'
  };

  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('icon');
    svg.innerHTML = ICONS[name];
    return svg;
  }

  function iconLink(name, label, href, className = 'button button-quiet') {
    const link = externalLink('', href, className);
    link.append(icon(name), el('span', '', label));
    return link;
  }

  function plural(n, one, few, many) {
    const a = Math.abs(n) % 100;
    const b = a % 10;
    if (a > 10 && a < 20) return many;
    if (b === 1) return one;
    if (b >= 2 && b <= 4) return few;
    return many;
  }

  function formatPhone(raw) {
    const clean = text(raw);
    const digits = clean.replace(/\D/g, '');
    const uae = digits.match(/^971(\d{2})(\d{3})(\d{4})$/);
    if (uae) return `+971 ${uae[1]} ${uae[2]} ${uae[3]}`;
    if (digits.length >= 8) return `+${digits}`;
    return clean;
  }

  function whatsappUrl(raw) {
    const digits = text(raw).replace(/\D/g, '');
    return digits.length >= 8 ? `https://wa.me/${digits}` : '';
  }

  function sourceSiteName(url) {
    if (!url) return '';
    try {
      const host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
      if (host.includes('propertyfinder')) return 'Property Finder';
      if (host.includes('bayut')) return 'Bayut';
      if (host.includes('keyzee')) return 'Keyzee Homes';
      return host;
    } catch { return 'сайт объявления'; }
  }

  function noLinkSourceLabel(property) {
    if (property.videos.length && property.images.length) return 'Ссылки на сайт нет — только фото и видео риэлтора';
    if (property.videos.length) return 'Ссылки на сайт нет — только видео риэлтора';
    if (property.documents.length) return 'Ссылки на сайт нет — только PDF и фото риэлтора';
    if (property.images.length) return 'Ссылки на сайт нет — только фото риэлтора';
    return 'Ссылки на сайт нет — только фото/видео риэлтора (переписка)';
  }

  function agentContactLine(property) {
    const line = el('p', 'card-agent');
    const name = property.agent || 'Риэлтор не указан';
    const wa = whatsappUrl(property.agentPhone);
    const formatted = formatPhone(property.agentPhone);
    if (wa) {
      line.append(el('span', '', `Риэлтор: ${name} · `));
      line.append(externalLink(`WhatsApp ${formatted} ↗`, wa, 'inline-ext-link wa-link'));
    } else if (property.agent === 'Артур') {
      line.append(el('span', '', 'Риэлтор: Артур · WhatsApp (группа) · '));
      line.append(externalLink('TG @Art_Real_Estate ↗', 'https://t.me/Art_Real_Estate', 'inline-ext-link wa-link'));
    } else {
      line.append(el('span', '', `Риэлтор: ${name} · WhatsApp не указан`));
    }
    return line;
  }

  function sourceOriginLine(property) {
    const line = el('p', 'card-source');
    if (property.listingUrl) {
      const site = sourceSiteName(property.listingUrl);
      line.append(el('span', '', 'Откуда взят: '));
      line.append(externalLink(`Сайт ${site} ↗`, property.listingUrl, 'inline-ext-link source-site-link'));
    } else {
      line.append(el('span', 'source-no-link', noLinkSourceLabel(property)));
    }
    return line;
  }

  function usdLabel(aed) {
    return `≈ ${format.format(Math.round(aed / AED_PER_USD / 1000))} тыс. $ в год`;
  }

  function commentCount(property) {
    return property.noteId ? getVisibleSharedComments(property.noteId).length : 0;
  }

  function mediaSummary(property) {
    const parts = [];
    if (property.videos.length) parts.push(`${property.videos.length} видео`);
    if (property.images.length) parts.push(`${property.images.length} фото`);
    return parts.join(' · ');
  }

  function statusText(property) {
    return property.status === 'rejected' && !/отказ/i.test(property.statusLabel) ? `Отказ · ${property.statusLabel}` : property.statusLabel;
  }

  function badges(property, withType = false) {
    const group = el('div', 'badges');
    group.append(el('span', `badge status-${property.status}`, statusText(property)));
    if ((withType && property.type !== 'unknown') || property.type === 'townhouse' || property.type === 'linked') group.append(el('span', 'badge type-badge', types[property.type]));
    return group;
  }

  function priceBlock(property, detail = false) {
    const block = el('div', detail ? 'price-block detail-price' : 'price-block');
    if (property.price !== null) {
      block.append(el('p', 'price', property.priceLabel || `${format.format(property.price)} AED / год`), el('p', 'price-usd', usdLabel(property.price)));
    } else {
      block.append(el('p', 'price price-unknown', property.priceLabel || 'Цена не указана'));
    }
    if (property.priceNote && (detail || property.priceNote !== GENERIC_PRICE_NOTE)) block.append(el('p', 'price-note', property.priceNote));
    return block;
  }

  function precision(property) {
    if (!property.mapUrl) return 'Местоположение на карте не указано';
    const labels = { exact: 'Точка: точный объект', entrance: 'Точка: въезд, не точный дом', area: 'Точка: район, не точный дом' };
    return own(labels, property.mapPrecision) ? labels[property.mapPrecision] : 'Точность точки не подтверждена';
  }

  function specItems(property) {
    const items = [];
    const bedrooms = number(property.bedrooms);
    const bathrooms = number(property.bathrooms);
    const plot = number(property.plotM2);
    const bua = number(property.buaM2);
    if (bedrooms !== null) items.push(`${format.format(bedrooms)} ${plural(bedrooms, 'спальня', 'спальни', 'спален')}`);
    if (bathrooms !== null) items.push(`${format.format(bathrooms)} ${plural(bathrooms, 'санузел', 'санузла', 'санузлов')}`);
    if (plot !== null) items.push(`участок ${format.format(plot)} м²`);
    if (bua !== null) items.push(`дом ${format.format(bua)} м²`);
    return items;
  }

  function specifications(property) {
    const list = el('ul', 'specs');
    const items = specItems(property);
    for (const value of items) list.append(el('li', '', value));
    if (!items.length) list.append(el('li', 'specs-empty', 'Метраж и спальни уточняются'));
    return list;
  }

  function featureChips(property) {
    const wrap = el('div', 'feature-chips');
    const ceilingChip = el('span', 'feature-chip chip-ceiling', `↕ Потолки: ${property.ceiling || `~${property.ceilingHeightM} м`}`);
    if (property.ceilingEstimateNote) ceilingChip.title = property.ceilingEstimateNote;
    wrap.append(ceilingChip);

    const dhClass = property.doubleHeight === 'no' ? 'chip-double-no' : 'chip-double-yes';
    const dhPrefix = property.doubleHeight === 'no' ? '' : '☀ ';
    const dhChip = el('span', `feature-chip ${dhClass}`, `${dhPrefix}${property.doubleHeightLabel}`);
    if (property.ceilingEstimateNote) dhChip.title = property.ceilingEstimateNote;
    wrap.append(dhChip);

    const wClass = property.waterView === 'yes' ? 'chip-water-yes' : (property.waterView === 'golf' ? 'chip-water-golf' : 'chip-water-no');
    const wPrefix = property.waterView === 'yes' ? '≈ ' : (property.waterView === 'golf' ? '⛳ ' : '');
    wrap.append(el('span', `feature-chip ${wClass}`, `${wPrefix}${property.waterViewLabel}`));

    const pClass = property.pool === 'private' ? 'chip-pool-private' : (property.pool === 'community' ? 'chip-pool-community' : 'chip-pool-no');
    const pPrefix = property.pool !== 'no' ? '🏊 ' : '';
    wrap.append(el('span', `feature-chip ${pClass}`, `${pPrefix}${property.poolLabel}`));
    return wrap;
  }

  function updateSingleToggleWidget(widget) {
    const stateObj = getPropertyToggle(widget.property);
    const viewed = !!stateObj.viewed;
    const rent = !!stateObj.rent;
    widget.viewedBtn.setAttribute('aria-checked', String(viewed));
    widget.viewedLabel.textContent = viewed ? '✓ Смотрели' : 'Не смотрели';
    widget.viewedBtn.title = viewed ? 'Нажмите, чтобы отметить «Не смотрели»' : 'Нажмите, чтобы отметить «Смотрели»';

    widget.rentBtn.setAttribute('aria-checked', String(rent));
    widget.rentLabel.textContent = rent ? '★ Снимаем!' : 'Не снимаем';
    widget.rentBtn.title = rent ? 'Нажмите, чтобы переключить на «Не снимаем»' : 'Нажмите, чтобы переключить на «Снимаем!»';

    if (widget.hostCard) {
      widget.hostCard.classList.toggle('is-viewed', viewed);
      widget.hostCard.classList.toggle('is-renting', rent);
    }
  }

  function refreshToggleWidgets() {
    for (const widget of toggleWidgets) {
      if (!widget.root.isConnected) {
        toggleWidgets.delete(widget);
        continue;
      }
      updateSingleToggleWidget(widget);
    }
    renderStats();
  }

  function handleToggleFlip(property, field) {
    const current = getPropertyToggle(property);
    const nextViewed = field === 'viewed' ? !current.viewed : !!current.viewed;
    const nextRent = field === 'rent' ? !current.rent : !!current.rent;
    mergeToggleEntry(property.id, {
      viewed: nextViewed,
      rent: nextRent,
      updatedAt: Date.now(),
      author: currentAuthor()
    });
    saveSharedToLocal();
    refreshToggleWidgets();
    if ($('filter-viewed').value || $('filter-rent').value) {
      render();
    }
    publishToggleToCloud(property.id);
  }

  function decisionToggles(property, hostCard = null) {
    const root = el('div', 'decision-toggles');
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', `Отметки по объекту: ${property.title}`);

    const viewedBtn = el('button', 'toggle-switch toggle-viewed');
    viewedBtn.type = 'button';
    viewedBtn.setAttribute('role', 'switch');
    viewedBtn.dataset.toggle = 'viewed';
    const viewedTrack = el('span', 'switch-track');
    viewedTrack.append(el('span', 'switch-thumb'));
    const viewedLabel = el('span', 'switch-label');
    viewedBtn.append(viewedTrack, viewedLabel);

    const rentBtn = el('button', 'toggle-switch toggle-rent');
    rentBtn.type = 'button';
    rentBtn.setAttribute('role', 'switch');
    rentBtn.dataset.toggle = 'rent';
    const rentTrack = el('span', 'switch-track');
    rentTrack.append(el('span', 'switch-thumb'));
    const rentLabel = el('span', 'switch-label');
    rentBtn.append(rentTrack, rentLabel);

    const widget = { property, root, viewedBtn, viewedLabel, rentBtn, rentLabel, hostCard };
    updateSingleToggleWidget(widget);
    toggleWidgets.add(widget);

    viewedBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      handleToggleFlip(property, 'viewed');
    });
    rentBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      handleToggleFlip(property, 'rent');
    });

    root.append(viewedBtn, rentBtn);
    return root;
  }

  function openButton(label, property, className) {
    const button = el('button', className, label);
    button.type = 'button';
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', () => openDetail(property, button));
    return button;
  }

  function commentBadge(property, className) {
    const badge = el('span', className);
    badge.dataset.commentsFor = property.noteId || '';
    fillCommentBadge(badge, commentCount(property));
    return badge;
  }

  function fillCommentBadge(badge, count) {
    badge.hidden = count === 0;
    badge.textContent = `✎ ${count}`;
    badge.title = `${count} ${plural(count, 'комментарий', 'комментария', 'комментариев')}`;
  }

  function updateCommentBadges() {
    document.querySelectorAll('[data-comments-for]').forEach((badge) => {
      fillCommentBadge(badge, badge.dataset.commentsFor ? getVisibleSharedComments(badge.dataset.commentsFor).length : 0);
    });
  }

  function quickLinks(property) {
    const group = el('div', 'quick-links');
    const wa = whatsappUrl(property.agentPhone);
    if (property.mapUrl) group.append(iconLink('pin', 'Карта', property.mapUrl, 'chip-link'));
    if (wa) group.append(iconLink('chat', 'WhatsApp', wa, 'chip-link chip-wa'));
    if (property.listingUrl) group.append(iconLink('link', 'Сайт', property.listingUrl, 'chip-link'));
    else if (property.documents.length) group.append(iconLink('doc', 'PDF', property.documents[0].href, 'chip-link'));
    return group;
  }

  function cover(property, eager) {
    const button = el('button', 'cover-button');
    button.type = 'button';
    button.setAttribute('aria-label', property.media.length ? `Открыть галерею: ${property.title}. Видео: ${property.videos.length}, фото: ${property.images.length}` : `Подробнее: ${property.title}`);
    button.setAttribute('aria-haspopup', 'dialog');
    button.addEventListener('click', () => property.media.length ? openGallery(property, 0, button) : openDetail(property, button));
    button.append(property.media.length ? mediaPreview(property.media[0], property.title, eager) : media('', property.title));
    const top = el('div', 'cover-top');
    top.append(badges(property), commentBadge(property, 'cover-comments'));
    button.append(top);
    if (property.media.length) button.append(el('span', 'cover-count', mediaSummary(property)));
    return button;
  }

  function card(property, index) {
    const article = el('article', `property-card is-${property.status}`);
    article.dataset.id = property.id;
    const main = el('div', 'card-main');
    const title = el('h3', 'card-title');
    title.append(openButton(property.title, property, 'title-button'));
    const meta = el('p', 'card-meta');
    meta.append(el('span', 'card-area', property.area || 'Район не указан'));
    main.append(
      priceBlock(property),
      title,
      decisionToggles(property, article),
      meta,
      agentContactLine(property),
      sourceOriginLine(property),
      specifications(property),
      featureChips(property)
    );
    if (property.ceilingEstimateNote) {
      const ceilBox = el('p', 'ceiling-summary');
      ceilBox.append(el('strong', '', 'Оценка потолков по проекту и фото: '), el('span', '', property.ceilingEstimateNote));
      ceilBox.title = property.ceilingEstimateNote;
      main.append(ceilBox);
    }
    if (property.description) main.append(el('p', 'description card-description', property.description));
    if (property.caveats.length) main.append(el('p', 'caveat', property.caveats[0] + (property.caveats.length > 1 ? ` · ещё ${property.caveats.length - 1} в карточке` : '')));
    const actions = el('div', 'card-actions');
    actions.append(openButton('Подробнее', property, 'button card-open'), quickLinks(property));
    main.append(actions);
    article.append(cover(property, index < 3), main, noteBlock(property));
    return article;
  }

  function listHeader() {
    const head = el('div', 'list-head');
    head.setAttribute('aria-hidden', 'true');
    ['Объект', 'Цена', 'Спальни', 'Участок', 'Дом', 'Статус', ''].forEach((label) => head.append(el('span', '', label)));
    return head;
  }

  function listRow(property, index) {
    const row = el('article', `list-row is-${property.status}`);
    row.dataset.id = property.id;
    const thumb = el('button', 'list-thumb');
    thumb.type = 'button';
    thumb.tabIndex = -1;
    thumb.setAttribute('aria-hidden', 'true');
    const first = property.media[0];
    thumb.append(first ? mediaPreview(first, '', index < 8, true) : media('', ''));
    thumb.addEventListener('click', () => openDetail(property, row.querySelector('.title-button')));
    const name = el('div', 'list-name');
    const title = el('h3', 'list-title');
    title.append(openButton(property.title, property, 'title-button'));
    name.append(
      title,
      el('p', 'list-sub', [property.area || 'Район не указан', property.ceiling ? `Потолки ${property.ceiling}` : '', property.waterViewLabel].filter(Boolean).join(' · ')),
      decisionToggles(property, row)
    );
    const price = el('div', 'list-price');
    if (property.price !== null) price.append(el('strong', '', format.format(property.price)), el('span', '', ` AED · ${usdLabel(property.price).replace(' в год', '')}`));
    else price.append(el('span', 'muted', property.priceLabel || 'Цена не указана'));
    const beds = number(property.bedrooms);
    const plot = number(property.plotM2);
    const bua = number(property.buaM2);
    const cell = (value, label) => {
      const node = el('span', value === null ? 'list-num is-empty' : 'list-num', value === null ? '—' : value);
      node.dataset.label = label;
      return node;
    };
    row.append(thumb, name, price,
      cell(beds === null ? null : format.format(beds), 'спальни'),
      cell(plot === null ? null : `${format.format(plot)} м²`, 'участок'),
      cell(bua === null ? null : `${format.format(bua)} м²`, 'дом'),
      badges(property), commentBadge(property, 'list-comments'));
    row.addEventListener('click', (event) => {
      if (event.target.closest('a, button, input, textarea, select')) return;
      openDetail(property, row.querySelector('.title-button'));
    });
    return row;
  }

  function detailSection(parent, heading, values, className = '') {
    if (!values.length) return;
    const section = el('section', `detail-section ${className}`.trim());
    const list = el('ul');
    section.append(el('h3', '', heading));
    values.forEach((value) => list.append(el('li', '', value)));
    section.append(list);
    parent.append(section);
  }

  function mosaic(property) {
    const wrap = el('div', 'mosaic');
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Фото и видео объекта');
    if (!property.media.length) {
      wrap.classList.add('is-empty');
      wrap.append(media('', '', true));
      return wrap;
    }
    const shown = property.media.slice(0, 5);
    wrap.classList.add(`count-${shown.length}`);
    shown.forEach((item, index) => {
      const button = el('button', 'mosaic-item');
      button.type = 'button';
      button.setAttribute('aria-haspopup', 'dialog');
      const kind = item.type === 'video' ? 'Видео' : 'Фото';
      button.setAttribute('aria-label', `Открыть ${kind.toLowerCase()} ${index + 1} из ${property.media.length}: ${item.caption || property.title}`);
      button.append(mediaPreview(item, item.caption || property.title, index === 0, index > 0));
      const rest = property.media.length - shown.length;
      if (index === shown.length - 1 && rest > 0) button.append(el('span', 'mosaic-more', `+${rest}`));
      button.addEventListener('click', () => openGallery(property, index, button));
      wrap.append(button);
    });
    const all = el('button', 'mosaic-all', `Все материалы · ${mediaSummary(property)}`);
    all.type = 'button';
    all.addEventListener('click', () => openGallery(property, 0, all));
    wrap.append(all);
    return wrap;
  }

  function propertyLink(property) {
    if (property.detailPage) return new URL(property.detailPage, document.baseURI).href;
    return `${location.origin}${location.pathname}${location.search}#${encodeURIComponent(property.id)}`;
  }

  function buildDetail(property, container) {
    container.replaceChildren();
    const head = el('header', 'detail-head');
    const title = el('h2', 'detail-title', property.title);
    title.id = 'detail-title';
    head.append(badges(property, true), title, el('p', 'detail-location', [property.area || 'Район не указан', property.projectType || '', property.agent ? `агент ${property.agent}` : ''].filter(Boolean).join(' · ')));
    container.append(head, mosaic(property));

    const layout = el('div', 'detail-layout');
    const mainCol = el('div', 'detail-main');
    const aside = el('aside', 'detail-aside');

    const toggleCard = el('div', 'aside-card');
    toggleCard.append(el('p', 'aside-label', 'Ваши отметки (видны всем)'), decisionToggles(property));
    aside.append(toggleCard);

    const priceCard = el('div', 'aside-card');
    priceCard.append(priceBlock(property, true));
    const facts = el('dl', 'detail-facts');
    const rows = [
      ['Спальни', number(property.bedrooms) === null ? '—' : format.format(property.bedrooms), false],
      ['Санузлы', number(property.bathrooms) === null ? '—' : format.format(property.bathrooms), false],
      ['Участок', number(property.plotM2) === null ? '—' : `${format.format(property.plotM2)} м²`, false],
      ['Дом', number(property.buaM2) === null ? '—' : `${format.format(property.buaM2)} м²`, false],
      ['Высота потолков', text(property.ceiling) || '—', true],
      ['Второй свет', text(property.doubleHeightLabel) || '—', true],
      ['Вид на озеро / воду', text(property.waterViewLabel) || '—', true],
      ['Бассейн', text(property.poolLabel) || '—', false],
      ['Тип', types[property.type], false]
    ];
    for (const [label, value, fullRow] of rows) {
      const classes = [];
      if (value === '—') classes.push('is-empty');
      if (fullRow) classes.push('full-row');
      const row = el('div', classes.join(' '));
      row.append(el('dt', '', label), el('dd', '', value));
      facts.append(row);
    }
    priceCard.append(facts);

    const contact = el('div', 'aside-card');
    const wa = whatsappUrl(property.agentPhone);
    contact.append(el('p', 'aside-label', 'Риэлтор и источник'), el('p', 'aside-agent', property.agent || 'Не указан'));
    if (wa) contact.append(iconLink('chat', `WhatsApp ${formatPhone(property.agentPhone)}`, wa, 'button button-wa'));
    else if (property.agent === 'Артур') contact.append(iconLink('chat', 'TG @Art_Real_Estate (группа WhatsApp)', 'https://t.me/Art_Real_Estate', 'button button-wa'));
    else contact.append(el('p', 'aside-note', 'WhatsApp не сохранён'));
    const links = el('div', 'aside-links');
    if (property.mapUrl) links.append(iconLink('pin', 'Открыть на карте', property.mapUrl));
    if (property.listingUrl) links.append(iconLink('link', `Сайт · ${sourceSiteName(property.listingUrl)}`, property.listingUrl));
    property.documents.forEach((doc) => links.append(iconLink('doc', doc.label, doc.href)));
    contact.append(links, el('p', 'aside-note', [property.locationLabel, precision(property)].filter(Boolean).join(' · ')));
    if (!property.listingUrl) contact.append(el('p', 'aside-note', noLinkSourceLabel(property)));
    aside.append(priceCard, contact);

    const description = el('section', 'detail-section');
    description.append(el('h3', '', 'Описание'), el('p', 'description', property.description || 'Описание пока не предоставлено.'));
    mainCol.append(description);

    if (property.ceilingEstimateNote || property.projectType) {
      const ceilingSec = el('section', 'detail-section is-ceiling-box');
      ceilingSec.append(
        el('h3', '', 'Высота потолков, второй свет и видовые характеристики (по проекту и фото)'),
        el('p', '', [
          property.projectType ? `Проект / серия: ${property.projectType}.` : '',
          property.ceilingEstimateNote,
          `Второй свет: ${property.doubleHeightLabel}. Вид: ${property.waterViewLabel}. Бассейн: ${property.poolLabel}.`
        ].filter(Boolean).join('\n'))
      );
      mainCol.append(ceilingSec);
    }

    detailSection(mainCol, 'Что известно', property.facts);
    detailSection(mainCol, 'Обратить внимание', property.caveats, 'is-caveats');
    detailSection(mainCol, 'Что ещё уточнить', property.missing);
    if (text(property.requestState)) detailSection(mainCol, 'Уточнения у агента', [text(property.requestState)]);
    if (strings(property.possibleDuplicateIds).length) detailSection(mainCol, 'Проверка предложения', ['Возможно, этот же объект есть в подборке повторно. Совпадение ещё не подтверждено.']);
    if (text(property.sourceNote)) detailSection(mainCol, 'Примечание к источнику', [text(property.sourceNote)]);
    const comments = el('section', 'detail-section detail-comments');
    comments.append(el('h3', '', 'Комментарии'), noteBlock(property));
    mainCol.append(comments);

    layout.append(mainCol, aside);
    container.append(layout);
  }

  function updateDialogNav() {
    const index = visibleList.indexOf(currentDetail);
    const inList = index !== -1;
    $('prev-property').disabled = !inList || visibleList.length < 2;
    $('next-property').disabled = !inList || visibleList.length < 2;
    $('dialog-position').textContent = inList ? `${index + 1} из ${visibleList.length}` : '';
    $('dialog-heading').textContent = currentDetail ? currentDetail.title : '';
  }

  function openDetail(property, opener, options = {}) {
    if (!options.keepOpener) lastOpener = opener || lastOpener;
    currentDetail = property;
    if (galleryDialog) galleryDialog.close();
    pauseVideos($('detail-content'));
    for (const field of noteFields) if (!field.input.isConnected) noteFields.delete(field);
    buildDetail(property, $('detail-content'));
    updateDialogNav();
    const hash = `#${encodeURIComponent(property.id)}`;
    if (location.hash !== hash) {
      if (options.replace || $('property-dialog').open) history.replaceState(history.state, '', hash);
      else if (!options.fromHistory) { history.pushState({ villa: property.id }, '', hash); pushedHash = true; }
    }
    if (!$('property-dialog').open) $('property-dialog').showModal();
    $('property-dialog').scrollTop = 0;
    document.body.classList.add('dialog-open');
    if (!options.keepFocus) $('close-dialog').focus({ preventScroll: true });
  }

  function stepDetail(delta) {
    const index = visibleList.indexOf(currentDetail);
    if (index === -1 || visibleList.length < 2) return;
    openDetail(visibleList[(index + delta + visibleList.length) % visibleList.length], null, { replace: true, keepOpener: true, keepFocus: true });
  }

  function fillFilter(id, field, allLabel) {
    const counts = new Map();
    for (const property of properties) {
      const k = property[field] || '';
      counts.set(k, (counts.get(k) || 0) + 1);
    }
    const values = [...counts.keys()].sort((a, b) => a.localeCompare(b, 'ru'));
    const select = $(id);
    select.replaceChildren(new Option(allLabel, ''));
    values.forEach((value) => {
      const label = value || (field === 'area' ? 'Район не указан' : 'Агент не указан');
      select.add(new Option(`${label} (${counts.get(value)})`, value || '∅'));
    });
    return values;
  }

  fillFilter('area', 'area', 'Все районы');
  fillFilter('agent', 'agent', 'Все агенты');

  function matchesStatus(property, status) {
    if (!status) return true;
    if (status === 'active') return property.status === 'selected' || property.status === 'review';
    return property.status === status;
  }

  function matchesPriceFilter(property, priceFilter) {
    if (!priceFilter) return true;
    const p = property.price;
    if (priceFilter === 'unknown') return p === null;
    if (p === null) return false;
    if (priceFilter === 'up-400') return p <= 400000;
    if (priceFilter === 'up-450') return p <= 450000;
    if (priceFilter === 'up-500') return p <= 500000;
    if (priceFilter === 'up-550') return p <= 550000;
    if (priceFilter === 'up-600') return p <= 600000;
    if (priceFilter === '400-550') return p >= 400000 && p <= 550000;
    if (priceFilter === 'from-500') return p >= 500000;
    return true;
  }

  function matchesCeilingFilter(property, ceilingFilter) {
    if (!ceilingFilter) return true;
    const h = property.ceilingHeightM;
    const maxH = property.ceilingMaxM;
    if (ceilingFilter === 'high') return h >= 3.1 || maxH >= 4.0 || property.doubleHeight !== 'no';
    if (ceilingFilter === '3.2+') return h >= 3.18;
    if (ceilingFilter === '3.0+') return h >= 3.0;
    if (ceilingFilter === 'double-5.5+') return maxH >= 5.5;
    if (ceilingFilter === 'standard') return h <= 3.05 && property.doubleHeight === 'no';
    return true;
  }

  function matchesWaterFilter(property, waterFilter) {
    if (!waterFilter) return true;
    if (waterFilter === 'yes') return property.waterView === 'yes';
    if (waterFilter === 'water-or-golf') return property.waterView === 'yes' || property.waterView === 'golf';
    if (waterFilter === 'golf') return property.waterView === 'golf';
    if (waterFilter === 'no') return property.waterView === 'no';
    return true;
  }

  function matchesDoubleHeightFilter(property, dhFilter) {
    if (!dhFilter) return true;
    if (dhFilter === 'any-yes') return property.doubleHeight !== 'no';
    return property.doubleHeight === dhFilter;
  }

  function matchesPoolFilter(property, poolFilter) {
    if (!poolFilter) return true;
    if (poolFilter === 'any') return property.pool === 'private' || property.pool === 'community';
    return property.pool === poolFilter;
  }

  function baseFilter() {
    const query = $('search').value.trim().toLocaleLowerCase('ru-RU').split(/\s+/).filter(Boolean);
    const area = $('area').value;
    const agent = $('agent').value;
    const beds = Number($('beds').value) || 0;
    const viewedFilter = $('filter-viewed').value;
    const rentFilter = $('filter-rent').value;
    const priceFilter = $('filter-price').value;
    const ceilingFilter = $('filter-ceiling').value;
    const waterFilter = $('filter-water').value;
    const dhFilter = $('filter-double-height').value;
    const poolFilter = $('filter-pool').value;
    const withComments = $('with-comments').checked;

    return properties.filter((property) => {
      if (!query.every((word) => property.search.includes(word))) return false;
      if (area && (property.area || '∅') !== area) return false;
      if (agent && (property.agent || '∅') !== agent) return false;
      if (beds && (number(property.bedrooms) || 0) < beds) return false;
      if (withComments && commentCount(property) === 0) return false;

      const tState = getPropertyToggle(property);
      if (viewedFilter === 'yes' && !tState.viewed) return false;
      if (viewedFilter === 'no' && tState.viewed) return false;
      if (rentFilter === 'yes' && !tState.rent) return false;
      if (rentFilter === 'no' && tState.rent) return false;

      if (!matchesPriceFilter(property, priceFilter)) return false;
      if (!matchesCeilingFilter(property, ceilingFilter)) return false;
      if (!matchesWaterFilter(property, waterFilter)) return false;
      if (!matchesDoubleHeightFilter(property, dhFilter)) return false;
      if (!matchesPoolFilter(property, poolFilter)) return false;
      return true;
    });
  }

  const sorters = {
    'price-asc': (p) => p.price === null ? null : p.price,
    'price-desc': (p) => p.price === null ? null : -p.price,
    'ceiling-desc': (p) => -(p.ceilingMaxM * 10 + p.ceilingHeightM),
    'plot-desc': (p) => number(p.plotM2) === null ? null : -p.plotM2,
    'bua-desc': (p) => number(p.buaM2) === null ? null : -p.buaM2,
    'beds-desc': (p) => number(p.bedrooms) === null ? null : -p.bedrooms,
    'media-desc': (p) => -p.media.length
  };

  const FILTER_SELECT_IDS = [
    'area', 'filter-viewed', 'filter-rent', 'filter-price',
    'filter-ceiling', 'filter-water', 'filter-double-height',
    'filter-pool', 'agent', 'beds'
  ];

  function activeFilterCount() {
    let count = 0;
    for (const id of FILTER_SELECT_IDS) {
      const node = $(id);
      if (node && node.value) count++;
    }
    if ($('with-comments').checked) count++;
    if ($('sort').value !== 'source') count++;
    return count;
  }

  function renderStatusTabs(base) {
    const tabs = $('status-tabs');
    tabs.replaceChildren();
    for (const [value, label] of statusTabs) {
      const count = base.filter((property) => matchesStatus(property, value)).length;
      if (value && value !== 'active' && !properties.some((property) => property.status === value)) continue;
      const button = el('button', `status-tab${value ? ` tab-${value}` : ''}`);
      button.type = 'button';
      button.setAttribute('aria-pressed', String(state.status === value));
      button.append(el('span', '', label), el('span', 'tab-count', String(count)));
      button.addEventListener('click', () => {
        state.status = value;
        if ($('status')) $('status').value = value;
        render();
      });
      tabs.append(button);
    }
  }

  function renderStats() {
    const stats = $('stats');
    if (!stats) return;
    stats.replaceChildren();
    const viewedCount = properties.filter((p) => getPropertyToggle(p).viewed).length;
    const rentCount = properties.filter((p) => getPropertyToggle(p).rent).length;
    const waterCount = properties.filter((p) => p.waterView === 'yes').length;
    const dhCount = properties.filter((p) => p.doubleHeight !== 'no').length;
    const items = [
      ['Объектов', String(properties.length)],
      ['✓ Смотрели', String(viewedCount)],
      ['★ Снимаем', String(rentCount)],
      ['Второй свет', String(dhCount)],
      ['У воды/озера', String(waterCount)]
    ];
    for (const [label, value] of items) {
      const row = el('div');
      row.append(el('dt', '', label), el('dd', '', value));
      stats.append(row);
    }
  }

  function syncUrl() {
    if (standalone) return;
    const params = new URLSearchParams();
    if ($('search').value.trim()) params.set('q', $('search').value.trim());
    if (state.status) params.set('status', state.status);
    for (const id of FILTER_SELECT_IDS) {
      if ($(id) && $(id).value) params.set(id, $(id).value);
    }
    if ($('sort').value !== 'source') params.set('sort', $('sort').value);
    if ($('with-comments').checked) params.set('comments', '1');
    if (state.view !== 'grid') params.set('view', state.view);
    const query = params.toString();
    const next = `${location.pathname}${query ? `?${query}` : ''}${location.hash}`;
    if (next !== `${location.pathname}${location.search}${location.hash}`) history.replaceState(history.state, '', next);
  }

  function readUrl() {
    const params = new URLSearchParams(location.search);
    $('search').value = params.get('q') || '';
    const status = params.get('status') || '';
    state.status = statusTabs.some(([value]) => value === status) ? status : '';
    if ($('status')) $('status').value = state.status;
    for (const id of [...FILTER_SELECT_IDS, 'sort']) {
      const node = $(id);
      const value = params.get(id);
      if (node && value && [...node.options].some((option) => option.value === value)) node.value = value;
    }
    $('with-comments').checked = params.get('comments') === '1';
    state.view = params.get('view') === 'list' ? 'list' : 'grid';
  }

  function render() {
    for (const id of [...FILTER_SELECT_IDS, 'status', 'sort']) {
      const node = $(id);
      if (node) node.classList.toggle('is-filtered', !!(node.value && node.value !== 'source'));
    }
    const base = baseFilter();
    const filtered = base.filter((property) => matchesStatus(property, state.status));
    const sortKey = sorters[$('sort').value];
    if (sortKey) filtered.sort((a, b) => {
      const x = sortKey(a);
      const y = sortKey(b);
      if (x === null && y === null) return a.index - b.index;
      if (x === null) return 1;
      if (y === null) return -1;
      return (x - y) || a.index - b.index;
    });
    visibleList = filtered;
    renderStatusTabs(base);
    renderStats();
    const grid = $('property-grid');
    grid.classList.toggle('is-list', state.view === 'list');
    grid.replaceChildren();
    for (const field of noteFields) if (!field.input.isConnected) noteFields.delete(field);
    for (const widget of toggleWidgets) if (!widget.root.isConnected) toggleWidgets.delete(widget);
    const fragment = document.createDocumentFragment();
    if (state.view === 'list' && filtered.length) fragment.append(listHeader());
    filtered.forEach((property, index) => fragment.append(state.view === 'list' ? listRow(property, index) : card(property, index)));
    grid.append(fragment);
    document.querySelectorAll('.view-toggle button').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.view === state.view)));
    const extra = activeFilterCount();
    $('filters-active').hidden = !extra;
    $('filters-active').textContent = String(extra);
    const filteredAny = !!($('search').value.trim() || state.status || extra);
    $('result-count').textContent = `${filtered.length} из ${properties.length}`;
    $('catalog-heading').textContent = filteredAny ? 'Результаты' : 'Все объекты';
    $('reset-filters').hidden = !filteredAny;
    $('empty-state').hidden = filtered.length !== 0;
    $('empty-title').textContent = properties.length ? 'По этим условиям ничего не найдено' : 'Предложения ещё не добавлены';
    $('empty-description').textContent = properties.length ? 'Попробуйте другой запрос или сбросьте фильтры. Архивные и отклонённые объекты тоже остаются в каталоге.' : 'Когда появятся данные, здесь будут все объекты, фотографии и точки на карте.';
    $('empty-reset').hidden = !properties.length;
    if ($('property-dialog').open) updateDialogNav();
    syncUrl();
  }

  function resetFilters() {
    $('filters').reset();
    state.status = '';
    if ($('status')) $('status').value = '';
    render();
  }

  function openFromHash(fromHistory) {
    let id = '';
    try { id = decodeURIComponent(location.hash.slice(1)); } catch {}
    const property = id && properties.find((item) => item.id === id);
    if (property) {
      if (currentDetail !== property || !$('property-dialog').open) openDetail(property, null, { fromHistory });
    } else if ($('property-dialog').open) {
      pushedHash = false;
      $('property-dialog').close();
    }
  }

  $('filters').addEventListener('submit', (event) => event.preventDefault());
  $('search').addEventListener('input', render);
  [...FILTER_SELECT_IDS, 'sort', 'with-comments'].forEach((id) => {
    const node = $(id);
    if (node) node.addEventListener('change', render);
  });
  if ($('status')) {
    $('status').addEventListener('change', () => {
      state.status = $('status').value;
      render();
    });
  }
  document.querySelectorAll('.view-toggle button').forEach((button) => button.addEventListener('click', () => { state.view = button.dataset.view; render(); }));
  $('filters-toggle').addEventListener('click', () => {
    const open = $('filters-toggle').getAttribute('aria-expanded') !== 'true';
    $('filters-toggle').setAttribute('aria-expanded', String(open));
    $('toolbar').classList.toggle('filters-open', open);
  });
  $('reset-filters').addEventListener('click', resetFilters);
  $('empty-reset').addEventListener('click', resetFilters);
  $('prev-property').addEventListener('click', () => stepDetail(-1));
  $('next-property').addEventListener('click', () => stepDetail(1));
  $('copy-link').addEventListener('click', async () => {
    if (!currentDetail) return;
    const url = propertyLink(currentDetail);
    try { await navigator.clipboard.writeText(url); notify('Ссылка на объект скопирована'); }
    catch { notify(`Ссылка: ${url}`); }
  });
  $('property-dialog').addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || galleryDialog) return;
    if (event.target.closest('input, textarea, select, video, [contenteditable]')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); stepDetail(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); stepDetail(1); }
  });
  $('close-dialog').addEventListener('click', () => $('property-dialog').close());
  $('property-dialog').addEventListener('close', () => {
    if (galleryDialog) galleryDialog.close();
    pauseVideos($('detail-content'));
    syncDialogScroll();
    $('detail-content').replaceChildren();
    currentDetail = null;
    for (const field of noteFields) if (!field.input.isConnected) noteFields.delete(field);
    for (const widget of toggleWidgets) if (!widget.root.isConnected) toggleWidgets.delete(widget);
    if (location.hash) {
      if (pushedHash) history.back();
      else history.replaceState(history.state, '', `${location.pathname}${location.search}`);
    }
    pushedHash = false;
    const target = lastOpener && lastOpener.isConnected ? lastOpener : null;
    if (target) target.focus({ preventScroll: true });
  });
  $('property-dialog').addEventListener('click', (event) => {
    if (event.target !== $('property-dialog')) return;
    const rect = $('property-dialog').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('property-dialog').close();
  });
  window.addEventListener('popstate', () => { pushedHash = false; openFromHash(true); });
  $('to-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }));
  let scrollFrame = 0;
  window.addEventListener('scroll', () => {
    if (scrollFrame) return;
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0;
      $('to-top').hidden = window.scrollY < 1200;
      $('toolbar').classList.toggle('is-stuck', $('toolbar').getBoundingClientRect().top <= 0.5 && window.scrollY > 0);
    });
  }, { passive: true });

  $('export-notes').addEventListener('click', () => {
    const payload = { version: 1, exportedAt: new Date().toISOString(), notes, sharedToggles };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = el('a');
    link.href = url;
    link.download = `villa-notes-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify('Файл заметок и переключателей подготовлен для скачивания.');
  });

  $('import-notes').addEventListener('click', () => $('notes-file').click());
  $('notes-file').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const button = $('import-notes');
    button.disabled = true;
    try {
      if (!file.size || file.size > MAX_BYTES) throw new Error('Выберите непустой JSON-файл размером не более 2 МБ.');
      let payload;
      try { payload = JSON.parse((await file.text()).replace(/^\uFEFF/, '')); }
      catch { throw new Error('Файл не удалось прочитать как JSON. Используйте файл, созданный через «Экспорт JSON».'); }
      const imported = validateNotes(payload);
      if (object(payload.sharedToggles) && mergeToggleMap(payload.sharedToggles)) {
        saveSharedToLocal();
        refreshToggleWidgets();
      }
      const merged = Object.assign(Object.create(null), notes);
      let added = 0;
      let conflicts = 0;
      for (const [id, value] of Object.entries(imported)) {
        if (!own(merged, id)) { merged[id] = value; added++; }
        else if (merged[id] !== value && !merged[id].includes(value)) {
          const combined = `${merged[id]}\n\n—— Импортированная заметка ——\n${value}`;
          if (combined.length > MAX_NOTE) throw new Error('После объединения один из комментариев превысит 20 000 символов. Импорт отменён; существующие заметки не изменены.');
          merged[id] = combined;
          conflicts++;
        }
      }
      commitNotes(merged);
      for (const [id, value] of Object.entries(merged)) {
        if (!isTestNote(value)) syncLocalNoteToShared(id, value, true);
      }
      notify(`Импорт завершён. Добавлено: ${added}; объединено: ${conflicts}.`);
    } catch (error) { notify(error.message || 'Не удалось импортировать заметки. Существующие записи не изменены.', true); }
    finally { event.target.value = ''; button.disabled = false; }
  });

  window.addEventListener('storage', (event) => {
    if ((event.key === SHARED_STORAGE_KEY || event.key === TOGGLES_STORAGE_KEY) && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (object(parsed)) {
          if (mergeSharedMap(parsed.sharedComments)) {
            refreshNoteFields();
            updateNotesCount();
          }
          if (mergeToggleMap(parsed.sharedToggles)) {
            refreshToggleWidgets();
          }
        }
      } catch {}
      return;
    }
    if ((event.key === STORAGE_KEY && event.newValue !== savedSnapshot) || event.key === null) {
      if (!savedToDevice) {
        pauseForStorageConflict();
        refreshNoteFields();
        return;
      }
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null && Object.keys(notes).length) {
          savedToDevice = false;
          storageWarning('Хранилище браузера очищено в другой вкладке. Ваши заметки пока доступны здесь: экспортируйте их до закрытия страницы.');
        } else {
          notes = raw ? validateNotes(JSON.parse(raw)) : Object.create(null);
          savedSnapshot = raw;
          storageReadable = true;
          savedToDevice = true;
          updateNotesCount();
        }
      } catch { pauseForStorageConflict(); }
      refreshNoteFields();
    }
  });
  window.addEventListener('beforeunload', (event) => {
    if (!savedToDevice && Object.keys(notes).length) {
      event.preventDefault();
      event.returnValue = '';
    }
  });

  const updatedDate = new Date(text(catalog.updatedAt));
  if (text(catalog.updatedAt) && Number.isFinite(updatedDate.getTime())) {
    $('updated-at').dateTime = updatedDate.toISOString();
    $('updated-at').textContent = ` · обновлено ${updatedDate.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Asia/Dubai' })}`;
    $('updated-at').hidden = false;
  }

  function initSharedState() {
    for (const prop of properties) {
      mergeToggleEntry(prop.id, {
        viewed: !!prop.viewedDefault,
        rent: !!prop.rentDefault,
        updatedAt: 1000,
        author: ''
      });
    }
    mergeSharedMap(INITIAL_SHARED_SEED);
    if (object(catalog.sharedComments)) mergeSharedMap(catalog.sharedComments);
    if (object(catalog.sharedToggles)) mergeToggleMap(catalog.sharedToggles);
    try {
      const savedClient = localStorage.getItem(CLIENT_STORAGE_KEY);
      if (validId(savedClient)) clientId = savedClient;
      else {
        clientId = `u_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
        localStorage.setItem(CLIENT_STORAGE_KEY, clientId);
      }
    } catch {
      clientId = `u_${Math.random().toString(36).slice(2, 10)}`;
    }
    try {
      const savedAuthor = localStorage.getItem(AUTHOR_STORAGE_KEY);
      if (typeof savedAuthor === 'string') authorName = savedAuthor.trim().slice(0, 40);
    } catch {}
    if ($('author-name')) {
      $('author-name').value = authorName;
      $('author-name').addEventListener('input', () => {
        authorName = $('author-name').value.trim().slice(0, 40);
        try { localStorage.setItem(AUTHOR_STORAGE_KEY, authorName); } catch {}
        for (const [propId, val] of Object.entries(notes)) {
          if (val && val.trim() && !isTestNote(val)) syncLocalNoteToShared(propId, val, false);
        }
      });
    }
    try {
      const rawShared = localStorage.getItem(SHARED_STORAGE_KEY);
      if (rawShared) {
        const parsed = JSON.parse(rawShared);
        if (object(parsed)) {
          mergeSharedMap(parsed.sharedComments);
          mergeToggleMap(parsed.sharedToggles);
        }
      }
    } catch {}
    try {
      const rawToggles = localStorage.getItem(TOGGLES_STORAGE_KEY);
      if (rawToggles) {
        const parsed = JSON.parse(rawToggles);
        if (object(parsed)) mergeToggleMap(parsed.sharedToggles);
      }
    } catch {}
  }

  function reconcileLocalNotesWithShared() {
    let anyChanged = false;
    for (const [propId, val] of Object.entries(notes)) {
      if (!validId(propId) || !val || !val.trim() || isTestNote(val)) continue;
      const trimmed = val.trim();
      const existingList = getVisibleSharedComments(propId);
      const matched = existingList.find((item) => item.text.trim() === trimmed);
      if (matched) {
        boundEntryIds[propId] = matched.id;
      } else {
        const entryId = getActiveEntryId(propId);
        if (mergeSharedEntry(propId, { id: entryId, author: currentAuthor(), text: trimmed, updatedAt: Date.now(), clientId, deleted: false })) {
          anyChanged = true;
          scheduleCloudPublish(propId, entryId, false);
        }
      }
    }
    if (anyChanged) saveSharedToLocal();
  }

  async function pullSharedFromCloud() {
    let cChanged = false;
    let tChanged = false;
    try {
      const resp = await fetch(CLOUD_OBJECT_URL, { cache: 'no-store' });
      if (resp.ok) {
        const payload = await resp.json();
        if (payload && object(payload.data)) {
          if (mergeSharedMap(payload.data.sharedComments)) cChanged = true;
          if (mergeToggleMap(payload.data.sharedToggles)) tChanged = true;
        }
      }
    } catch {}
    try {
      const resp = await fetch(`${CLOUD_STREAM_URL}/json?poll=1&since=all`, { cache: 'no-store' });
      if (resp.ok) {
        const rawLines = (await resp.text()).split('\n').filter(Boolean);
        for (const line of rawLines) {
          try {
            const evt = JSON.parse(line);
            if (evt && evt.event === 'message' && typeof evt.message === 'string') {
              const msg = JSON.parse(evt.message);
              if (msg && msg.type === 'comment' && validId(msg.propertyId) && mergeSharedEntry(msg.propertyId, msg.entry)) cChanged = true;
              else if (msg && msg.type === 'toggle' && validId(msg.propertyId) && mergeToggleEntry(msg.propertyId, msg.toggle)) tChanged = true;
              else if (msg && msg.type === 'snapshot') {
                if (mergeSharedMap(msg.sharedComments)) cChanged = true;
                if (mergeToggleMap(msg.sharedToggles)) tChanged = true;
              }
            }
          } catch {}
        }
      }
    } catch {}
    if (cChanged || tChanged) {
      saveSharedToLocal();
      if (cChanged) {
        refreshNoteFields();
        updateNotesCount();
      }
      if (tChanged) {
        refreshToggleWidgets();
        if ($('filter-viewed') && ($('filter-viewed').value || $('filter-rent').value)) render();
      }
    }
  }

  function startCloudSync() {
    if (typeof fetch !== 'function' || !/^https?:$/i.test(location.protocol)) {
      pullSharedFromCloud();
      return;
    }
    pullSharedFromCloud();
    if (typeof EventSource === 'function') {
      try {
        const es = new EventSource(`${CLOUD_STREAM_URL}/sse`);
        es.addEventListener('message', (event) => {
          try {
            const evt = JSON.parse(event.data);
            if (!evt || typeof evt.message !== 'string') return;
            const msg = JSON.parse(evt.message);
            let cChanged = false;
            let tChanged = false;
            if (msg && msg.type === 'comment' && validId(msg.propertyId)) cChanged = mergeSharedEntry(msg.propertyId, msg.entry);
            else if (msg && msg.type === 'toggle' && validId(msg.propertyId)) tChanged = mergeToggleEntry(msg.propertyId, msg.toggle);
            else if (msg && msg.type === 'snapshot') {
              cChanged = mergeSharedMap(msg.sharedComments);
              tChanged = mergeToggleMap(msg.sharedToggles);
            }
            if (cChanged || tChanged) {
              saveSharedToLocal();
              if (cChanged) {
                refreshNoteFields();
                updateNotesCount();
              }
              if (tChanged) {
                refreshToggleWidgets();
                if ($('filter-viewed') && ($('filter-viewed').value || $('filter-rent').value)) render();
              }
            }
          } catch {}
        });
      } catch {}
    }
    setInterval(() => {
      if (document.visibilityState !== 'hidden') pullSharedFromCloud();
    }, 25000);
  }

  initSharedState();
  readNotes();
  reconcileLocalNotesWithShared();
  updateNotesCount();
  renderStats();
  if (standalone) {
    document.body.classList.add('standalone');
    $('toolbar').hidden = true;
    $('catalog').hidden = true;
    $('standalone-detail').hidden = false;
    currentDetail = properties[0];
    buildDetail(properties[0], $('standalone-detail'));
  } else {
    readUrl();
    render();
    openFromHash(true);
  }
  startCloudSync();
})();
