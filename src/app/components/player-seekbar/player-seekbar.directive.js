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
  constructor(playerService, $timeout, matchmediaService) {
    'ngInject';
    this.playerService = playerService;
    this.$timeout = $timeout;
    this.matchmedia = matchmediaService;

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
      const window = Math.sin(Math.PI * i / (n - 1)); // 0..1..0 envelope
      out.push(5 + Math.round((0.35 + 0.65 * rnd()) * window * 41)); // 5..46 px
    }
    return out;
  }

  get waveScale(){ return this.playerService._seekScale || 1000; }

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
