class HomeController {
  constructor($state, $scope, $http, playerService, socketService, browseService, awMobileMenu) {
    'ngInject';
    this.awMenu = awMobileMenu;
    this.$state = $state;
    this.$scope = $scope;
    this.$http = $http;
    this.playerService = playerService;
    this.socketService = socketService;
    this.browseService = browseService;

    // "Pick up where you left off" — the currently loaded track/album.
    // (Volumio Free has no play-history, so this is the best real signal.)

    // header tabs = the real browse sources; recent albums = albums of the recently
    // played tracks (Last_100), resolved to library albums. Read over the same-origin
    // REST proxy so the socket-driven browse view is never touched.
    this.sources = [];
    this.recentAlbums = [];
    this.shelfPage = 0;
    this.shelfSize = 6;
    this.loadSources();
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

  browse(uri) {
    return this.$http.get('/api/v1/browse', { params: { uri: uri } }).then(res => {
      const lists = (res.data && res.data.navigation && res.data.navigation.lists) || [];
      return lists;
    }, () => []);
  }

  // tabs after "Library": streaming services and web radio, as Volumio reports them
  loadSources() {
    this.browse(undefined).then(lists => {
      const local = ['favourites', 'playlists', 'music-library', 'artists://', 'albums://', 'genres://', 'upnp', 'Last_100'];
      this.sources = lists.filter(s => s && s.uri && local.indexOf(s.uri) === -1 && s.enabled !== false);
    });
  }

  openSource(source) {
    this.browseService.historyUri = [];
    this.$state.go('volumio.browse');
    this.browseService.fetchLibrary(source);
  }

  // recently played albums: Last_100 tracks → unique (artist, album) in play order → the
  // matching album from albums:// (gives the album uri and artwork). No history → no shelf.
  fetchRecentAlbums() {
    Promise.all([this.browse('Last_100'), this.browse('albums://')]).then(([recentLists, albumLists]) => {
      const key = i => (String(i.artist || '') + '|' + String(i.album || i.title || '')).toLowerCase();
      const albums = {};
      albumLists.forEach(l => (l.items || []).forEach(a => { albums[(String(a.artist || '') + '|' + String(a.title || '')).toLowerCase()] = a; }));
      const seen = {}; const out = [];
      recentLists.forEach(l => (l.items || []).forEach(t => {
        const k = key(t);
        if (!t.album || seen[k]) { return; }
        seen[k] = true;
        const album = albums[k];
        if (album) { out.push(album); }
      }));
      this.recentAlbums = out.slice(0, 24);
      this.shelfPage = 0;
      this.$scope.$applyAsync();
    });
  }

  get shelfItems() {
    const start = this.shelfPage * this.shelfSize;
    return this.recentAlbums.slice(start, start + this.shelfSize);
  }
  get shelfPages() { return Math.ceil(this.recentAlbums.length / this.shelfSize); }
  get canShelfPrev() { return this.shelfPage > 0; }
  get canShelfNext() { return this.shelfPage < this.shelfPages - 1; }
  shelfPrev() { if (this.canShelfPrev) { this.shelfPage--; } }
  shelfNext() { if (this.canShelfNext) { this.shelfPage++; } }

  openAlbum(item) {
    if (!item) { return; }
    this.browseService.historyUri = [];
    this.$state.go('volumio.browse');
    this.browseService.fetchLibrary(item);
  }

  goTo(state) { this.$state.go(state); }
}

export default HomeController;
