const dialog = document.querySelector('#image-dialog');
const image = document.querySelector('#dialog-image');
const caption = document.querySelector('#dialog-caption');

document.querySelectorAll('[data-image]').forEach(button => {
  button.addEventListener('click', () => {
    image.src = button.dataset.image;
    image.alt = button.dataset.caption;
    caption.textContent = button.dataset.caption;
    dialog.showModal();
  });
});

document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.clientX < bounds.left || event.clientX > bounds.right ||
      event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
});
dialog.addEventListener('close', () => image.removeAttribute('src'));
document.querySelector('#print-button').addEventListener('click', () => window.print());
