/**
 * Pull a bottom sheet down to dismiss it.
 *
 * Put it on the sheet's grab handle: `aw-sheet-drag="close()"`. While the finger moves the
 * sheet follows it, and on release it either flies out and runs the expression or springs
 * back. Only active where the sheet actually is a bottom sheet (phone portrait); elsewhere
 * the handle stays a plain button.
 */
class AwSheetDragDirective {
  constructor($window) {
    'ngInject';
    return {
      restrict: 'A',
      link: (scope, element, attrs) => {
        const handle = element[0];
        const phone = () => $window.matchMedia('(max-width: 700px) and (orientation: portrait)').matches;
        const sheet = () => handle.closest('.outputs__menu, .aw-sheet, [data-sheet]');
        const CLOSE_AT = 90; // px, or a quick flick

        let startY = 0, startAt = 0, dy = 0, dragging = false, panel = null;

        const move = (ev) => {
          if (!dragging) { return; }
          dy = Math.max(0, ev.clientY - startY);
          panel.style.transform = 'translateY(' + dy + 'px)';
        };
        const end = (ev) => {
          if (!dragging) { return; }
          dragging = false;
          handle.removeEventListener('pointermove', move);
          handle.removeEventListener('pointerup', end);
          handle.removeEventListener('pointercancel', end);
          const speed = dy / Math.max(1, Date.now() - startAt); // px per ms
          const flicked = dy > 30 && speed > 0.45;
          panel.style.transition = 'transform .2s ease-out';
          if (dy > CLOSE_AT || flicked) {
            panel.style.transform = 'translateY(100%)';
            $window.setTimeout(() => {
              panel.style.transition = ''; panel.style.transform = '';
              scope.$apply(() => scope.$eval(attrs.awSheetDrag));
            }, 180);
          } else {
            panel.style.transform = '';
            $window.setTimeout(() => { panel.style.transition = ''; }, 220);
          }
        };

        handle.addEventListener('pointerdown', (ev) => {
          if (!phone()) { return; }
          panel = sheet();
          if (!panel) { return; }
          dragging = true; startY = ev.clientY; startAt = Date.now(); dy = 0;
          panel.style.transition = 'none';
          try { handle.setPointerCapture(ev.pointerId); } catch (e) { /* older engines */ }
          handle.addEventListener('pointermove', move);
          handle.addEventListener('pointerup', end);
          handle.addEventListener('pointercancel', end);
        });

        // a drag must not also fire the handle's click
        handle.addEventListener('click', (ev) => { if (dy > 6) { ev.preventDefault(); ev.stopImmediatePropagation(); dy = 0; } }, true);
      }
    };
  }
}

export default AwSheetDragDirective;
