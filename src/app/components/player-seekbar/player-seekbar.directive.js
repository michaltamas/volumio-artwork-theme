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
    // the track renders after this constructor: bind the scrubber once it exists
    $timeout(() => this.bindScrub(), 0, false);

    this.timeoutHandler = null;

    this.inited = false;

    this.seekPercent = this.playerService.seekPercent;
    this.init();

  }

  init(){
    this.inited = true;
  }

  // Volumio's seek scale: seekPercent runs 0..1000 unless the service says otherwise
  get seekScale(){ return this.playerService._seekScale || 1000; }

  // Pointer scrubbing (mouse, touch, pen): the fill, the handle and the elapsed label follow
  // the finger, the seek is sent once on release. A tap seeks the same way.
  bindScrub(){
    const root = this.$element[0];
    if (!root || root._awScrub) { return; }
    root._awScrub = true;
    root.addEventListener('pointerdown', (e) => {
      const w = e.target.closest ? e.target.closest('.artwork-seek__hit') : null;
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
        this.playerService.seekPercent = Math.round(p * this.seekScale);
        this.playerService.elapsedTime = Math.round(p * st.duration * 1000);
        this.playerService.calculateElapsedTimeString();
        this.$scope.$applyAsync();
      };
      preview(e.clientX);
      const move = (ev) => preview(ev.clientX);
      const up = (ev) => {
        w.removeEventListener('pointermove', move); w.removeEventListener('pointerup', up); w.removeEventListener('pointercancel', up);
        this.scrubbing = false;
        this.seekPercent = Math.round(pct(ev.clientX) * this.seekScale); // debounced setSeek → playerService.seek
        this.$scope.$applyAsync();
      };
      w.addEventListener('pointermove', move); w.addEventListener('pointerup', up); w.addEventListener('pointercancel', up);
    });
  }

  /* How far into the track we are, in milliseconds.
     Volumio keeps counting its own `seek` while the player sits stopped at the end of a queue,
     so the pushed state can claim a position hours past the end of a four-minute track. What
     the bar shows has to stay inside the track: nothing when stopped, never past the duration. */
  elapsedMs(){
    const st = this.playerService.state;
    if (!st || st.status === 'stop') { return 0; }
    const ms = this.playerService.elapsedTime || 0;
    const duration = st.duration ? st.duration * 1000 : 0;
    return duration ? Math.min(Math.max(0, ms), duration) : Math.max(0, ms);
  }

  // the played share of the track, 0..100 (the fill's width and the handle's position)
  playedPct(){
    const st = this.playerService.state;
    const duration = st && st.duration ? st.duration * 1000 : 0;
    if (duration) { return Math.min(100, Math.max(0, (this.elapsedMs() / duration) * 100)); }
    const p = (this.playerService.seekPercent / this.seekScale) * 100;
    return Math.min(100, Math.max(0, p || 0));
  }

  ariaNow(){
    return Math.round(this.playedPct());
  }

  onKey(ev){
    const st = this.playerService.state;
    const step = st && st.duration ? Math.max(1, (5 / st.duration) * this.seekScale) : this.seekScale / 100; // 5 seconds
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') {
      this.seekPercent = Math.min(this.seekScale, this.playerService.seekPercent + step); ev.preventDefault();
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
    return this.momentToString(this.elapsedMs());
  }

  getRemaining(){
    const st = this.playerService.state;
    if (!st || !st.duration) { return ''; }
    return this.momentToString(Math.max(0, st.duration * 1000 - this.elapsedMs()));
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
