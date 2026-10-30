// Ссылки на сноски раскрывают каталог и сохраняют обычную навигацию по якорю.
const catalog = document.querySelector('.source-catalog');

function revealSource(hash) {
  if (catalog && hash.startsWith('#source-')) catalog.open = true;
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#source-"]');
  if (link) revealSource(link.hash);
});

window.addEventListener('hashchange', () => revealSource(window.location.hash));
revealSource(window.location.hash);
