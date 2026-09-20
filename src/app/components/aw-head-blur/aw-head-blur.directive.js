/**
 * Progressive blur behind a sticky page head.
 *
 * One `backdrop-filter` gives a hard edge where the blur stops. Stacking a few strips with a
 * decreasing radius, each faded in and out by its own mask, ramps the blur down instead, so
 * the page dissolves as it scrolls under the head.
 *
 * Usage: aw-head-blur on the head element; the strips are inserted behind its content.
 */
const STRIPS = 12;   // matches the layer count styled in the theme

class AwHeadBlurDirective {
  constructor() {
    'ngInject';
    return {
      restrict: 'A',
      link: (scope, element) => {
        const host = element[0];
        if (host.querySelector(':scope > .aw-hblur')) { return; }
        const layer = document.createElement('div');
        layer.className = 'aw-hblur';
        layer.setAttribute('aria-hidden', 'true');
        for (let i = 0; i < STRIPS; i++) { layer.appendChild(document.createElement('i')); }
        host.insertBefore(layer, host.firstChild);
      }
    };
  }
}

export default AwHeadBlurDirective;
