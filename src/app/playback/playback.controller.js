class PlaybackController {
  constructor($rootScope, playerService, matchmediaService, $state, multiRoomService, socketService, playQueueService, $timeout, themeManager, $document, awQueuePanel, awMobileMenu) {
    'ngInject';
    this.awQueue = awQueuePanel;
    this.awMenu = awMobileMenu;
    this.$state = $state;
    this.$rootScope = $rootScope;
    this.$timeout = $timeout;
    this.themeManager = themeManager;
    this.$document = $document;
    this.playerService = playerService;
    this.matchmediaService = matchmediaService;
    this.$state = $state;
    this.multiRoomService = multiRoomService;
    this.socketService = socketService;
    this.playQueueService = playQueueService;
    this.previousState = 'volumio.browse';
    this.npOutput = '';

    $rootScope.$on('$stateChangeStart', (event, toState, toStateParams, fromState, fromParams) => {
      this.previousState = fromState.name;
      //$rootScope.previousStateParams = fromParams;
    });

    // Now Playing header readout: current audio output device (spec §6.1)
    this.npAlsa = null;
    this.fetchOutputDevice();
    if (this.themeManager.theme === 'artwork') { this.initFitCover(); }
  }

  // Zone / room = the self device in the multiroom list.
  get npRoom() {
    let list = (this.multiRoomService && this.multiRoomService.devices) || [];
    if (list && list.list) { list = list.list; }
    if (!Array.isArray(list)) { return ''; }
    const self = list.find(d => d && d.isSelf);
    return self ? self.name : '';
  }

  // Output device (DAC) for the header readout. Volumio doesn't expose it in
  // playback state, so read it from the ALSA-controller plugin UI config
  // (the same getUiConfig/pushUiConfig path the Playback Options page uses).
  fetchOutputDevice() {
    const handler = (cfg) => {
      if (!cfg) { return; }
      const found = {};
      const walk = (arr) => (arr || []).forEach((el) => {
        if (!el) { return; }
        const id = String(el.id || '');
        if (id) {
          const v = el.value;
          found[id] = (v && typeof v === 'object') ? (v.label !== undefined ? v.label : v.value) : v;
        }
        if (el.content) { walk(el.content); }
      });
      try {
        if (cfg.sections) { cfg.sections.forEach(s => walk(s.content)); }
        if (cfg.content) { walk(cfg.content); }
      } catch (e) { return; }
      if (found.output_device === undefined) { return; } // a different plugin's config
      this.npOutput = found.output_device ? String(found.output_device) : this.npOutput;
      const res = found.resampling;
      this.npAlsa = {
        resampling: (res === true || res === 'true') ? true : ((res === false || res === 'false') ? false : null),
        bitdepth: this.alsaTarget(found.resampling_target_bitdepth),
        samplerate: this.alsaTarget(found.resampling_target_samplerate),
        mixerType: found.mixer_type ? String(found.mixer_type) : ''
      };
    };
    this.socketService.on('pushUiConfig', handler);
    this.socketService.emit('getUiConfig', { page: 'audio_interface/alsa_controller' });
  }

  // "*" and "Native" both mean "leave this as the track has it"
  alsaTarget(v) {
    const s = String(v === undefined || v === null ? '' : v).trim();
    if (!s || s === '*' || /native/i.test(s)) { return ''; }
    return s;
  }

  // The resample step of the signal path, from the player's real playback settings.
  // Empty while the settings are unknown, so the path never claims something untrue.
  get npResample() {
    const a = this.npAlsa;
    if (!a || a.resampling === null) { return ''; }
    if (!a.resampling) { return 'NO RESAMPLE'; }
    const target = [a.bitdepth, a.samplerate].filter(Boolean).join(' / ');
    return target ? 'RESAMPLE ' + target : 'RESAMPLE';
  }

  // Bit perfect means the stream reaches the DAC untouched: no resampling, and the volume
  // is not applied in software. Hidden while the settings are unknown.
  get npBitPerfect() {
    const a = this.npAlsa;
    if (!a || a.resampling === null) { return false; }
    const mixer = String(a.mixerType || '').toLowerCase();
    return a.resampling === false && (mixer === 'hardware' || mixer === 'none' || mixer === 'disabled');
  }

  // Zones & outputs sheet (the mini player's zone button opens the same one)
  openOutputs() { this.$rootScope.$broadcast('volumio:toggleOutputs'); }

  // next few tracks in the queue, for the Now Playing "UP NEXT" filmstrip
  get upNext() {
    try {
      const q = (this.playQueueService && this.playQueueService.queue) || [];
      const pos = (this.playerService.state && this.playerService.state.position) || 0;
      return q.slice(pos + 1, pos + 4);
    } catch (e) { return []; }
  }

  // Up Next cover i → the queue entry right after the current one
  playUpNext(i) {
    const pos = (this.playerService.state && this.playerService.state.position) || 0;
    this.playQueueService.play(pos + 1 + i);
  }

  // --- Now Playing readouts derived from real player state (spec §5.4–5.6) ---
  // "24 bit" -> {n:"24", u:"bit"}, "48 kHz" -> {n:"48", u:"kHz"}
  splitVal(s) {
    const m = String(s || '').trim().match(/^([\d.]+)\s*(.*)$/);
    return m ? { n: m[1], u: m[2] } : { n: '', u: String(s || '') };
  }
  get npBit()  { return this.splitVal(this.playerService.state && this.playerService.state.bitdepth); }
  get npRate() { return this.splitVal(this.playerService.state && this.playerService.state.samplerate); }

  // "FLAC · QOBUZ": format, plus the service when it is a streaming source
  get npFormat() {
    const st = this.playerService.state || {};
    const fmt = String(st.trackType || st.stream || '').toUpperCase();
    const svc = String(st.service || '');
    return svc && svc !== 'mpd' ? `${fmt} · ${svc.toUpperCase()}` : fmt;
  }

  // "24/48" for the signal path
  get npSignal() {
    const b = this.npBit.n, r = this.npRate.n;
    return b && r ? `${b}/${r}` : (b || r || '');
  }

  get npQueueLen() {
    const q = (this.playQueueService && this.playQueueService.queue) || [];
    return q.length;
  }
  get npTrackPos() {
    const st = this.playerService.state || {};
    return (typeof st.position === 'number' ? st.position : 0) + 1;
  }

  // Phone layout: the cover takes exactly what the other parts leave, measured (a title may wrap
  // to two or three lines), so the sheet never scrolls. Re-run on track/resize; cleared otherwise.
  fitCover() {
    const np = this.$document[0].getElementById('np'), cover = this.$document[0].getElementById('np-cover');
    if (!np || !cover) { return; }
    const phone = this.themeManager.theme === 'artwork' && window.matchMedia('(max-width: 700px) and (orientation: portrait)').matches;
    cover.style.width = '';
    if (!phone) { return; }
    const content = this.$document[0].getElementById('content');
    const avail = content ? content.clientHeight : window.innerHeight;
    const others = np.scrollHeight - cover.getBoundingClientRect().height;
    const maxW = np.clientWidth - 40 - 32; /* the sheet's 20px sides and the mockup's 16px inset */
    const size = Math.max(96, Math.min(maxW, avail - others));
    cover.style.width = size + 'px';
  }
  initFitCover() {
    const run = () => this.$timeout(() => this.fitCover(), 60, false);
    this.$rootScope.$watch(() => { const s = this.playerService.state || {}; return [s.title, s.artist, s.album, s.samplerate, s.bitdepth, s.trackType].join('|'); }, run);
    this._onResize = () => run();
    window.addEventListener('resize', this._onResize);
    run(); this.$timeout(() => this.fitCover(), 600, false);
  }

  // phone transport bar
  togglePlay() { const st = this.playerService.state || {}; if (st.status === 'play') { this.playerService.pause(); } else { this.playerService.play(); } }
  cycleRepeat() {
    const st = this.playerService.state || {};
    if (!st.repeat) { this.playerService.repeatAlbum(true, false); }
    else if (!st.repeatSingle) { this.playerService.repeatAlbum(true, true); }
    else { this.playerService.repeatAlbum(false, false); }
  }

  goBack() {
    // Artwork: slide the sheet down (and the mini player up) before leaving the state
    const np = this.themeManager.theme === 'artwork' && this.$document[0].getElementById('np');
    if (np && !np.classList.contains('aw-np-out')) {
      np.classList.add('aw-np-out');
      this.$rootScope.$broadcast('artwork:npClosing');
      this.$timeout(() => this.$state.go(this.previousState), 380, false);
      return;
    }
    this.$state.go(this.previousState);
  }
}

export default PlaybackController;
