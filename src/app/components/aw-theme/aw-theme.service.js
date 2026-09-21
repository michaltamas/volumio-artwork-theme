/**
 * Dark or light, and who decides.
 *
 * The theme is a set of custom properties; switching it is a single attribute on <html>, which
 * the stylesheet reads (`:root[data-aw-theme="light"]`, and the system case inside a
 * prefers-color-scheme query). The choice belongs to the browser, not the player: one person's
 * phone can be light while the living-room screen stays dark, and nothing is written to the
 * player's configuration.
 */
const KEY = 'aw-theme';
const MODES = ['dark', 'light', 'system'];

class AwThemeService {
  constructor($rootScope, $window) {
    'ngInject';
    this.$rootScope = $rootScope;
    this.$window = $window;
    this.modes = MODES;
    this.mode = this.read();
    this.query = $window.matchMedia ? $window.matchMedia('(prefers-color-scheme: light)') : null;
    if (this.query) {
      const onChange = () => { if (this.mode === 'system') { this.apply(); this.$rootScope.$applyAsync(); } };
      if (this.query.addEventListener) { this.query.addEventListener('change', onChange); }
      else if (this.query.addListener) { this.query.addListener(onChange); }
    }
    this.apply();
  }

  // a private window, or storage turned off, must not break the interface
  read() {
    try {
      const saved = this.$window.localStorage.getItem(KEY);
      return MODES.indexOf(saved) > -1 ? saved : 'system';
    } catch (e) { return 'system'; }
  }

  get isLight() {
    return this.mode === 'light' || (this.mode === 'system' && !!(this.query && this.query.matches));
  }

  is(mode) { return this.mode === mode; }

  set(mode) {
    if (MODES.indexOf(mode) < 0 || mode === this.mode) { return; }
    this.mode = mode;
    try { this.$window.localStorage.setItem(KEY, mode); } catch (e) { /* nothing to remember it with */ }
    this.apply();
  }

  apply() {
    const root = this.$window.document.documentElement;
    root.setAttribute('data-aw-theme', this.mode);
    root.classList.toggle('aw-is-light', this.isLight);
    this.$rootScope.$broadcast('aw:theme', this.isLight ? 'light' : 'dark');
  }
}

export default AwThemeService;
