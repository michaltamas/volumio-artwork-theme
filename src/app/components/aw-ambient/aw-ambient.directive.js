/**
 * The ambient screen itself: what plays, on the blurred cover, with a clock.
 * Mounted once in the layout; shown while awAmbient is active.
 */
class AwAmbientDirective {
  constructor(themeManager) {
    'ngInject';
    return {
      restrict: 'E',
      templateUrl: themeManager.getHtmlPath('ambient', 'components/ambient'),
      scope: {},
      bindToController: true,
      controller: AwAmbientController,
      controllerAs: 'amb'
    };
  }
}

class AwAmbientController {
  constructor($scope, $interval, $timeout, playerService, awAmbient, awSignal, awTheme) {
    'ngInject';
    this.$scope = $scope;
    this.$timeout = $timeout;
    this.playerService = playerService;
    this.ambient = awAmbient;
    this.signal = awSignal;
    this.theme = awTheme;
    this.clockText = '';
    this.clockSuffix = '';
    this.swapping = false;
    this.tick();
    // the clock is right to the minute; a 10 s tick keeps it never more than that late
    const clock = $interval(() => this.tick(), 10000, 0, false);
    // a track change cross-fades the cover and the text rather than snapping
    $scope.$watch(() => (this.state.uri || '') + '|' + (this.state.title || ''), (n, o) => {
      if (n === o || !this.ambient.active) { return; }
      this.swapping = true;
      $timeout(() => { this.swapping = false; }, 260);
    });
    $scope.$on('$destroy', () => $interval.cancel(clock));
  }

  get state() { return this.playerService.state || {}; }
  get active() { return this.ambient.active; }
  get layout() { return this.ambient.settings.layout; }
  get night() { return this.ambient.isNight; }
  get playing() { return this.state.status === 'play'; }
  get paused() { return this.state.status === 'pause'; }
  // nothing to show but the clock: stopped, or an empty queue
  get stopped() { const s = this.state.status; return !s || s === 'stop' || !this.state.title; }

  get cover() { return this.state.albumart ? this.playerService.albumart : ''; }

  // "VOLUMIO · HEADPHONES": the zone, then the output it plays through
  get playerLine() {
    const parts = [this.signal.room || 'VOLUMIO', this.signal.output].filter(Boolean);
    return parts.join(' · ').toUpperCase();
  }

  get signalText() { return this.signal.signal(this.state); }     // 24/88.2
  get formatText() { return this.signal.format(this.state); }     // FLAC · TIDAL
  get bitrateText() { return !this.signalText && this.state.bitrate ? String(this.state.bitrate) : ''; }
  get bitPerfect() { return this.signal.bitPerfect; }
  // Hi-Res: more than CD (the same rule the quality badges use)
  get hiRes() {
    const rate = parseFloat(this.signal.splitVal(this.state.samplerate).n) || 0;
    const bits = parseInt(this.signal.splitVal(this.state.bitdepth).n, 10) || 0;
    return rate > 48 || bits > 16;
  }

  // --- time --------------------------------------------------------------------------------

  // inside the track, in ms: nothing when stopped, never past the end (Volumio's seek keeps
  // counting after a queue ends)
  elapsedMs() {
    const st = this.state;
    if (!st.status || st.status === 'stop') { return 0; }
    const ms = this.playerService.elapsedTime || 0;
    const duration = st.duration ? st.duration * 1000 : 0;
    return duration ? Math.min(Math.max(0, ms), duration) : Math.max(0, ms);
  }
  get elapsed() { return this.mmss(this.elapsedMs()); }
  get duration() { return this.state.duration ? this.mmss(this.state.duration * 1000) : ''; }
  get playedPct() {
    const d = this.state.duration ? this.state.duration * 1000 : 0;
    return d ? Math.min(100, Math.max(0, this.elapsedMs() / d * 100)) : 0;
  }
  mmss(ms) {
    const s = Math.floor(ms / 1000), m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  tick() {
    const d = new Date();
    let h = d.getHours();
    const m = d.getMinutes();
    if (this.ambient.settings.clock === '12') {
      this.clockSuffix = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      this.clockText = h + ':' + (m < 10 ? '0' : '') + m;
    } else {
      this.clockSuffix = '';
      this.clockText = (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
    }
    this.$scope.$applyAsync();
  }
}

export default AwAmbientDirective;
