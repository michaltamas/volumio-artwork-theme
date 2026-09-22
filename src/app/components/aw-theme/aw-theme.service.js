/**
 * Dark or light, and who decides.
 *
 * The theme is a set of custom properties; switching it is a single attribute on <html>, which
 * the stylesheet reads (`:root[data-aw-theme="light"]`, and the system case inside a
 * prefers-color-scheme query).
 *
 * Two voices, in this order:
 *   1. the browser's own choice (`aw-theme` in localStorage) — a phone can be light while the
 *      living-room screen stays dark;
 *   2. the player's word, when the Artwork One Companion plugin holds one (`follow`): it is
 *      what a screen the player drives on HDMI shows, since nobody can touch that one, and what
 *      any browser shows until it picks for itself.
 * Until either speaks the theme is dark, as it always was. "System" has to be chosen: a kiosk
 * display has no dark mode of its own, reports a light scheme, and would come up on paper.
 * A browser that cannot be reached by hand also takes the choice from the address:
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
    this.choice = this.read();     // this browser's own pick, or null
    this.followed = null;          // the player's word, or null
    this.forced = false;           // a kiosk screen: the player's word beats the browser's
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
      return MODES.indexOf(saved) > -1 ? saved : null;
    } catch (e) { return asked || null; }
  }

  // `?theme=light` in the address (before or after the hash) names a mode
  fromAddress() {
    const m = /[?&]theme=(dark|light|system)\b/.exec(this.$window.location.href || '');
    return m ? m[1] : null;
  }

  // the mode in force: the browser's choice, else the player's word, else dark
  get mode() {
    if (this.forced && this.followed) { return this.followed; }
    return this.choice || this.followed || 'dark';
  }

  get isLight() {
    return this.mode === 'light' || (this.mode === 'system' && !!(this.query && this.query.matches));
  }

  is(mode) { return this.mode === mode; }
  get hasChoice() { return !!this.choice; }

  // this browser picks for itself
  set(mode) {
    if (MODES.indexOf(mode) < 0) { return; }
    this.choice = mode;
    try { this.$window.localStorage.setItem(KEY, mode); } catch (e) { /* nothing to remember it with */ }
    this.apply();
  }

  // the player's word (from the companion plugin); `forced` on a screen the player drives
  follow(mode, forced) {
    if (MODES.indexOf(mode) < 0) { return; }
    this.followed = mode;
    this.forced = !!forced;
    this.apply();
  }

  unfollow() {
    this.followed = null;
    this.forced = false;
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
