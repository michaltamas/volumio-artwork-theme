class LayoutController {
  constructor($state, $scope, themeManager, $log, matchmediaService, playerService, awSettingsService) {
    'ngInject';
    this.$state = $state;
    // artwork settings shell (nav + side widgets around the settings/plugin pages)
    this.awSettings = awSettingsService;
    this.$scope = $scope;
    this.themeManager = themeManager;
    this.$log = $log;
    this.matchmediaService = matchmediaService;
    // exposed so the artwork theme's full-frame background can bind to the
    // currently playing cover from any screen (additive; other themes ignore it)
    this.playerService = playerService;

    this.wrapperColumnClass = '';

    this.initMainMenu();

    this.updateTabbar();
    // $locationChangeStart fires before the state switches (browser back/forward: $state.current
    // is still the old page), so re-evaluate once the transition has landed as well
    $scope.$on('$locationChangeStart', (event, next, current) => {
      this.updateTabbar();
    });
    $scope.$on('$stateChangeSuccess', () => {
      this.updateTabbar();
    });
    $scope.$on('artwork:npClosing', () => { this.isWithPlaybackBar = false; });

    if (this.themeManager.theme === 'artwork') {
      this.initArtworkPalette();
    }
  }

  // Artwork theme: settings pages render inside a 3-pane shell (desktop only)
  get isSettingsShell() {
    if (this.themeManager.theme !== 'artwork' || this.matchmediaService.isPhone) { return false; }
    const n = this.$state.current.name;
    return n === 'volumio.settings' || n === 'volumio.plugin' || n === 'volumio.plugin-manager';
  }

  // Artwork theme: the UI ground colour is sampled from the current cover and
  // crossfades on track change (spec §4.3 / §7.1). Registration of the
  // animatable @property and the color-mix scrim happens here at runtime
  // because the legacy SCSS→CSSO build cannot parse either.
  initArtworkPalette() {
    // NOTE: we deliberately do NOT CSS.registerProperty('--art-1'/'--art-2').
    // On the device's Chromium a registered @property ignores later inline
    // sets and always returns its initial-value, so plain (unregistered)
    // custom properties are used instead. The trade-off is that the palette
    // snaps on track change rather than interpolating (smooth crossfade is a
    // later refinement via a two-layer scrim).
    if (!document.getElementById('artwork-palette-style')) {
      const st = document.createElement('style');
      st.id = 'artwork-palette-style';
      // color-mix + the sampled scrim live here (runtime) because the legacy
      // SCSS→CSSO build cannot parse color-mix().
      st.textContent =
        '.art-scrim{background:linear-gradient(180deg,' +
          'color-mix(in oklch,var(--art-1) 58%,rgba(6,10,13,.5)) 0%,' +
          'color-mix(in oklch,var(--art-2) 86%,rgba(6,10,13,.9)) 50%,' +
          'rgba(6,10,13,.96) 100%);' +
          'transition:opacity .6s ease;}';
      document.head.appendChild(st);
    }
    this.$scope.$watch(
      () => this.playerService.state && this.playerService.state.albumart,
      () => this.sampleCover()
    );
  }

  sampleCover() {
    const url = this.playerService.albumart;
    if (!url) { return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const n = 16;
        const cv = document.createElement('canvas'); cv.width = n; cv.height = n;
        const ctx = cv.getContext('2d');
        ctx.drawImage(img, 0, 0, n, n);
        const data = ctx.getImageData(0, 0, n, n).data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
          if (l < 24 || l > 230) { continue; } // drop near-black / near-white
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
        }
        if (!count) { return; }
        const hsl = this.rgbToHsl(r / count, g / count, b / count);
        const h = Math.round(hsl[0] * 360);
        const s = Math.round(Math.min(0.16, Math.max(0.05, hsl[1])) * 100); // keep a ground
        const root = document.documentElement.style;
        root.setProperty('--art-1', `hsl(${h}, ${s}%, 24%)`);
        root.setProperty('--art-2', `hsl(${h}, ${s}%, 17%)`);
      } catch (e) { /* cross-origin taint — keep the fixed fallback scrim */ }
    };
    img.src = url;
  }

  rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0; const l = (max + min) / 2;
    const d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        default: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h, s, l];
  }

  updateTabbar(){
    this.isWithPlaybackBar = this.$state.$current.name === 'volumio.playback' && ['volumio3', 'artwork'].indexOf(this.themeManager.theme) > -1;
  }

  initMainMenu(){
    this.wrapperColumnClass = this.matchmediaService.isPhone ?
      '' :
      'col-md-20' ;
  }

  swipeLeft() {
    const currentState = this.$state.current.name;
    this.$log.debug(this.$state.current.name);
    switch (currentState) {
      case 'volumio.browse':
        this.$state.go('volumio.playback');
        break;
      case 'volumio.playback':
        this.$state.go('volumio.play-queue');
        break;
    }
  }

  swipeRight() {
    const currentState = this.$state.current.name;
    switch (currentState) {
      case 'volumio.play-queue':
        this.$state.go('volumio.playback');
        break;
      case 'volumio.playback':
        this.$state.go('volumio.browse');
        break;
    }
  }
}

export default LayoutController;
