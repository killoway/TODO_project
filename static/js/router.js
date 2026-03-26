/* router.js */
const Router = (() => {
  const PAGES = {
    today:     TodayPage,
    calendar:  CalendarPage,
    analytics: AnalyticsPage,
    focus:     FocusPage,
  };

  let currentPage = null;
  let currentKey  = null;

  function route() {
    const key  = window.location.hash.slice(1) || 'today';
    const Page = PAGES[key];
    if (!Page || key === currentKey) return;

    if (currentPage) currentPage.unmount();
    currentPage = Page;
    currentKey  = key;

    document.querySelectorAll('.nav-link').forEach(el =>
      el.classList.toggle('active', el.dataset.page === key));

    const wrap = document.getElementById('page-wrap');
    wrap.innerHTML = '';
    Page.mount(wrap);
  }

  function navigate(key) {
    window.location.hash = key;
  }

  function init() {
    window.addEventListener('hashchange', route);
    route();
    document.querySelectorAll('.nav-link').forEach(el =>
      el.addEventListener('click', () => navigate(el.dataset.page)));
  }

  return { init, navigate };
})();