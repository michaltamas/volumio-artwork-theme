/** `aw-pointerdown="expr"`: runs the expression on pointerdown, with $event (AngularJS has no ng-pointerdown). */
class AwPointerdownDirective {
  constructor() {
    return {
      restrict: 'A',
      link: (scope, element, attrs) => {
        element[0].addEventListener('pointerdown', (e) => { scope.$apply(() => scope.$eval(attrs.awPointerdown, { $event: e })); });
      }
    };
  }
}

export default AwPointerdownDirective;
