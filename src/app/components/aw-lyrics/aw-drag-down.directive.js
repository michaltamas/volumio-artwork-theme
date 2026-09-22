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
        el.addEventListener('pointerdown', (e) => { startY = e.clientY; try { el.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ } });
        el.addEventListener('pointermove', (e) => {
          if (startY === null) { return; }
          if (e.clientY - startY > 60) { startY = null; scope.$apply(attrs.awDragDown); }
        });
        const end = () => { startY = null; };
        el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
      }
    };
  }
}

export default AwDragDownDirective;
