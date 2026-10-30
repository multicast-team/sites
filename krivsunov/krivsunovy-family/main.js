document.addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-open]');
  if (!trigger) return;
  const dialog = document.getElementById(trigger.dataset.open);
  if (dialog instanceof HTMLDialogElement && !dialog.open) dialog.showModal();
});

document.querySelectorAll('dialog').forEach((dialog) => {
  dialog.addEventListener('close', () => {
    if (!dialog.open) dialog.querySelectorAll('video').forEach((video) => video.pause());
  });
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
});
