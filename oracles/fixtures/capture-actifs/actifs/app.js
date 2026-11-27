const bouton = document.querySelector('.theme-toggle');
const appliquer = (t) => {
  document.documentElement.setAttribute('data-theme', t);
  bouton.setAttribute('aria-pressed', String(t === 'dark'));
  localStorage.setItem('theme', t);
};
appliquer(localStorage.getItem('theme') || document.documentElement.getAttribute('data-theme') || 'light');
bouton.addEventListener('click', () => {
  appliquer(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
});
  