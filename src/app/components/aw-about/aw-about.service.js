/**
 * About the artist and the record that play — for the Info face of Now Playing.
 *
 * Volumio's state names them and nothing more. MusicBrainz knows who they are (type, country,
 * when they began; an album's first release) and where their Wikipedia page is (through
 * Wikidata); Wikipedia gives the opening paragraph and a picture. All three answer the
 * browser directly (CORS), none needs a key; MusicBrainz asks for one request a second, so its
 * calls go through one queue. A name that MusicBrainz is not sure about (score under 90) shows
 * nothing rather than someone else's life. Answers are kept per artist and per album.
 */
const KEEP = 40;
const MB = 'https://musicbrainz.org/ws/2/';
const MB_GAP = 1100;
const WIKI_SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const WIKIDATA = 'https://www.wikidata.org/w/api.php';

class AwAboutService {
  constructor($rootScope, $http, $q, playerService) {
    'ngInject';
    this.$http = $http;
    this.$q = $q;
    this.playerService = playerService;
    this.artists = {}; this.albums = {}; this.order = [];
    this.artist = null; this.album = null;
    this.mbLast = 0; this.mbChain = $q.resolve();
    $rootScope.$watch(() => this.keys().join('|'), () => this.refresh());
  }

  keys() {
    const st = this.playerService.state || {};
    const artist = String(st.artist || '').trim(), album = String(st.album || '').trim();
    return [artist, artist && album ? album : ''];
  }

  refresh() {
    const [artist, album] = this.keys();
    this.artist = null; this.album = null;
    if (!artist) { return; }
    this.lookupArtist(artist).then(a => { if (this.keys()[0] === artist) { this.artist = a; } });
    if (album) { this.lookupAlbum(artist, album).then(a => { if (this.keys()[1] === album) { this.album = a; } }); }
  }

  // ---- MusicBrainz, one call at a time, a second apart
  mb(path, params) {
    const run = () => {
      const wait = Math.max(0, this.mbLast + MB_GAP - Date.now());
      return this.$q(res => setTimeout(res, wait)).then(() => {
        this.mbLast = Date.now();
        return this.$http.get(MB + path, { params: Object.assign({ fmt: 'json' }, params || {}) }).then(r => r.data);
      });
    };
    const p = this.mbChain.then(run, run);
    this.mbChain = p.catch(() => {});
    return p;
  }
  lucene(v) { return '"' + String(v).replace(/["\\]/g, ' ').trim() + '"'; }

  // ---- Wikipedia's opening paragraph for a Wikidata item, or null when there is no English page
  wiki(rels) {
    const rel = (rels || []).find(r => r.type === 'wikidata' && r.url && r.url.resource);
    const m = rel && /\/(Q\d+)$/.exec(rel.url.resource);
    if (!m) { return this.$q.resolve(null); }
    return this.$http.get(WIKIDATA, { params: { action: 'wbgetentities', ids: m[1], props: 'sitelinks', sitefilter: 'enwiki', format: 'json', origin: '*' } })
      .then(r => { const e = r.data && r.data.entities && r.data.entities[m[1]]; const t = e && e.sitelinks && e.sitelinks.enwiki && e.sitelinks.enwiki.title; return t ? this.summary(t) : null; })
      .catch(() => null);
  }
  summary(title) {
    return this.$http.get(WIKI_SUMMARY + encodeURIComponent(String(title).replace(/ /g, '_')))
      .then(r => { const d = r.data || {}; if (!d.extract) { return null; } return { extract: String(d.extract), description: String(d.description || ''), url: d.content_urls && d.content_urls.desktop && d.content_urls.desktop.page || '', thumb: d.thumbnail && d.thumbnail.source || '' }; })
      .catch(() => null);
  }

  // ---- the artist: who, where from, since when; the page
  lookupArtist(name) {
    if (this.artists[name]) { return this.$q.resolve(this.artists[name]); }
    const p = this.mb('artist/', { query: 'artist:' + this.lucene(name), limit: 1 }).then(d => {
      const a = d && d.artists && d.artists[0];
      if (!a || a.score < 90) { return null; }
      return this.mb('artist/' + a.id, { inc: 'url-rels' }).then(full => this.wiki(full.relations).then(w => {
        const begin = (a['life-span'] && a['life-span'].begin || '').slice(0, 4);
        return {
          name: a.name, kind: a.type || '', country: a.country || (a.area && a.area.name) || '', begin: begin,
          since: begin ? (a.type === 'Group' ? 'FORMED ' : a.type === 'Person' ? 'BORN ' : 'SINCE ') + begin : '',
          mbUrl: 'https://musicbrainz.org/artist/' + a.id,
          extract: w ? w.extract : '', description: w ? w.description : '', url: w ? w.url : '', thumb: w ? w.thumb : ''
        };
      }));
    }).catch(() => null);
    this.remember(this.artists, name, p);
    return p;
  }

  // ---- the record: first released when, what kind; the page when it has one
  lookupAlbum(artist, album) {
    const k = artist + '|' + album;
    if (this.albums[k]) { return this.$q.resolve(this.albums[k]); }
    const p = this.mb('release-group/', { query: 'artist:' + this.lucene(artist) + ' AND releasegroup:' + this.lucene(album) + ' AND primarytype:album', limit: 1 }).then(d => {
      const g = d && d['release-groups'] && d['release-groups'][0];
      if (!g || g.score < 90) { return null; }
      return this.mb('release-group/' + g.id, { inc: 'url-rels' }).then(full => this.wiki(full.relations).then(w => ({
        title: g.title, date: g['first-release-date'] || '', year: (g['first-release-date'] || '').slice(0, 4),
        kind: [g['primary-type']].concat(g['secondary-types'] || []).filter(Boolean).join(' · '),
        mbUrl: 'https://musicbrainz.org/release-group/' + g.id,
        extract: w ? w.extract : '', url: w ? w.url : ''
      })));
    }).catch(() => null);
    this.remember(this.albums, k, p);
    return p;
  }

  remember(map, k, v) {
    map[k] = v; this.order.push([map, k]);
    while (this.order.length > KEEP) { const [m, key] = this.order.shift(); delete m[key]; }
  }
}

export default AwAboutService;
