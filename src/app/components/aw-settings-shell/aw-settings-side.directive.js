export default class AwSettingsSideDirective {
  constructor(themeManager) {
    'ngInject';
    return {
      restrict: 'E',
      templateUrl: themeManager.getHtmlPath('settings-side', 'components/settings-shell'),
      scope: {},
      controller: AwSettingsSideController,
      controllerAs: 'side',
      bindToController: true
    };
  }
}

class AwSettingsSideController {
  constructor(awSettingsService, playerService) {
    'ngInject';
    this.svc = awSettingsService;
    this.playerService = playerService;
    this.svc.load();
  }

  get key() { return this.svc.pageKey; }

  // "FLAC 24/48 · QOBUZ" from the live player state
  get source() {
    const st = this.playerService.state || {};
    const num = (s) => { const m = String(s || '').match(/^([\d.]+)/); return m ? m[1] : ''; };
    const fmt = String(st.trackType || st.stream || '').toUpperCase();
    const b = num(st.bitdepth), r = num(st.samplerate);
    const rate = b && r ? `${b}/${r}` : (b || r);
    const svc = st.service && st.service !== 'mpd' ? ` · ${String(st.service).toUpperCase()}` : '';
    return (fmt || rate) ? `${fmt}${rate ? ' ' + rate : ''}${svc}` : '';
  }
  get resampling()       { return this.svc.alsa ? this.svc.alsa.resampling : null; }
  get resamplingTarget() { return this.svc.alsa && this.svc.alsa.resamplingTarget ? `ON · ${this.svc.alsa.resamplingTarget}` : 'ON'; }
  get mixer() {
    const a = this.svc.alsa; if (!a) { return ''; }
    return [a.mixerType, a.mixer].filter(Boolean).join(' · ');
  }
  get output()   { return this.svc.alsa ? this.svc.alsa.output : ''; }
  get scanning() { return !!(this.playerService.state && this.playerService.state.updatedb); }
}
