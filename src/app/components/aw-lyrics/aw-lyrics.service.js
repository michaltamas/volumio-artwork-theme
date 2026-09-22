/**
 * The words of the track that plays, from LRCLIB.
 *
 * LRCLIB (lrclib.net) is a free, open lyrics database: no key, CORS open, one request per
 * track. It answers with synced lyrics (timestamped lines), plain lyrics, or nothing — and
 * says when a track is instrumental. This service asks once per track, 300 ms after the track
 * settles, keeps the answers, and tells the pages what it has: `synced`, `plain`, `none`, or
 * `loading` in between. Nothing is asked for web radio, or while nothing plays.
 *
 * Only what the player knows goes out: artist, title, album, duration. Volumio's local titles
 * often carry the track number ("1 - Liberty"); that is stripped before asking.
 */
const API = 'https://lrclib.net/api';
const CLIENT = 'ArtworkOne/2.0 (https://github.com/michaltamas/volumio-artwork-theme)';
const KEEP = 50;
const LRC_LINE = /^\s*((?:\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\])+)\s*(.*)$/;
const LRC_STAMP = /\[(\d{1,2}):(\d{2})(?:[.:](\d{1,3}))?\]/g;

class AwLyricsService {
  constructor($rootScope, $http, $timeout, playerService) {
    'ngInject';
    this.$http = $http;
    this.$timeout = $timeout;
    this.playerService = playerService;
    this.cache = {};
    this.order = [];
    this.state = 'none';      // loading | synced | plain | none
    this.lines = [];          // synced: [{t: ms, text}]
    this.plain = '';
    this.key = '';
    this.pending = null;
    $rootScope.$watch(() => this.trackKey(), () => this.schedule());
  }

  trackKey() {
    const st = this.playerService.state || {};
    if (!st.title || st.status === 'stop') { return ''; }
    return [st.artist || '', this.cleanTitle(st.title), st.album || '', st.duration || 0].join('|');
  }

  // "01 - Liberty", "1. Liberty", "A1. In Chains" → the title
  cleanTitle(t) {
    return String(t || '').replace(/^\s*[A-Da-d]?\d{1,3}\s*[-.–]\s+/, '').trim();
  }

  schedule() {
    if (this.pending) { this.$timeout.cancel(this.pending); this.pending = null; }
    const k = this.trackKey();
    this.key = k;
    if (!k) { this.show({ state: 'none', lines: [], plain: '' }); return; }
    if (this.cache[k]) { this.show(this.cache[k]); return; }
    const st = this.playerService.state || {};
    // a stream has no words to fetch, and no duration to match on
    if (st.stream === true || !st.duration) { this.show({ state: 'none', lines: [], plain: '' }); return; }
    this.show({ state: 'loading', lines: [], plain: '' });
    this.pending = this.$timeout(() => this.fetch(k, st), 300, false);
  }

  show(entry) {
    this.state = entry.state;
    this.lines = entry.lines;
    this.plain = entry.plain;
  }

  fetch(k, st) {
    const params = { artist_name: st.artist || '', track_name: this.cleanTitle(st.title), duration: Math.round(st.duration) };
    if (st.album) { params.album_name = st.album; }
    const headers = { 'Lrclib-Client': CLIENT };
    const settle = (entry) => { this.remember(k, entry); if (this.key === k) { this.show(entry); } };
    this.$http.get(API + '/get', { params: params, headers: headers })
      .then((res) => settle(this.parse(res.data)))
      .catch(() => {
        // no exact record: the nearest one by artist and title, if any
        return this.$http.get(API + '/search', { params: { artist_name: params.artist_name, track_name: params.track_name }, headers: headers })
          .then((res) => {
            const list = Array.isArray(res.data) ? res.data : [];
            const hit = list.find(r => r.syncedLyrics) || list.find(r => r.plainLyrics) || list[0];
            settle(hit ? this.parse(hit) : { state: 'none', lines: [], plain: '' });
          })
          .catch(() => settle({ state: 'none', lines: [], plain: '' }));
      });
  }

  parse(rec) {
    if (!rec || rec.instrumental) { return { state: 'none', lines: [], plain: '' }; }
    if (rec.syncedLyrics) {
      const lines = this.parseLrc(rec.syncedLyrics);
      if (lines.length) { return { state: 'synced', lines: lines, plain: rec.plainLyrics || '' }; }
    }
    if (rec.plainLyrics && rec.plainLyrics.trim()) { return { state: 'plain', lines: [], plain: rec.plainLyrics.trim() }; }
    return { state: 'none', lines: [], plain: '' };
  }

  // "[00:28.03] I should have known" → {t: 28030, text}; a line with several stamps is repeated;
  // empty lines (an instrumental break) are kept, so the marker rests on nothing meanwhile
  parseLrc(text) {
    const out = [];
    String(text).split(/\r?\n/).forEach((raw) => {
      const m = LRC_LINE.exec(raw);
      if (!m) { return; }
      const body = m[2].trim();
      let s;
      LRC_STAMP.lastIndex = 0;
      while ((s = LRC_STAMP.exec(m[1])) !== null) {
        const frac = s[3] ? parseInt((s[3] + '00').slice(0, 3), 10) : 0;
        out.push({ t: (parseInt(s[1], 10) * 60 + parseInt(s[2], 10)) * 1000 + frac, text: body });
      }
    });
    out.sort((a, b) => a.t - b.t);
    return out;
  }

  // the line that plays at `ms`: the last one whose time has come, -1 before the first
  indexAt(ms) {
    const L = this.lines;
    let i = -1;
    for (let n = 0; n < L.length; n++) { if (L[n].t <= ms) { i = n; } else { break; } }
    return i;
  }

  remember(k, entry) {
    if (!this.cache[k]) { this.order.push(k); }
    this.cache[k] = entry;
    while (this.order.length > KEEP) { delete this.cache[this.order.shift()]; }
  }
}

export default AwLyricsService;
