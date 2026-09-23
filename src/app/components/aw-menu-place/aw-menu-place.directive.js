/**
 * `aw-menu-place` on a uib-dropdown: when the menu opens it is placed where it fits.
 *
 * The stylesheet hangs a menu from its ⋯ button, which is right for a row in the middle of the
 * screen and wrong at the edges: a tile at the left edge pushed it off-screen, one near the
 * bottom pushed it under the mini player. Here the menu opens toward the free side — hanging
 * from the button's right edge, else its left, else the screen's edge — below the button when
 * there is room above the mini player, else above it, and never past the top. It is measured in
 * viewport terms and written back as an offset from its offset parent, so a transformed ancestor
 * does not throw it off.
 */
const GAP = 6;
const EDGE = 8;

function place(root) {
  const menu = root.querySelector('.dropdown-menu');
  const anchor = root.querySelector('[uib-dropdown-toggle], .dropdown-toggle') || root;
  if (!menu || !menu.offsetParent) { return; }
  const s = menu.style;
  s.top = ''; s.left = ''; s.right = ''; s.bottom = ''; s.maxHeight = ''; s.overflowY = ''; s.margin = '';
  const a = anchor.getBoundingClientRect();
  const w = menu.offsetWidth, h = menu.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  // the menu lives inside the page's scroller, under its sticky head: the ceiling is the
  // scroller's top edge; the floor the mini player's top edge (it slides away under Now Playing)
  // or the scroller's bottom, whichever comes first
  let sc = menu.parentElement;
  while (sc && sc !== document.body && !(/auto|scroll/.test(getComputedStyle(sc).overflowY) && sc.scrollHeight > sc.clientHeight)) { sc = sc.parentElement; }
  const scr = sc && sc !== document.body ? sc.getBoundingClientRect() : null;
  const foot = document.getElementById('footer-content');
  let ceiling = Math.max(EDGE, scr ? scr.top + EDGE : EDGE);
  // the page head sticks to the scroller's top and paints over what scrolls under it
  const head = (sc && sc !== document.body ? sc : document).querySelector('.aw-head');
  if (head) { const hr = head.getBoundingClientRect(); if (hr.height && hr.bottom > ceiling) { ceiling = hr.bottom + EDGE; } }
  const floor = Math.min(vh, foot ? foot.getBoundingClientRect().top : vh, scr ? scr.bottom : vh) - EDGE;
  let left = a.right - w;
  if (left < EDGE) { left = a.left; }
  if (left + w > vw - EDGE) { left = vw - EDGE - w; }
  if (left < EDGE) { left = EDGE; }
  // below when it fits there, above when it fits there, else the roomier side, scrolling inside
  const below = floor - (a.bottom + GAP), above = a.top - GAP - ceiling;
  let top, maxH = 0;
  if (h <= below) { top = a.bottom + GAP; }
  else if (h <= above) { top = a.top - GAP - h; }
  else if (below >= above) { top = a.bottom + GAP; maxH = below; }
  else { top = ceiling; maxH = above; }
  const op = menu.offsetParent, o = op.getBoundingClientRect();
  s.margin = '0';
  s.right = 'auto'; s.bottom = 'auto';
  s.left = Math.round(left - o.left - op.clientLeft + op.scrollLeft) + 'px';
  s.top = Math.round(top - o.top - op.clientTop + op.scrollTop) + 'px';
  if (maxH) { s.maxHeight = Math.round(maxH) + 'px'; s.overflowY = 'auto'; }
}

class AwMenuPlaceDirective {
  constructor() {
    return {
      restrict: 'A',
      link: (scope, element) => {
        const el = element[0];
        // uib marks the open dropdown with the `open` class; the menu is measured once it shows
        const mo = new MutationObserver(() => { if (el.classList.contains('open')) { place(el); } });
        mo.observe(el, { attributes: true, attributeFilter: ['class'] });
        scope.$on('$destroy', () => mo.disconnect());
      }
    };
  }
}

export default AwMenuPlaceDirective;
