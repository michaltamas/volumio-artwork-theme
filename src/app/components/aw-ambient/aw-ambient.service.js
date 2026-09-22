/**
 * Ambient: the display's resting state.
 *
 * A screen driven by the player itself — HDMI, the Touch Display plugin, a TV — spends most of
 * its life untouched. After the idle delay the interface gives way to the cover, the essentials
 * and a clock, and a touch anywhere brings it back where it was. This service owns the idle
 * timer, the settings and the kiosk question; the directive draws.
 *
 * Kiosk = a browser that is the player's own display: Volumio's kiosk user agent, a loopback
 * host, or `?kiosk=1` in the address (kept for the session, so a desktop browser can stand in
 * for a display while testing). Ambient runs there by default and nowhere else: a laptop is not
 * a display. `?ambient=now` enters at once, for a look without waiting out the delay.
 *
 * Settings live in this browser (`aw-ambient` in localStorage), like the theme choice does —
 * the display is the one browser these settings are for.
 */
const KEY = 'aw-ambient';
const KIOSK_KEY = 'aw-kiosk';
const DELAYS = [1, 2, 5, 10, 0];            // minutes; 0 = never
const LAYOUTS = ['cover', 'clock', 'bleed'];
const DEFAULTS = { on: true, delay: 2, layout: 'cover', clock: '24', night: true, nightFrom: '23:00', nightTo: '07:00' };
const ACTIVITY = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'];

class AwAmbientService {
  constructor($rootScope, $window, $timeout, $document) {
    'ngInject';
    this.$rootScope = $rootScope;
    this.$window = $window;
    this.$timeout = $timeout;
    this.$document = $document;
    this.delays = DELAYS;
    this.layouts = LAYOUTS;
    this.active = false;
    this.remote = false;
    this.settings = this.read();
    this.kiosk = this.detectKiosk();
    this.idleTimer = null;
    this.lastMove = 0;
    const onActivity = (e) => this.activity(e);
    ACTIVITY.forEach(t => $window.addEventListener(t, onActivity, { passive: false, capture: true }));
    this.arm();
    // saved in another tab of this browser: take it over at once, no reload
    $window.addEventListener('storage', (e) => {
      if (e.key !== KEY) { return; }
      this.settings = this.read();
      if (this.active) { this.exit(); }
      this.arm();
      $rootScope.$broadcast('aw:ambient-settings', this.settings);
      $rootScope.$applyAsync();
    });
    if (/[?&]ambient=now\b/.test($window.location.href || '')) { $timeout(() => this.enter(), 1200, false); }
  }

  // --- kiosk -------------------------------------------------------------------------------

  detectKiosk() {
    const w = this.$window;
    const href = String(w.location.href || '');
    const asked = /[?&]kiosk=(1|0)\b/.exec(href);
    try {
      if (asked) { w.sessionStorage.setItem(KIOSK_KEY, asked[1]); }
      const kept = w.sessionStorage.getItem(KIOSK_KEY);
      if (kept === '1') { return true; }
      if (kept === '0') { return false; }
    } catch (e) { if (asked) { return asked[1] === '1'; } }
    if (/volumiokiosk/i.test(w.navigator.userAgent || '')) { return true; }
    const host = String(w.location.hostname || '');
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  }

  // --- settings ----------------------------------------------------------------------------

  read() {
    try {
      const saved = JSON.parse(this.$window.localStorage.getItem(KEY) || '{}');
      const s = angular.extend({}, DEFAULTS, saved);
      if (DELAYS.indexOf(s.delay) < 0) { s.delay = DEFAULTS.delay; }
      if (LAYOUTS.indexOf(s.layout) < 0) { s.layout = DEFAULTS.layout; }
      if (s.clock !== '12' && s.clock !== '24') { s.clock = DEFAULTS.clock; }
      return s;
    } catch (e) { return angular.extend({}, DEFAULTS); }
  }

  set(patch) {
    angular.extend(this.settings, patch);
    try { this.$window.localStorage.setItem(KEY, JSON.stringify(this.settings)); } catch (e) { /* nothing to remember it with */ }
    this.arm();
    this.$rootScope.$broadcast('aw:ambient-settings', this.settings);
  }

  // the player's word (from the companion plugin): it beats the browser's copy, and is not
  // written into it — the player is the one place these settings live from now on
  adopt(remote) {
    const s = angular.extend({}, DEFAULTS, remote || {});
    if (DELAYS.indexOf(s.delay) < 0) { s.delay = DEFAULTS.delay; }
    if (LAYOUTS.indexOf(s.layout) < 0) { s.layout = DEFAULTS.layout; }
    if (s.clock !== '12' && s.clock !== '24') { s.clock = DEFAULTS.clock; }
    this.settings = s;
    this.remote = true;
    if (this.active) { this.exit(); }
    this.arm();
    this.$rootScope.$broadcast('aw:ambient-settings', this.settings);
  }

  revert() {
    this.settings = this.read();
    this.remote = false;
    this.arm();
    this.$rootScope.$broadcast('aw:ambient-settings', this.settings);
  }

  get enabled() { return this.settings.on && this.settings.delay > 0 && this.kiosk; }

  // --- idle timer --------------------------------------------------------------------------

  arm() {
    if (this.idleTimer) { this.$timeout.cancel(this.idleTimer); this.idleTimer = null; }
    if (!this.enabled || this.active) { return; }
    this.idleTimer = this.$timeout(() => this.enter(), this.settings.delay * 60 * 1000, false);
  }

  activity(e) {
    if (this.active) {
      // a touch anywhere wakes the screen; the tap must not also land on what is beneath
      if (e.type === 'pointermove') { return; }
      e.preventDefault(); e.stopPropagation();
      this.exit();
      return;
    }
    // pointer moves come in bursts: re-arming on every one is a timer churn for nothing
    if (e.type === 'pointermove') {
      const now = Date.now();
      if (now - this.lastMove < 1000) { return; }
      this.lastMove = now;
    }
    this.arm();
  }

  enter() {
    if (this.active) { return; }
    this.active = true;
    this.$document[0].documentElement.setAttribute('data-aw-ambient', '');
    this.$rootScope.$broadcast('aw:ambient', true);
    this.$rootScope.$applyAsync();
  }

  exit() {
    if (!this.active) { return; }
    this.active = false;
    this.$document[0].documentElement.removeAttribute('data-aw-ambient');
    this.$rootScope.$broadcast('aw:ambient', false);
    this.arm();
    this.$rootScope.$applyAsync();
  }

  // --- night -------------------------------------------------------------------------------

  // inside the night hours right now (a window that may cross midnight)
  get isNight() {
    const s = this.settings;
    if (!s.night) { return false; }
    const from = this.minutes(s.nightFrom), to = this.minutes(s.nightTo);
    if (from === null || to === null || from === to) { return false; }
    const d = new Date(), now = d.getHours() * 60 + d.getMinutes();
    return from < to ? (now >= from && now < to) : (now >= from || now < to);
  }

  minutes(hhmm) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
    if (!m) { return null; }
    const h = +m[1], mi = +m[2];
    return h > 23 || mi > 59 ? null : h * 60 + mi;
  }
}

export default AwAmbientService;
