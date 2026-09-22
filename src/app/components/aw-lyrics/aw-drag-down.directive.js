/**
 * `aw-drag-down="expr"`: a downward drag of 60px on the element runs the expression.
 * The phone's lyrics sheet is put away by its handle this way (handoff 6b).
 */
class AwDragDownDirective {
  constructor() {
    return {
      restrict: 'A',
      link: (scope, element, attrs) => {
        const el = element[0];
        let startY = null;
        const y = (e) => (e.touches && e.touches[0] ? e.touches[0].clientY : e.clientY);
        const start = (e) => { startY = y(e); if (e.pointerId !== undefined) { try { el.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ } } };
        const move = (e) => {
          if (startY === null) { return; }
          if (y(e) - startY > 60) { startY = null; scope.$apply(attrs.awDragDown); }
          else if (e.cancelable) { e.preventDefault(); }   // the page must not scroll under the drag
        };
        const end = () => { startY = null; };
        el.addEventListener('pointerdown', start); el.addEventListener('pointermove', move);
        el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
        // iOS Safari cancels the pointer once it decides the finger scrolls; touch events do not
        el.addEventListener('touchstart', start, { passive: true }); el.addEventListener('touchmove', move, { passive: false });
        el.addEventListener('touchend', end); el.addEventListener('touchcancel', end);
      }
    };
  }
}

export default AwDragDownDirective;
