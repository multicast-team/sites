/* Кривсуновы · v11: окна с видео и просмотр фото. Без библиотек; без JS страница читается, ссылки на фото открывают файл. */
(() => {
  'use strict';
  const doc = document;
  const rtl = getComputedStyle(doc.documentElement).direction === 'rtl';
  const numbers = new Intl.NumberFormat(doc.documentElement.lang || undefined);

  /* ——— видео: открываем кнопкой, постер подгружаем только при открытии, при закрытии ставим на паузу ——— */
  doc.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-open]');
    if (!opener) return;
    const dialog = doc.getElementById(opener.dataset.open);
    if (!(dialog instanceof HTMLDialogElement) || dialog.open) return;
    dialog.querySelectorAll('video[data-poster]').forEach((video) => {
      if (!video.poster) video.poster = video.dataset.poster;
    });
    dialog.showModal();
  });
  doc.querySelectorAll('dialog.vd').forEach((dialog) => {
    dialog.addEventListener('close', () => dialog.querySelectorAll('video').forEach((video) => video.pause()));
    dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });
  });

  /* ——— просмотр фото: стрелки, клавиши ←/→, свайп; в RTL направление зеркальное ——— */
  const box = doc.getElementById('lightbox');
  if (!(box instanceof HTMLDialogElement)) return;
  const stage = box.querySelector('.lb-stage');
  const image = stage.querySelector('img');
  const caption = box.querySelector('[data-lb-caption]');
  const counter = box.querySelector('[data-lb-count]');
  let items = [];
  let index = 0;

  const show = (next) => {
    index = (next + items.length) % items.length;
    const link = items[index];
    image.classList.add('is-loading');
    image.alt = link.dataset.alt || '';
    image.src = link.href;
    caption.textContent = link.dataset.caption || '';
    counter.textContent = `${numbers.format(index + 1)} / ${numbers.format(items.length)}`;
    [1, -1].forEach((step) => {
      const neighbour = items[(index + step + items.length) % items.length];
      if (neighbour && neighbour !== link) new Image().src = neighbour.href;
    });
  };
  image.addEventListener('load', () => image.classList.remove('is-loading'));
  image.addEventListener('error', () => image.classList.remove('is-loading'));

  doc.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-lightbox]');
    if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    items = [...doc.querySelectorAll(`a[data-lightbox="${link.dataset.lightbox}"]`)];
    box.showModal();
    show(items.indexOf(link));
  });

  box.querySelector('.lb-close').addEventListener('click', () => box.close());
  box.querySelector('.lb-prev').addEventListener('click', () => show(index - 1));
  box.querySelector('.lb-next').addEventListener('click', () => show(index + 1));
  stage.addEventListener('click', (event) => { if (event.target === stage) box.close(); });
  box.addEventListener('close', () => { image.removeAttribute('src'); items = []; });

  box.addEventListener('keydown', (event) => {
    const forward = rtl ? -1 : 1;
    if (event.key === 'ArrowRight') show(index + forward);
    else if (event.key === 'ArrowLeft') show(index - forward);
    else return;
    event.preventDefault();
  });

  let startX = null;
  let startY = 0;
  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse') return;
    startX = event.clientX;
    startY = event.clientY;
  });
  stage.addEventListener('pointerup', (event) => {
    if (startX === null) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    startX = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) show(index + (dx < 0 ? 1 : -1) * (rtl ? -1 : 1));
  });
  stage.addEventListener('pointercancel', () => { startX = null; });
})();
