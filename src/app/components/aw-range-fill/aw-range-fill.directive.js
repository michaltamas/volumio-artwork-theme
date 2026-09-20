/**
 * A native range input paints its filled part with the browser's own accent, which is a thick
 * pill nothing else in the theme looks like. Styling the track means giving that up, so the
 * fill comes from a gradient instead — this directive keeps the gradient's width in step with
 * the value, live while dragging.
 *
 * Usage: aw-range-fill on an <input type="range"> with ng-model.
 */
class AwRangeFillDirective {
  constructor() {
    'ngInject';
    return {
      restrict: 'A',
      require: '?ngModel',
      link: (scope, element, attrs, ngModel) => {
        const input = element[0];
        const paint = () => {
          const min = Number(input.min || 0);
          const max = Number(input.max || 100);
          const value = Number(input.value);
          const span = max - min;
          const pct = span > 0 ? Math.min(100, Math.max(0, ((value - min) / span) * 100)) : 0;
          input.style.setProperty('--aw-fill', pct + '%');
        };
        element.on('input change', paint);
        if (ngModel) { scope.$watch(() => ngModel.$viewValue, paint); }
        paint();
      }
    };
  }
}

export default AwRangeFillDirective;
