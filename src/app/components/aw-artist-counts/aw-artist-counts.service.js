/**
 * How many albums an artist has, for the Artists grid (mockup: "7 albums" under the name).
 *
 * Volumio's artist list carries names and portraits only; the count is in the artist's own
 * page, where the albums are the folder entries. This asks the REST proxy for an artist's page
 * once and remembers the answer; the memory is dropped when the collection's totals change,
 * so a fresh scan shows fresh counts. Tiles ask as they scroll into view, so a library of
 * hundreds of artists costs only the tiles that were seen.
 */
class AwArtistCountsService {
  constructor($http) {
    'ngInject';
    this.$http = $http;
    this.counts = {};
    this.stamp = '';
  }

  // the collection's totals: when they moved, what was remembered is stale
  refresh() {
    return this.$http.get('/api/v1/collectionstats').then(r => {
      const s = r.data || {};
      const stamp = [s.artists, s.albums, s.songs].join('/');
      if (stamp !== this.stamp) { this.stamp = stamp; this.counts = {}; }
    }).catch(() => {});
  }

  // a promise of the number of albums behind an artists:// uri (the folders on its page)
  count(uri) {
    if (!uri) { return Promise.resolve(null); }
    if (this.counts[uri] !== undefined) { return Promise.resolve(this.counts[uri]); }
    const p = this.$http.get('/api/v1/browse?uri=' + encodeURIComponent(uri)).then(r => {
      const lists = (r.data && r.data.navigation && r.data.navigation.lists) || [];
      let n = 0;
      lists.forEach(l => (l.items || []).forEach(it => { if (it && it.type === 'folder') { n++; } }));
      this.counts[uri] = n;
      return n;
    }).catch(() => { delete this.counts[uri]; return null; });
    this.counts[uri] = p;
    return p;
  }

  text(n) { return n === null || n === undefined ? '' : n + (n === 1 ? ' album' : ' albums'); }
}

export default AwArtistCountsService;
