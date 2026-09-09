export default class PlayerSeekbarDirective {
  constructor(themeManager) {
    'ngInject';
    let directive = {
      restrict: 'E',
      templateUrl: themeManager.getHtmlPath('player-seekbar', 'components/player-seekbar'),
      scope: {},
      controller: playerSeekBarController,
      controllerAs: 'playerSeekBar',
      bindToController: true
    };
    return directive;
  }
}

class playerSeekBarController {
  constructor(playerService, $timeout, matchmediaService, $scope, $element) {
    'ngInject';
    this.playerService = playerService;
    this.$timeout = $timeout;
    this.matchmedia = matchmediaService;
    this.$scope = $scope;
    this.$element = $element;
    this.scrubbing = false;
    // the waveform renders after this constructor: bind the scrubber once it exists
    $timeout(() => this.bindScrub(), 0, false);

    this.timeoutHandler = null;

    this.inited = false;

    this.seekPercent = this.playerService.seekPercent;
    this.init();

    // Artwork theme waveform scrubber (spec §5.7). Volumio doesn't provide peak
    // data, so heights come from a deterministic seeded envelope (LCG x sine
    // window). Other themes' seekbar templates simply don't render these.
    this.WAVE_N = 104;
    this.bars = this.buildWave(this.WAVE_N);
  }

  init(){
    this.inited = true;
  }

  buildWave(n){
    let seed = 1337;
    const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const out = [];
    for (let i = 0; i < n; i++) {
      // a fuller, audio-like envelope: never collapses to zero at the ends,
      // gentle rise/fall plus per-bar variation (values 0..1 -> % of height)
      const window = 0.45 + 0.55 * Math.sin(Math.PI * (0.12 + 0.76 * i / (n - 1)));
      const v = (0.35 + 0.65 * rnd()) * window;   // ~0.15 .. 1.0
      out.push(Math.max(14, Math.round(v * 46))); // 14..46 (percent of container)
    }
    return out;
  }

  get waveScale(){ return this.playerService._seekScale || 1000; }

  // Pointer scrubbing on the waveform (mouse, touch, pen): the played bars and the elapsed
  // label follow the finger, the seek is sent once on release. A tap seeks the same way.
  bindScrub(){
    const root = this.$element[0];
    if (!root || root._awScrub) { return; }
    root._awScrub = true;
    root.addEventListener('pointerdown', (e) => {
      const w = e.target.closest ? e.target.closest('.artwork-wave') : null;
      if (!w || (e.button && e.button !== 0)) { return; }
      const st = this.playerService.state;
      if (!st || st.disableUi || !st.duration) { return; }
      e.preventDefault();
      try { w.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
      this.playerService.stopSeek();
      this.scrubbing = true;
      const pct = (x) => { const r = w.getBoundingClientRect(); return r.width ? Math.min(1, Math.max(0, (x - r.left) / r.width)) : 0; };
      const preview = (x) => {
        const p = pct(x);
        this.playerService.seekPercent = Math.round(p * this.waveScale);
        this.playerService.elapsedTime = Math.round(p * st.duration * 1000);
        this.playerService.calculateElapsedTimeString();
        this.$scope.$applyAsync();
      };
      preview(e.clientX);
      const move = (ev) => preview(ev.clientX);
      const up = (ev) => {
        w.removeEventListener('pointermove', move); w.removeEventListener('pointerup', up); w.removeEventListener('pointercancel', up);
        this.scrubbing = false;
        this.seekPercent = Math.round(pct(ev.clientX) * this.waveScale); // debounced setSeek → playerService.seek
        this.$scope.$applyAsync();
      };
      w.addEventListener('pointermove', move); w.addEventListener('pointerup', up); w.addEventListener('pointercancel', up);
    });
  }

  barPlayed(i){
    return (i + 0.5) / this.WAVE_N <= (this.playerService.seekPercent / this.waveScale);
  }

  seekToBar(i){
    this.seekPercent = Math.round(((i + 0.5) / this.WAVE_N) * this.waveScale);
  }

  ariaNow(){
    return Math.round((this.playerService.seekPercent / this.waveScale) * 100);
  }

  onKey(ev){
    const step = this.waveScale / this.WAVE_N;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
      this.seekPercent = Math.min(this.waveScale, this.playerService.seekPercent + step); ev.preventDefault();
    } else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') {
      this.seekPercent = Math.max(0, this.playerService.seekPercent - step); ev.preventDefault();
    }
  }

  set seekPercent(val){
    if(!this.inited){
      //avoid setting seek value from view model before init complete
      return;
    }
    this.playerService.seekPercent = val;
    this.setSeek(this.playerService.seekPercent);
  }

  get seekPercent(){
    return this.playerService.seekPercent;
  }

  setSeek(progress){
    this.$timeout.cancel(this.timeoutHandler);
    this.timeoutHandler = this.$timeout(() => {
      if ( this.playerService.state !== undefined && this.playerService.state !== null && !this.playerService.state.disableUi ) {
        this.playerService.stopSeek();
        this.playerService.seek = progress;
      }
    }, 200, false);
  }

  getElapsed() {
    let elapsedTime = this.playerService.elapsedTime;
    return this.momentToString(elapsedTime);
  }

  getDuration(){
    if(!this.playerService.state || !this.playerService.state.duration){
      return null;
    }
    return this.momentToString(this.playerService.state.duration * 1000);
  }

  momentToString(time){
    let momentDuration = moment.duration(time),
      hours = momentDuration.hours(),
      minutes = momentDuration.minutes(),
      seconds = momentDuration.seconds();
    minutes += hours*60;
    let momentString = minutes + ':' +
                            ((seconds < 10) ? ('0' + seconds) : seconds);
    return momentString;
  }

}
