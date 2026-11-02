(() => {
  'use strict';

  const STORAGE_KEY = 'dubai-villas.notes.v1';
  const SHARED_STORAGE_KEY = 'dubai-villas.shared.v1';
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

  function action(label, url, unavailable, primary = false) {
    return url ? externalLink(label, url, primary ? 'button' : 'button button-quiet') : el('span', 'disabled-link', unavailable);
  }

  function notify(message, error = false) {
    $('notification').textContent = message;
    $('notification').className = error ? 'notice notice-error' : 'notice';
    $('notification').hidden = false;
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
      storageWarning('Не удалось прочитать хранилище браузера. Его содержимое не перезаписывается. Новые заметки останутся в этой вкладке: сохраните их через «Экспорт заметок» до закрытия страницы.');
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
        storageWarning('Браузер не смог сохранить заметки на устройстве. Они доступны в этой вкладке. Экспортируйте JSON до закрытия страницы; также можно открыть каталог в браузере по HTTP.');
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

  function saveSharedToLocal() {
    try {
      localStorage.setItem(SHARED_STORAGE_KEY, JSON.stringify({ version: 1, sharedComments }));
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
      $('notes-count').textContent = `Общих комментариев: ${sharedTotal} · видны всем посетителям`;
    } else {
      $('notes-count').textContent = 'Все комментарии автоматически сохраняются и видны всем';
    }
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
      let remoteMap = Object.create(null);
      try {
        const getResp = await fetch(CLOUD_OBJECT_URL, { cache: 'no-store' });
        if (getResp.ok) {
          const currentObj = await getResp.json();
          if (currentObj && object(currentObj.data) && object(currentObj.data.sharedComments)) {
            remoteMap = currentObj.data.sharedComments;
          }
        }
      } catch {}
      if (mergeSharedMap(remoteMap)) {
        saveSharedToLocal();
        refreshNoteFields();
        updateNotesCount();
      }
      await fetch(CLOUD_OBJECT_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'dubai-villas-shared-comments-v1',
          data: { version: 1, updatedAt: Date.now(), sharedComments }
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
      cover,
      images: pictures,
      videos,
      media: [...videos, ...pictures.map((picture) => ({ ...picture, type: 'image' }))],
      documents: (Array.isArray(item.documents) ? item.documents : []).filter(object).map((doc) => ({href: documentUrl(doc.href), label: text(doc.label) || 'PDF с фотографиями'})).filter((doc) => doc.href),
      description: text(item.description),
      facts: strings(item.facts),
      caveats: strings(item.caveats),
      missing: strings(item.missing),
      listingUrl: safeUrl(item.listingUrl),
      detailPage: /^properties\/[a-z0-9_-]+\.html$/i.test(text(item.detailPage)) ? text(item.detailPage) : '',
      mapUrl: safeUrl(item.mapUrl),
      locationLabel: text(item.locationLabel),
      agentPhone: text(item.agentPhone),
      search: [item.title, item.area, item.agent, item.agentPhone, item.statusLabel, item.description, item.locationLabel, item.ceiling, item.listingUrl, ...strings(item.facts), ...strings(item.caveats)].filter((value) => typeof value === 'string').join(' ').toLocaleLowerCase('ru-RU')
    };
  });

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
    const p = el('p', 'card-agent');
    p.append(el('span', 'agent-name', `Риэлтор: ${property.agent || 'Не указан'}`));
    p.append(document.createTextNode(' · '));
    const wa = whatsappUrl(property.agentPhone);
    if (wa) {
      const link = externalLink(`WhatsApp ${formatPhone(property.agentPhone)} ↗`, wa, 'inline-ext-link wa-link');
      p.append(link);
    } else if (property.agent === 'Артур') {
      p.append(el('span', 'wa-group-tag', 'WhatsApp: группа с Артуром · TG @Art_Real_Estate'));
    } else {
      p.append(el('span', 'wa-missing-tag', 'WhatsApp не сохранён'));
    }
    return p;
  }

  function sourceOriginLine(property) {
    const p = el('p', 'card-source');
    if (property.listingUrl) {
      const site = sourceSiteName(property.listingUrl);
      p.append(el('span', 'source-label', 'Откуда взят: '));
      p.append(externalLink(`Сайт ${site} ↗`, property.listingUrl, 'inline-ext-link source-site-link'));
    } else {
      p.append(el('span', 'source-no-link', noLinkSourceLabel(property)));
    }
    return p;
  }

  function badges(property) {
    const group = el('div', 'badges');
    const label = property.status === 'rejected' && !/отказ/i.test(property.statusLabel) ? `Отказано · ${property.statusLabel}` : property.statusLabel;
    group.append(el('span', `badge status-${property.status}`, label), el('span', 'badge type-badge', types[property.type]));
    return group;
  }

  function priceBlock(property, detail = false) {
    const block = el('div', detail ? 'detail-price' : 'price-block');
    const label = property.priceLabel || (property.price !== null ? `${format.format(property.price)} AED` : 'Цена не указана');
    block.append(el('p', property.price === null && !property.priceLabel ? 'price price-unknown' : 'price', label));
    if (property.priceNote) block.append(el('p', 'price-note', property.priceNote));
    return block;
  }

  function precision(property) {
    if (!property.mapUrl) return 'Местоположение на карте не указано';
    const labels = { exact: 'Точка: точный объект', entrance: 'Точка: въезд, не точный дом', area: 'Точка: район, не точный дом' };
    return own(labels, property.mapPrecision) ? labels[property.mapPrecision] : 'Точность точки не подтверждена';
  }

  function specifications(property) {
    const items = [];
    const bedrooms = number(property.bedrooms);
    const bathrooms = number(property.bathrooms);
    const plot = number(property.plotM2);
    const bua = number(property.buaM2);
    if (bedrooms !== null) items.push(`Спален: ${format.format(bedrooms)}`);
    if (bathrooms !== null) items.push(`Санузлов: ${format.format(bathrooms)}`);
    if (plot !== null) items.push(`Участок ${format.format(plot)} м²`);
    if (bua !== null) items.push(`Дом ${format.format(bua)} м²`);
    if (text(property.ceiling)) items.push(`Потолки: ${text(property.ceiling)}`);
    const list = el('ul', 'specs');
    for (const value of items.length ? items : ['Характеристики пока не указаны']) list.append(el('li', '', value));
    return list;
  }

  function openButton(label, property, className) {
    const button = el('button', className, label);
    button.type = 'button';
    button.addEventListener('click', () => openDetail(property, button));
    return button;
  }

  function card(property, index) {
    const article = el('article', 'property-card');
    const cover = el('button', 'cover-button');
    cover.type = 'button';
    cover.setAttribute('aria-label', property.media.length ? `Открыть галерею: ${property.title}. Видео: ${property.videos.length}, фото: ${property.images.length}` : `Подробнее: ${property.title}`);
    cover.setAttribute('aria-haspopup', 'dialog');
    cover.addEventListener('click', () => property.media.length ? openGallery(property, 0, cover) : openDetail(property, cover));
    cover.append(property.media.length ? mediaPreview(property.media[0], property.title, index < 3) : media('', property.title), el('span', 'cover-action', property.media.length ? `${property.videos.length ? '▶ Видео' : 'Фото'} · ${property.media.length} материалов` : 'Подробнее ↗'));
    const main = el('div', 'card-main');
    const title = el('h3', 'card-title');
    title.append(openButton(property.title, property, 'title-button'));
    main.append(badges(property), priceBlock(property), title, el('p', 'card-area', property.area || 'Район не указан'), agentContactLine(property), sourceOriginLine(property), specifications(property));
    main.append(el('p', 'description card-description', property.description || 'Описание пока не предоставлено.'));
    if (property.caveats.length) main.append(el('p', 'caveat', property.caveats[0] + (property.caveats.length > 1 ? ` · Ещё замечаний: ${property.caveats.length - 1} — в карточке` : '')));
    const actions = el('div', 'card-actions');
    const siteBtnLabel = property.listingUrl ? `Сайт (${sourceSiteName(property.listingUrl)}) ↗` : 'Ссылки нет · Фото/видео';
    actions.append(property.listingUrl ? action(siteBtnLabel, property.listingUrl, '', true) : openButton(siteBtnLabel, property, 'button'), action('На карте ↗', property.mapUrl, 'Нет точки на карте'));
    if (property.documents.length) actions.append(externalLink('PDF ↗', property.documents[0].href));
    if (property.detailPage) { const link = externalLink('Страница объекта →', property.detailPage); link.target = '_self'; actions.append(link); }
    main.append(actions, el('p', 'map-precision', precision(property)));
    article.append(cover, main, noteBlock(property));
    return article;
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

  function openDetail(property, opener) {
    lastOpener = opener;
    const content = $('detail-content');
    content.replaceChildren();
    const title = el('h2', 'detail-title', property.title);
    title.id = 'detail-title';
    content.append(badges(property), title, el('p', 'detail-location', property.area || 'Район не указан'), priceBlock(property, true));
    const actions = el('div', 'detail-actions');
    const wa = whatsappUrl(property.agentPhone);
    const siteLabel = property.listingUrl ? `Сайт (${sourceSiteName(property.listingUrl)}) ↗` : '';
    actions.append(action(siteLabel || 'Фото и описание ↗', property.listingUrl, noLinkSourceLabel(property), true), action('На карте ↗', property.mapUrl, 'Точка на карте не предоставлена'));
    if (wa) actions.append(externalLink(`WhatsApp: ${formatPhone(property.agentPhone)} ↗`, wa, 'button button-quiet'));
    property.documents.forEach((doc) => actions.append(externalLink(doc.label + ' ↗', doc.href)));
    if (property.detailPage) { const link = externalLink('Отдельная страница →', property.detailPage); link.target = '_self'; actions.append(link); }
    content.append(actions, el('p', 'map-precision', [property.locationLabel, precision(property)].filter(Boolean).join(' · ')));
    const gallery = el('div', 'gallery');
    gallery.setAttribute('role', 'group');
    gallery.setAttribute('aria-label', 'Все видео и фотографии объекта');
    if (!property.media.length) gallery.append(media('', '', true));
    property.media.forEach((item, index) => {
      const figure = el('figure');
      const button = el('button', 'gallery-open');
      button.type = 'button';
      button.setAttribute('aria-haspopup', 'dialog');
      const label = `${item.type === 'video' ? 'Видео' : 'Фото'} · ${index + 1} из ${property.media.length}`;
      button.setAttribute('aria-label', `Открыть ${label}: ${item.caption || property.title}`);
      button.append(mediaPreview(item, item.caption || property.title, index === 0));
      button.addEventListener('click', () => openGallery(property, index, button));
      figure.append(button, el('figcaption', '', item.caption ? `${label} · ${item.caption}` : label));
      gallery.append(figure);
    });
    content.append(gallery);
    const facts = el('dl', 'detail-facts');
    const rows = [
      ['Район', property.area || 'Не указан'], ['Агент', property.agent || 'Не указан'],
      ['WhatsApp риэлтора', wa ? externalLink(`${formatPhone(property.agentPhone)} ↗`, wa, 'inline-ext-link wa-link') : (property.agent === 'Артур' ? 'Группа в WhatsApp с Артуром · TG @Art_Real_Estate' : 'Не указан')],
      ['Откуда взят объект', property.listingUrl ? externalLink(`${sourceSiteName(property.listingUrl)} (${property.listingUrl}) ↗`, property.listingUrl, 'inline-ext-link source-site-link') : noLinkSourceLabel(property)],
      ['Тип объекта', types[property.type]],
      ['Спальни', number(property.bedrooms) === null ? 'Не указано' : format.format(property.bedrooms)],
      ['Санузлы', number(property.bathrooms) === null ? 'Не указано' : format.format(property.bathrooms)],
      ['Площадь участка', number(property.plotM2) === null ? 'Не указана' : `${format.format(property.plotM2)} м²`],
      ['Площадь дома', number(property.buaM2) === null ? 'Не указана' : `${format.format(property.buaM2)} м²`],
      ['Потолки', text(property.ceiling) || 'Не указаны'], ['Статус', property.statusLabel]
    ];
    for (const [label, value] of rows) {
      const row = el('div');
      const dd = el('dd');
      if (value instanceof Node) dd.append(value);
      else dd.textContent = value;
      row.append(el('dt', '', label), dd);
      facts.append(row);
    }
    content.append(facts);
    const description = el('section', 'detail-section');
    description.append(el('h3', '', 'Описание'), el('p', 'description', property.description || 'Описание пока не предоставлено.'));
    content.append(description);
    detailSection(content, 'Что известно', property.facts);
    detailSection(content, 'Обратить внимание', property.caveats);
    detailSection(content, 'Что ещё нужно уточнить', property.missing);
    if (text(property.requestState)) detailSection(content, 'Уточнения у агента', [text(property.requestState)]);
    if (strings(property.possibleDuplicateIds).length) detailSection(content, 'Проверка предложения', ['Возможно, этот же объект есть в подборке повторно. Совпадение ещё не подтверждено.']);
    if (text(property.sourceNote)) detailSection(content, 'Примечание к источнику', [text(property.sourceNote)]);
    content.append(noteBlock(property));
    $('property-dialog').showModal();
    $('property-dialog').scrollTop = 0;
    document.body.classList.add('dialog-open');
    $('close-dialog').focus({ preventScroll: true });
  }

  function fillFilter(id, field, allLabel) {
    const values = [...new Set(properties.map((property) => property[field]))].sort((a, b) => a.localeCompare(b, 'ru'));
    const select = $(id);
    select.replaceChildren(new Option(allLabel, ''));
    values.forEach((value, index) => select.add(new Option(value || (field === 'area' ? 'Район не указан' : 'Агент не указан'), String(index))));
    return values;
  }

  const areas = fillFilter('area', 'area', 'Все районы');
  const agents = fillFilter('agent', 'agent', 'Все агенты');

  function render() {
    const query = $('search').value.trim().toLocaleLowerCase('ru-RU').split(/\s+/).filter(Boolean);
    const filtered = properties.filter((property) => query.every((word) => property.search.includes(word)) &&
      ($('area').value === '' || property.area === areas[Number($('area').value)]) &&
      ($('agent').value === '' || property.agent === agents[Number($('agent').value)]) &&
      (!$('status').value || property.status === $('status').value));
    const sort = $('sort').value;
    if (sort !== 'source') filtered.sort((a, b) => {
      if (a.price === null && b.price === null) return a.index - b.index;
      if (a.price === null) return 1;
      if (b.price === null) return -1;
      return (sort === 'price-asc' ? a.price - b.price : b.price - a.price) || a.index - b.index;
    });
    $('property-grid').replaceChildren();
    for (const field of noteFields) if (!field.input.isConnected) noteFields.delete(field);
    const fragment = document.createDocumentFragment();
    filtered.forEach((property, index) => fragment.append(card(property, index)));
    $('property-grid').append(fragment);
    $('result-count').textContent = `Показано ${filtered.length} из ${properties.length}`;
    $('catalog-heading').textContent = $('search').value.trim() || $('area').value || $('agent').value || $('status').value ? 'Результаты поиска' : 'Все объекты';
    $('empty-state').hidden = filtered.length !== 0;
    $('empty-title').textContent = properties.length ? 'По этим условиям ничего не найдено' : 'Предложения ещё не добавлены';
    $('empty-description').textContent = properties.length ? 'Попробуйте другой запрос или сбросьте фильтры. Все объекты, включая архивные и отказанные, остаются в каталоге.' : 'Когда появятся данные, здесь будут все объекты, фотографии и точки на карте.';
    $('empty-reset').hidden = !properties.length;
  }

  function resetFilters() {
    $('filters').reset();
    render();
  }

  $('filters').addEventListener('submit', (event) => event.preventDefault());
  $('search').addEventListener('input', render);
  ['area', 'agent', 'status', 'sort'].forEach((id) => $(id).addEventListener('change', render));
  $('reset-filters').addEventListener('click', resetFilters);
  $('empty-reset').addEventListener('click', resetFilters);
  $('close-dialog').addEventListener('click', () => $('property-dialog').close());
  $('property-dialog').addEventListener('close', () => {
    if (galleryDialog) galleryDialog.close();
    pauseVideos($('detail-content'));
    syncDialogScroll();
    $('detail-content').replaceChildren();
    for (const field of noteFields) if (!field.input.isConnected) noteFields.delete(field);
    if (lastOpener && lastOpener.isConnected) lastOpener.focus({ preventScroll: true });
  });
  $('property-dialog').addEventListener('click', (event) => {
    if (event.target !== $('property-dialog')) return;
    const rect = $('property-dialog').getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('property-dialog').close();
  });

  $('export-notes').addEventListener('click', () => {
    const payload = { version: 1, exportedAt: new Date().toISOString(), notes };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
    const link = el('a');
    link.href = url;
    link.download = `villa-notes-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify('Файл заметок подготовлен для скачивания. Он содержит только ваши комментарии; сохраните его в надёжном месте.');
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
      catch { throw new Error('Файл не удалось прочитать как JSON. Используйте файл, созданный через «Экспорт заметок».'); }
      const imported = validateNotes(payload);
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
      notify(`Импорт завершён. Добавлено: ${added}; объединено: ${conflicts}. При совпадении объекта оба текста сохранены вместе.${savedToDevice ? '' : ' Сохраните объединённые заметки экспортом: запись на устройство недоступна.'}`);
    } catch (error) { notify(error.message || 'Не удалось импортировать заметки. Существующие записи не изменены.', true); }
    finally { event.target.value = ''; button.disabled = false; }
  });

  window.addEventListener('storage', (event) => {
    if (event.key === SHARED_STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (object(parsed) && mergeSharedMap(parsed.sharedComments)) {
          refreshNoteFields();
          updateNotesCount();
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

  const updated = text(catalog.updatedAt);
  if (/^\d{4}-\d{2}-\d{2}$/.test(updated)) {
    const date = new Date(`${updated}T00:00:00Z`);
    if (Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === updated) {
      $('updated-at').dateTime = updated;
      $('updated-at').textContent = `Обновлено ${date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`;
      $('updated-at').hidden = false;
    }
  }
  function initSharedComments() {
    mergeSharedMap(INITIAL_SHARED_SEED);
    if (object(catalog.sharedComments)) mergeSharedMap(catalog.sharedComments);
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
        if (object(parsed)) mergeSharedMap(parsed.sharedComments);
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
    let changed = false;
    try {
      const resp = await fetch(CLOUD_OBJECT_URL, { cache: 'no-store' });
      if (resp.ok) {
        const payload = await resp.json();
        if (payload && object(payload.data) && mergeSharedMap(payload.data.sharedComments)) changed = true;
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
              if (msg && msg.type === 'comment' && validId(msg.propertyId) && mergeSharedEntry(msg.propertyId, msg.entry)) changed = true;
              else if (msg && msg.type === 'snapshot' && mergeSharedMap(msg.sharedComments)) changed = true;
            }
          } catch {}
        }
      }
    } catch {}
    if (changed) {
      saveSharedToLocal();
      refreshNoteFields();
      updateNotesCount();
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
            let changed = false;
            if (msg && msg.type === 'comment' && validId(msg.propertyId)) changed = mergeSharedEntry(msg.propertyId, msg.entry);
            else if (msg && msg.type === 'snapshot') changed = mergeSharedMap(msg.sharedComments);
            if (changed) {
              saveSharedToLocal();
              refreshNoteFields();
              updateNotesCount();
            }
          } catch {}
        });
      } catch {}
    }
    setInterval(() => {
      if (document.visibilityState !== 'hidden') pullSharedFromCloud();
    }, 25000);
  }

  initSharedComments();
  readNotes();
  reconcileLocalNotesWithShared();
  updateNotesCount();
  render();
  startCloudSync();
})();
