/* CLP calculator — mobile behaviour layer.
 * Appended by mobile/build.js after the shared calculator script. It only adds
 * navigation and offline support: it reads the latest result (`last`) but never
 * changes calculations, inputs or saved formulations.
 */
(function () {
  'use strict';
  var TABS = [
    { id: 'mixture-card', label: 'Mixture', icon: '<path d="M9 3h6M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3"/><path d="M7.5 14h9"/>' },
    { id: 'ingredients-card', label: 'Ingredients', icon: '<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>' },
    { id: 'p28settings', label: 'Label', icon: '<path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/>' },
    { id: 'results', label: 'Results', icon: '<path d="M12 3l9 9-9 9-9-9z"/><path d="M12 8v5M12 16v.01"/>' }
  ];

  function el(id) { return document.getElementById(id); }

  function buildTabBar() {
    var nav = document.createElement('nav');
    nav.className = 'm-tabbar noprint';
    nav.setAttribute('aria-label', 'Calculator sections');
    TABS.forEach(function (tab) {
      if (!el(tab.id)) return;
      var a = document.createElement('a');
      a.href = '#' + tab.id;
      a.dataset.target = tab.id;
      a.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + tab.icon + '</svg><span>' + tab.label + '</span>' +
        (tab.id === 'results' ? '<span class="m-badge" id="m-result-badge" aria-live="polite"></span>' : '');
      a.addEventListener('click', function (event) {
        event.preventDefault();
        var target = el(tab.id);
        if (target.tagName === 'DETAILS') target.open = true;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setCurrent(tab.id);
      });
      nav.appendChild(a);
    });
    document.body.appendChild(nav);
    return nav;
  }

  var nav = buildTabBar();

  function setCurrent(id) {
    nav.querySelectorAll('a').forEach(function (a) {
      a.setAttribute('aria-current', a.dataset.target === id ? 'true' : 'false');
    });
  }

  // Highlight the section that occupies the middle of the screen.
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { if (entry.isIntersecting) setCurrent(entry.target.id); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    TABS.forEach(function (tab) { if (el(tab.id)) observer.observe(el(tab.id)); });
  }
  setCurrent(TABS[0].id);

  // Results badge: number of classifications, coloured by signal word (red =
  // Danger, orange = Warning), plus a dot when input warnings exist.
  // `last` is the calculator's latest classify() result (a shared global).
  function refreshBadge() {
    var badge = el('m-result-badge');
    if (!badge) return;
    var result = typeof last !== 'undefined' ? last : null;
    if (!result) { badge.textContent = ''; return; }
    var signal = (result.label && result.label.signal) || '';
    var count = (result.outcomes || []).length;
    var warnings = (result.warnings || []).length;
    badge.textContent = String(count);
    badge.dataset.signal = signal;
    badge.dataset.warnings = String(warnings > 0);
    var summary = count + ' classification' + (count === 1 ? '' : 's') + (signal ? ', signal word ' + signal : ', no signal word') +
      (warnings ? ', ' + warnings + ' input warning' + (warnings === 1 ? '' : 's') : '');
    badge.title = summary;
    badge.setAttribute('aria-label', summary);
  }
  var results = el('res');
  if (results && 'MutationObserver' in window) new MutationObserver(refreshBadge).observe(results, { childList: true });
  refreshBadge();

  // Offline support when served over HTTPS (or localhost). Opening the file
  // directly from the device also works offline; service workers need http(s).
  var secure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  if ('serviceWorker' in navigator && secure) {
    navigator.serviceWorker.register('sw.js').catch(function () { /* offline cache unavailable */ });
  }
})();
