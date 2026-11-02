(() => {
  'use strict';

  const STORAGE_KEY = 'dubai-villas.notes.v1';
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
  let notes = Object.create(null);
  let storageReadable = true;
  let savedToDevice = true;
  let savedSnapshot = null;
  let noteSequence = 0;
  let lastOpener = null;
  let galleryDialog = null;
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

  function updateNotesCount() {
    const count = Object.keys(notes).length;
    $('notes-count').textContent = count ? `Заметок: ${count} · резервная копия в JSON` : 'Перенос и резервная копия — через JSON';
  }

  function refreshNoteFields() {
    for (const field of noteFields) {
      if (!field.input.isConnected) { noteFields.delete(field); continue; }
      const value = notes[field.id] || '';
      if (field.input.value !== value) field.input.value = value;
      field.block.classList.toggle('has-note', !!value.trim());
      field.badge.hidden = !value.trim();
      field.status.textContent = savedToDevice ? 'Сохранено на устройстве' : 'Не сохранено · экспортируйте JSON';
      field.status.classList.toggle('error', !savedToDevice);
    }
  }

  function noteBlock(property) {
    const block = el('div', 'notes-block');
    const heading = el('div', 'note-heading');
    const label = el('label', '', 'Ваш комментарий');
    const badge = el('span', 'note-badge', 'Есть заметка');
    badge.hidden = true;
    label.append(badge);
    const input = el('textarea');
    const status = el('span', 'note-status');
    const inputId = `note-${++noteSequence}`;
    label.htmlFor = inputId;
    input.id = inputId;
    input.maxLength = MAX_NOTE;
    input.rows = 4;
    input.placeholder = 'Напишите, что нравится в этой вилле и что хотите уточнить…';
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
      block.classList.toggle('has-note', !!input.value.trim());
      badge.hidden = !input.value.trim();
      status.textContent = !savedToDevice ? 'Не сохранено · экспортируйте JSON' : input.value ? 'Сохранено на устройстве' : 'Сохраняется автоматически';
      status.classList.toggle('error', !savedToDevice);
      noteFields.add({ id: property.noteId, input, status, block, badge });
      input.addEventListener('input', () => {
        const next = Object.assign(Object.create(null), notes);
        if (input.value.trim()) next[property.noteId] = input.value;
        else delete next[property.noteId];
        try { commitNotes(next); }
        catch (error) {
          input.value = notes[property.noteId] || '';
          status.textContent = 'Изменение не сохранено: лимит объёма';
          status.classList.add('error');
          notify(error.message, true);
        }
      });
    }
    heading.append(label, status);
    block.append(heading, input);
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
      search: [item.title, item.area, item.agent, item.statusLabel, item.description, item.locationLabel, item.ceiling, ...strings(item.facts), ...strings(item.caveats)].filter((value) => typeof value === 'string').join(' ').toLocaleLowerCase('ru-RU')
    };
  });

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
    main.append(badges(property), priceBlock(property), title, el('p', 'card-area', property.area || 'Район не указан'), el('p', 'card-agent', property.agent ? `Агент: ${property.agent}` : 'Агент не указан'), specifications(property));
    main.append(el('p', 'description card-description', property.description || 'Описание пока не предоставлено.'));
    if (property.caveats.length) main.append(el('p', 'caveat', property.caveats[0] + (property.caveats.length > 1 ? ` · Ещё замечаний: ${property.caveats.length - 1} — в карточке` : '')));
    const actions = el('div', 'card-actions');
    actions.append(property.listingUrl ? action('Фото и описание ↗', property.listingUrl, '', true) : openButton('Материалы и описание', property, 'button'), action('На карте ↗', property.mapUrl, 'Нет точки на карте'));
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
    actions.append(action('Фото и описание ↗', property.listingUrl, 'Ссылка на описание не предоставлена', true), action('На карте ↗', property.mapUrl, 'Точка на карте не предоставлена'));
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
      ['Телефон агента', text(property.agentPhone) || 'Не указан'], ['Тип объекта', types[property.type]],
      ['Спальни', number(property.bedrooms) === null ? 'Не указано' : format.format(property.bedrooms)],
      ['Санузлы', number(property.bathrooms) === null ? 'Не указано' : format.format(property.bathrooms)],
      ['Площадь участка', number(property.plotM2) === null ? 'Не указана' : `${format.format(property.plotM2)} м²`],
      ['Площадь дома', number(property.buaM2) === null ? 'Не указана' : `${format.format(property.buaM2)} м²`],
      ['Потолки', text(property.ceiling) || 'Не указаны'], ['Статус', property.statusLabel]
    ];
    for (const [label, value] of rows) {
      const row = el('div');
      row.append(el('dt', '', label), el('dd', '', value));
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
      notify(`Импорт завершён. Добавлено: ${added}; объединено: ${conflicts}. При совпадении объекта оба текста сохранены вместе.${savedToDevice ? '' : ' Сохраните объединённые заметки экспортом: запись на устройство недоступна.'}`);
    } catch (error) { notify(error.message || 'Не удалось импортировать заметки. Существующие записи не изменены.', true); }
    finally { event.target.value = ''; button.disabled = false; }
  });

  window.addEventListener('storage', (event) => {
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
  readNotes();
  render();
})();
