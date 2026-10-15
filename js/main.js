// Docking header: as the page scrolls, the profile picture shrinks and
// glides into a compact bar at the top-left. The name and the tagline fade
// in next to it once their original lines have been scrolled past.
// Everything returns to its original state when scrolling back up.
(function () {
  var slot = document.querySelector('.avatar-slot');
  var link = slot && slot.querySelector('.avatar-link');
  var name = document.querySelector('.header-name');
  var tagline = document.querySelector('.tagline');
  if (!link || !name) return;

  var root = document.documentElement;
  root.classList.add('js-dock');

  var dockName = document.createElement('div');
  dockName.className = 'dock-name no-print';
  dockName.setAttribute('aria-hidden', 'true');
  dockName.textContent = name.textContent;
  document.body.appendChild(dockName);

  var dockTagline = null;
  if (tagline) {
    dockTagline = document.createElement('div');
    dockTagline.className = 'dock-tagline no-print';
    dockTagline.setAttribute('aria-hidden', 'true');
    dockTagline.innerHTML = tagline.innerHTML;
    // The docked copy is a short single line: drop the parts marked
    // .tagline-extra and any manual line breaks.
    dockTagline.querySelectorAll('.tagline-extra').forEach(function (el) { el.remove(); });
    dockTagline.querySelectorAll('br').forEach(function (br) { br.replaceWith(' '); });
    document.body.appendChild(dockTagline);
  }

  var wide = window.matchMedia('(min-width: 700px)');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var ticking = false;
  var docked = false;

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(t) { return Math.min(1, Math.max(0, t)); }
  function ease(t) { return t * t * (3 - 2 * t); } // smoothstep

  function layout() {
    // Docked geometry of the top bar, in px.
    return wide.matches
      ? { bar: 76, left: 24, top: 12, size: 52, gap: 14, nameSize: 22, tagSize: 13, tagGap: 5 }
      : { bar: 64, left: 16, top: 10, size: 44, gap: 12, nameSize: 18, tagSize: 11, tagGap: 4 };
  }

  // Scroll distance over which the avatar docks at `endTop` with `endSize`:
  // it completes where the avatar, scrolling normally, would have arrived.
  function dockDistance(rect, endTop, endSize) {
    var docTop = rect.top + window.scrollY;
    return Math.max(1, docTop + rect.height - endTop - endSize);
  }

  // Fade-in progress (0..1) for an element once it has passed under the bar.
  function passed(el, bar) {
    return ease(clamp01((bar - el.getBoundingClientRect().bottom) / 40));
  }

  function place(el, x, y, scale) {
    el.style.transform =
      'translate3d(' + x + 'px,' + y + 'px,0) scale(' + scale + ')';
  }

  function update() {
    ticking = false;
    var L = layout();

    var n = passed(name, L.bar);
    var t = dockTagline ? passed(tagline, L.bar) : 0;

    // Docked name sits centred on the avatar, and moves up to make room
    // for the tagline as it appears.
    var tagLineHeight = Math.round(L.tagSize * 1.3);
    var centredTop = L.top + (L.size - L.nameSize) / 2;
    var raisedTop = L.top + (L.size - L.nameSize - L.tagGap - tagLineHeight) / 2;
    var nameEndTop = lerp(centredTop, raisedTop, t);
    var nameEndLeft = L.left + L.size + L.gap;

    // --- Avatar
    var rect = slot.getBoundingClientRect();
    var size = rect.width;
    var p = ease(clamp01(window.scrollY / dockDistance(rect, L.top, L.size)));
    link.style.width = size + 'px';
    link.style.height = size + 'px';
    place(link,
      lerp(rect.left, L.left, p),
      lerp(Math.max(rect.top, L.top), L.top, p),
      lerp(1, L.size / size, p));

    // --- Name
    dockName.style.fontSize = L.nameSize + 'px';
    dockName.style.opacity = n.toFixed(3);
    place(dockName, nameEndLeft, nameEndTop + (1 - n) * 6, 1);

    // --- Tagline
    if (dockTagline) {
      dockTagline.style.fontSize = L.tagSize + 'px';
      dockTagline.style.maxWidth = (window.innerWidth - nameEndLeft - 16) + 'px';
      dockTagline.style.opacity = t.toFixed(3);
      place(dockTagline, nameEndLeft,
        raisedTop + L.nameSize + L.tagGap + (1 - t) * 6, 1);
    }

    root.style.setProperty('--dock', p.toFixed(3));
    root.style.setProperty('--dock-bar', L.bar + 'px');

    docked = p >= 0.999;
    link.classList.toggle('is-docked', docked);
    if (docked) link.setAttribute('aria-label', 'Back to top');
    else link.removeAttribute('aria-label');
    root.classList.add('dock-ready');
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  // When docked, clicking the avatar brings you back to the top
  // instead of following the link.
  link.addEventListener('click', function (e) {
    if (!docked) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  window.addEventListener('load', requestUpdate);
  // Web fonts change the name's width; re-measure once they're in.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(requestUpdate);
  update();
})();

// Collapsible sections under the Curriculum Vitae bar (Short bio,
// Projects, Teaching): clicking a heading opens its panel and closes
// any other; clicking it again closes it.
(function () {
  var toggles = Array.prototype.slice.call(document.querySelectorAll('.fold-toggle'));

  function setOpen(toggle, open) {
    var panel = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel) return;
    toggle.setAttribute('aria-expanded', String(open));
    panel.classList.toggle('is-open', open);
  }

  toggles.forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      toggles.forEach(function (other) {
        if (other !== toggle) setOpen(other, false);
      });
      setOpen(toggle, open);
    });
  });
})();
