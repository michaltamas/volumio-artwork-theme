class PlaybackController {
  constructor($rootScope, playerService, matchmediaService, $state, multiRoomService, socketService, playQueueService, $timeout, themeManager, $document, awQueuePanel, awMobileMenu, awSignal, awTrackInfo, awLyrics, $window) {
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
    this.signal = awSignal;
    this.info = awTrackInfo;
    this.lyrics = awLyrics;
    this.$window = $window;
    // the right column shows the cover's company, the info, or the lyrics (handoff 6a); the
    // choice is this browser's and outlives the page
    this.views = ['cover', 'info', 'lyrics'];
    this.npView = this.readView();

    $rootScope.$on('$stateChangeStart', (event, toState, toStateParams, fromState, fromParams) => {
      this.previousState = fromState.name;
      //$rootScope.previousStateParams = fromParams;
    });

    if (this.themeManager.theme === 'artwork') { this.initFitCover(); }
  }

  // The header readouts — zone, output, resample step, bit perfect — come from the shared
  // signal service (the ambient display reads the same one).
  get npRoom() { return this.signal.room; }
  get npOutput() { return this.signal.output; }
  get npYear() { return this.info.year; }       // from the library's album, local music only
  get npGenre() { return this.info.genre; }

  // --- the right column's face: cover · info · lyrics ------------------------------------
  readView() {
    try { const v = this.$window.localStorage.getItem('aw-np-view'); return this.views.indexOf(v) > -1 ? v : 'cover'; } catch (e) { return 'cover'; }
  }
  setView(v) {
    if (this.views.indexOf(v) < 0) { return; }
    this.npView = v;
    try { this.$window.localStorage.setItem('aw-np-view', v); } catch (e) { /* nothing to remember it with */ }
  }
  toggleLyrics() { this.setView(this.npView === 'lyrics' ? 'cover' : 'lyrics'); this.$timeout(() => this.fitCover(), 60, false); }
  get lyricsOn() { return this.npView === 'lyrics'; }
  // the words follow the same clock as the seek bar: inside the track, nothing when stopped
  get lyricsIndex() {
    if (this.lyrics.state !== 'synced') { return -1; }
    return this.lyrics.indexAt(this.elapsedMs());
  }
  elapsedMs() {
    const st = this.playerService.state;
    if (!st || st.status === 'stop') { return 0; }
    const ms = this.playerService.elapsedTime || 0;
    const duration = st.duration ? st.duration * 1000 : 0;
    return duration ? Math.min(Math.max(0, ms), duration) : Math.max(0, ms);
  }
  // how far a line sits from the one that plays: the ramp of the column
  lineClass(i) {
    const c = this.lyricsIndex, d = i - c;
    if (d === 0) { return 'is-now'; }
    if (d < 0) { return d === -1 ? 'is-dim' : 'is-faint'; }
    return d === 1 ? 'is-muted' : (d === 2 ? 'is-dim' : 'is-faint');
  }
  // a tap on a synced line seeks there (the seek bar's own path: percent of the scale)
  seekToLine(line) {
    const st = this.playerService.state;
    if (!line || !st || !st.duration || st.disableUi) { return; }
    const scale = this.playerService._seekScale || 1000;
    const p = Math.min(1, Math.max(0, line.t / (st.duration * 1000)));
    this.playerService.stopSeek();
    this.playerService.elapsedTime = line.t;
    this.playerService.calculateElapsedTimeString();
    this.playerService.seekPercent = Math.round(p * scale);
    this.playerService.seek = Math.round(p * scale);
  }
  get lyricsPlainLines() { return this.lyrics.plain ? this.lyrics.plain.split(/\r?\n/) : []; }
  get npResample() { return this.signal.resample; }
  get npBitPerfect() { return this.signal.bitPerfect; }

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
  splitVal(s) { return this.signal.splitVal(s); }
  get npBit()  { return this.splitVal(this.playerService.state && this.playerService.state.bitdepth); }
  get npRate() { return this.splitVal(this.playerService.state && this.playerService.state.samplerate); }
  get npFormat() { return this.signal.format(this.playerService.state); }   // "FLAC · QOBUZ"
  get npSignal() { return this.signal.signal(this.playerService.state); }   // "24/48"

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
    if (!phone || this.lyricsOn) { return; }   // the Lyrics face crops the cover to a band; the stylesheet sizes it
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
