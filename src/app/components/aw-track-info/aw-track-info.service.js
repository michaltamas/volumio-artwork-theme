/**
 * What the library knows about the album that plays.
 *
 * The playback state names the track, the artist and the album, but not the year or the genre;
 * those live on the album in the library (`albums://Artist/Album` answers with an `info` that
 * carries them). This service asks once per album, over the REST API rather than the browse
 * socket — a socket answer would land in the browse page and change what it shows — and keeps
 * the answers, so the year appears with the second track of an album without another request.
 * Local albums only: a streaming service's album is not in the library.
 */
const KEEP = 60;

class AwTrackInfoService {
  constructor($rootScope, $http, playerService, socketService) {
    'ngInject';
    this.$http = $http;
    this.playerService = playerService;
    this.socketService = socketService;
    this.cache = {};
    this.order = [];
    this.current = null;
    $rootScope.$watch(() => this.key(), () => this.refresh());
  }

  key() {
    const st = this.playerService.state || {};
    if (!st.artist || !st.album) { return ''; }
    return String(st.service || '') + '|' + st.artist + '|' + st.album;
  }

  // year and genre of the album that plays, or empty while unknown
  get year() { return this.current ? this.current.year : ''; }
  get genre() { return this.current ? this.current.genre : ''; }
  get tracks() { return this.current ? this.current.tracks : 0; }

  refresh() {
    const k = this.key();
    this.current = null;
    if (!k) { return; }
    if (this.cache[k]) { this.current = this.cache[k]; return; }
    const st = this.playerService.state || {};
    if (String(st.service || '') !== 'mpd') { return; }
    const uri = 'albums://' + encodeURIComponent(st.artist) + '/' + encodeURIComponent(st.album);
    const host = this.socketService.host || '';
    this.$http.get(host + '/api/v1/browse', { params: { uri: uri } }).then((res) => {
      const info = (res.data && res.data.navigation && res.data.navigation.info) || {};
      const lists = (res.data && res.data.navigation && res.data.navigation.lists) || [];
      let tracks = 0; lists.forEach(l => (l.items || []).forEach(it => { if (it && it.type === 'song') { tracks++; } }));
      const entry = { year: this.cleanYear(info.year), genre: String(info.genre || '').split(';')[0].trim(), tracks: tracks };
      this.remember(k, entry);
      if (this.key() === k) { this.current = entry; }
    }, () => { /* the library did not answer: the album stays without a year */ });
  }

  // "2012", "2012-05-01" and "2012/2013" all mean 2012
  cleanYear(v) {
    const m = /(\d{4})/.exec(String(v || ''));
    return m ? m[1] : '';
  }

  remember(k, entry) {
    if (!this.cache[k]) { this.order.push(k); }
    this.cache[k] = entry;
    while (this.order.length > KEEP) { delete this.cache[this.order.shift()]; }
  }
}

export default AwTrackInfoService;
