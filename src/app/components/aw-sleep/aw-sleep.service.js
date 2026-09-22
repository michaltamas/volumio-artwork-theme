/**
 * The sleep timer, as one thing every screen can read (handoff 9a/9b).
 *
 * Volumio's alarm-clock plugin keeps the timer; it answers `getSleep` with what is left
 * (hours and minutes, to the minute) and the action, and tells only the screen that asked.
 * This service asks when the socket comes up, after every change, and once a minute while the
 * timer runs; in between it counts down on its own clock, so the sheet can show seconds and
 * the tag on Now Playing the minutes. When the count reaches nothing the timer is over.
 */
const POLL_MS = 60000;

class AwSleepService {
  constructor($rootScope, $interval, socketService) {
    'ngInject';
    this.$rootScope = $rootScope;
    this.socketService = socketService;
    this.enabled = false;
    this.action = 'stop';
    this.endsAt = 0;        // ms since the epoch, while it runs
    this.startedAt = 0;     // known only for a timer this screen started
    this.length = 0;        // minutes, for the progress
    socketService.on('pushSleep', (d) => this.receive(d));
    $rootScope.$on('socket:reconnect', () => this.ask());
    $interval(() => this.tick(), 1000, 0, false);
    this.ask();
  }

  ask() { if (this.socketService.isSocketAvalaible()) { this.socketService.emit('getSleep'); } }

  receive(d) {
    if (!d) { return; }
    // the answer to setSleep carries the stored task (sleep_enabled, sleep_action…), the answer
    // to getSleep the timer as it stands (enabled, time, action): both are heard
    const en = d.enabled !== undefined ? d.enabled : d.sleep_enabled;
    const action = d.action !== undefined ? d.action : d.sleep_action;
    if (en === undefined) { return; }
    const was = this.enabled;
    this.enabled = en === true || en === 'true';
    this.action = action === 'poweroff' ? 'poweroff' : 'stop';
    if (this.enabled && !d.time) {
      // no remaining time in this answer: keep the end this screen already knows, or ask
      if (!this.endsAt) { this.ask(); }
    } else if (this.enabled && d.time) {
      const [h, m] = String(d.time).split(':').map(v => parseInt(v, 10) || 0);
      // the player gives whole minutes: the end is at the top of the next one
      const left = (h * 60 + m + 1) * 60000;
      // a fresh answer from a timer this screen started keeps the finer end it already knows
      if (!(this.endsAt && Math.abs(this.endsAt - (Date.now() + left)) < 90000)) { this.endsAt = Date.now() + left; }
      if (!this.length) { this.length = h * 60 + m + 1; }
    } else {
      this.endsAt = 0; this.startedAt = 0; this.length = 0;
    }
    this.lastAsk = Date.now();
    this.$rootScope.$broadcast('aw:sleep', this.running);
    if (was !== this.enabled) { this.$rootScope.$applyAsync(); }
  }

  get running() { return this.enabled && this.endsAt > Date.now(); }
  get remainingMs() { return this.running ? Math.max(0, this.endsAt - Date.now()) : 0; }
  get minutesLeft() { return Math.ceil(this.remainingMs / 60000); }
  // mm:ss (or h:mm:ss) for the sheet's countdown
  get countdown() {
    const s = Math.floor(this.remainingMs / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    const mm = (h ? (m < 10 ? '0' : '') : '') + m, ss = (r < 10 ? '0' : '') + r;
    return (h ? h + ':' : '') + mm + ':' + ss;
  }
  get progress() { return this.length ? Math.min(100, Math.max(0, 100 - this.remainingMs / (this.length * 60000) * 100)) : 0; }
  get endsText() { return this.endsAt ? this.hhmm(this.endsAt) : ''; }
  get startedText() { return this.startedAt ? this.hhmm(this.startedAt) : ''; }
  hhmm(ms) { const d = new Date(ms); return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2); }

  // start a timer of `minutes`, ending in `action` ('stop' | 'poweroff')
  start(minutes, action) {
    const m = Math.max(1, Math.min(24 * 60 - 1, Math.round(minutes)));
    const a = action === 'poweroff' ? 'poweroff' : 'stop';
    this.socketService.emit('setSleep', { enabled: true, time: Math.floor(m / 60) + ':' + (m % 60), action: a });
    this.enabled = true; this.action = a;
    this.startedAt = Date.now(); this.endsAt = Date.now() + m * 60000; this.length = m;
    this.$rootScope.$broadcast('aw:sleep', true);
  }

  off() {
    this.socketService.emit('setSleep', { enabled: false, time: '0:0', action: this.action });
    this.enabled = false; this.endsAt = 0; this.startedAt = 0; this.length = 0;
    this.$rootScope.$broadcast('aw:sleep', false);
  }

  tick() {
    if (!this.enabled) { return; }
    if (this.endsAt && Date.now() >= this.endsAt) {
      // over: the player stopped the music (or is shutting down); ask it to be sure
      this.enabled = false; this.endsAt = 0; this.startedAt = 0; this.length = 0;
      this.$rootScope.$broadcast('aw:sleep', false);
      this.ask();
    } else if (!this.lastAsk || Date.now() - this.lastAsk > POLL_MS) {
      this.lastAsk = Date.now();
      this.ask();
    }
    this.$rootScope.$applyAsync();
  }
}

export default AwSleepService;
