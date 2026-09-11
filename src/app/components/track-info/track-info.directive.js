class TrackInfoDirective {
  constructor(themeManager) {
    'ngInject';
    let directive = {
      restrict: 'E',
      templateUrl: themeManager.getHtmlPath('track-info', 'components/track-info'),
      controller: TrackInfoController,
      controllerAs: 'trackInfo',
      bindToController: true,
      scope: {
        isInFooter: "@"
      }
    };
    return directive;
  }
}

class TrackInfoController {
  constructor($scope, playerService) {
    'ngInject';
    this.$scope = $scope;
    this.playerService = playerService;

    this.isInFooter = this.$scope.isInFooter || false;
  }

  // mini player quality line (mockup "24/192 · FLAC"): bit depth / sample rate as numbers,
  // else whichever Volumio reports (rate, depth, or a stream's bitrate)
  get rateLine() {
    const st = this.playerService.state || {};
    const num = (s) => { const m = String(s || '').trim().match(/^([\d.]+)/); return m ? m[1] : ''; };
    const b = num(st.bitdepth), r = num(st.samplerate);
    if (b && r) { return b + '/' + r; }
    return String(st.samplerate || st.bitdepth || st.bitrate || '').trim();
  }

  get formatLabel() {
    const st = this.playerService.state || {};
    return st.trackType && st.trackType !== 'webradio' ? String(st.trackType).toUpperCase() : '';
  }


}

export default TrackInfoDirective;
