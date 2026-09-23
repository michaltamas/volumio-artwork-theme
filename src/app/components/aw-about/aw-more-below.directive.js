/**
 * `aw-more-below` on a scrolling block: the class `is-more` while there is content below the
 * fold, so the stylesheet can fade the bottom edge as the hint. Re-checked on scroll, on resize
 * and when the content changes.
 */
class AwMoreBelowDirective {
  constructor() {
    return {
      restrict: 'A',
      link: (scope, element) => {
        const el = element[0];
        const check = () => el.classList.toggle('is-more', el.scrollHeight - el.clientHeight - el.scrollTop > 4);
        el.addEventListener('scroll', check, { passive: true });
        window.addEventListener('resize', check);
        const mo = new MutationObserver(() => setTimeout(check, 0));
        mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
        setTimeout(check, 0);
        scope.$on('$destroy', () => { window.removeEventListener('resize', check); mo.disconnect(); });
      }
    };
  }
}

export default AwMoreBelowDirective;
