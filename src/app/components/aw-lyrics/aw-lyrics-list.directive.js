/**
 * Keeps the current lyric line at the optical centre of its column (handoff 6a).
 *
 * On a line change the stack translates by exactly the distance to the next line over 280 ms;
 * a seek jumps without tweening — a forty-line glide after a scrub is nausea, not polish.
 * The element it sits on is the column; its first child is the stack of lines, each marked
 * `data-line`. `aw-lyrics-list="expr"` is the index of the current line.
 */
/* global ResizeObserver */
class AwLyricsListDirective {
  constructor() {
    return {
      restrict: 'A',
      link: (scope, element, attrs) => {
        const col = element[0];
        let last = -2;
        const place = (i, tween) => {
          const stack = col.firstElementChild;
          if (!stack) { return; }
          const line = i >= 0 ? stack.querySelector(`[data-line="${i}"]`) : null;
          // before the first line the stack rests where the first line will land
          const target = line || stack.querySelector('[data-line="0"]');
          if (!target) { stack.style.transform = ''; return; }
          const offset = target.offsetTop + target.offsetHeight / 2 - col.clientHeight / 2;
          stack.classList.toggle('no-tween', !tween);
          stack.style.transform = `translateY(${-Math.max(0, offset)}px)`;
        };
        scope.$watch(attrs.awLyricsList, (i) => {
          const idx = typeof i === 'number' ? i : -1;
          // a jump of more than one line, or backwards, is a seek: no tween
          const tween = last !== -2 && idx - last === 1;
          last = idx;
          // the lines may still be rendering: measure after the digest painted them
          requestAnimationFrame(() => place(idx, tween));
        });
        // the column changes size with the window: the current line has to stay centred
        const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => place(last, false)) : null;
        if (ro) { ro.observe(col); }
        scope.$on('$destroy', () => { if (ro) { ro.disconnect(); } });
      }
    };
  }
}

export default AwLyricsListDirective;
