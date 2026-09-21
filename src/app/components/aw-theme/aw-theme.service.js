/**
 * Dark or light, and who decides.
 *
 * The theme is a set of custom properties; switching it is a single attribute on <html>, which
 * the stylesheet reads (`:root[data-aw-theme="light"]`, and the system case inside a
 * prefers-color-scheme query). The choice belongs to the browser, not the player: one person's
 * phone can be light while the living-room screen stays dark, and nothing is written to the
 * player's configuration.
 *
 * Until a choice is made the theme is dark, as it always was. "System" has to be chosen: a
 * display driven by the player itself (a kiosk on HDMI) has no dark mode of its own, reports
 * a light scheme, and would come up on paper after an update with nobody able to touch it.
 * A browser that cannot be reached by hand takes the choice from the address instead:
 * `?theme=dark|light|system` is saved on load, so a kiosk URL can carry it.
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
    const asked = this.fromAddress();
    try {
      if (asked) { this.$window.localStorage.setItem(KEY, asked); return asked; }
      const saved = this.$window.localStorage.getItem(KEY);
      return MODES.indexOf(saved) > -1 ? saved : 'dark';
    } catch (e) { return asked || 'dark'; }
  }

  // `?theme=light` in the address (before or after the hash) names a mode
  fromAddress() {
    const m = /[?&]theme=(dark|light|system)\b/.exec(this.$window.location.href || '');
    return m ? m[1] : null;
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
