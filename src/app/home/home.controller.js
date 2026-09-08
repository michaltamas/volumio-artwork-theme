class HomeController {
  constructor($state, $scope, playerService, socketService, browseService) {
    'ngInject';
    this.$state = $state;
    this.$scope = $scope;
    this.playerService = playerService;
    this.socketService = socketService;
    this.browseService = browseService;

    // "Pick up where you left off" — the currently loaded track/album.
    // (Volumio Free has no play-history, so this is the best real signal.)

    // Recent albums shelf — best-effort fetch from the music library.
    this.recentAlbums = [];
    this.fetchRecentAlbums();
  }

  // Continue hero getters (real player state)
  get continueTitle() {
    const s = this.playerService.state || {};
    return s.album || s.title || '';
  }
  get continueArtist() {
    const s = this.playerService.state || {};
    return s.artist || '';
  }
  get continueArt() { return this.playerService.albumart; }
  get hasContinue() { return !!this.continueArt && !!this.continueTitle; }

  resume() {
    // resume the current queue; play() is a no-op-safe toggle
    if (this.playerService.state && this.playerService.state.status !== 'play') {
      this.playerService.play();
    }
    this.$state.go('volumio.playback');
  }

  fetchRecentAlbums() {
    const handler = (data) => {
      if (this.recentAlbums.length) { return; }
      try {
        const lists = (data && data.navigation && data.navigation.lists) || [];
        let items = [];
        lists.forEach(l => { items = items.concat(l.items || []); });
        items = items.filter(i => i && i.albumart && (i.type === 'folder' || i.type === 'album' || i.title || i.album));
        if (items.length) { this.recentAlbums = items.slice(0, 12); }
      } catch (e) { /* ignore */ }
    };
    this.socketService.on('pushBrowseLibrary', handler);
    // 'albums://' is Volumio's music-library albums view
    this.socketService.emit('browseLibrary', { uri: 'albums://' });
  }

  openAlbum(item) {
    if (!item) { return; }
    this.browseService.historyUri = [];
    this.$state.go('volumio.browse');
    this.browseService.fetchLibrary(item);
  }

  goTo(state) { this.$state.go(state); }
}

export default HomeController;
