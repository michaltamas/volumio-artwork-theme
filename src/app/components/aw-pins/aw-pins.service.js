/**
 * Pins: quick access on Home (handoff 10a/10b).
 *
 * Anything one keeps going back to in the library — a source, a folder, a playlist, an album,
 * a radio station — pinned from its row menu, shown as a row of tiles above everything else
 * on Home, dragged into order, unpinned from the tile's own menu. Not a rating: a shortcut.
 *
 * The list lives on the player when the companion plugin is there (every screen sees the same
 * pins) and in this browser otherwise. A pin keeps only what a tile needs: uri, service, type,
 * title, artwork.
 */
const KEY = 'aw-pins';
const MAX = 24;
const PINNABLE = ['folder', 'internal-folder', 'folder-with-favourites', 'remdisk', 'playlist', 'webradio', 'mywebradio', 'album', 'artist', 'streaming-category'];

class AwPinsService {
  constructor($rootScope, $window) {
    'ngInject';
    this.$rootScope = $rootScope;
    this.$window = $window;
    this.remote = null;     // set by the player-settings service when the plugin answers
    this.list = this.read();
  }

  read() {
    try { const v = JSON.parse(this.$window.localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.map(p => this.clean(p)).filter(Boolean) : []; } catch (e) { return []; }
  }

  // the player's word (companion plugin): from now on it is the list, and changes go back there
  adopt(pins, writer) {
    this.remote = writer;
    this.list = (Array.isArray(pins) ? pins : []).map(p => this.clean(p)).filter(Boolean);
    this.$rootScope.$broadcast('aw:pins', this.list);
  }

  save() {
    if (this.remote) { this.remote(this.list.slice()); return; }
    try { this.$window.localStorage.setItem(KEY, JSON.stringify(this.list)); } catch (e) { /* nothing to remember it with */ }
    this.$rootScope.$broadcast('aw:pins', this.list);
  }

  // a tile's worth of an item, and nothing more
  clean(item) {
    if (!item || !item.uri) { return null; }
    const out = { uri: String(item.uri).slice(0, 600), service: String(item.service || ''), type: String(item.type || ''), title: String(item.title || item.name || item.album || '').slice(0, 200) };
    if (item.albumart) { out.albumart = String(item.albumart).slice(0, 600); }
    if (item.artist) { out.artist = String(item.artist).slice(0, 200); }
    if (item.album) { out.album = String(item.album).slice(0, 200); }
    return out;
  }

  canPin(item) {
    if (!item || !item.uri) { return false; }
    const t = String(item.type || '');
    if (PINNABLE.indexOf(t) > -1) { return true; }
    // the album list's entries are folders in Volumio's terms; a source is a folder with a service
    return /^(albums|artists|genres):\/\//.test(String(item.uri));
  }
  isPinned(item) { return !!(item && item.uri && this.list.some(p => p.uri === item.uri)); }
  pin(item) {
    const p = this.clean(item);
    if (!p || this.isPinned(p)) { return; }
    this.list.push(p);
    if (this.list.length > MAX) { this.list.shift(); }
    this.save();
  }
  unpin(item) {
    const n = this.list.length;
    this.list = this.list.filter(p => p.uri !== item.uri);
    if (this.list.length !== n) { this.save(); }
  }
  move(from, to) {
    if (from === to || from < 0 || to < 0 || from >= this.list.length || to >= this.list.length) { return; }
    const [p] = this.list.splice(from, 1);
    this.list.splice(to, 0, p);
    this.save();
  }

  // "ALBUM · NAS", "PLAYLIST", "WEB RADIO": the kind, then where it lives when that says something
  eyebrow(p) {
    const uri = String(p.uri || ''), type = String(p.type || '');
    let kind = 'ITEM';
    // an album is albums://Artist/Album, or — on an artist's page — artists://Artist/Album
    if (/^(albums|artists):\/\/[^/]+\/./.test(uri) || type === 'album') { kind = 'ALBUM'; }
    else if (/^albums:\/\/?$/.test(uri)) { kind = 'ALBUMS'; }
    else if (/^artists:\/\/./.test(uri) || type === 'artist') { kind = 'ARTIST'; }
    else if (/^artists:\/\/?$/.test(uri)) { kind = 'ARTISTS'; }
    else if (/^genres:\/\//.test(uri)) { kind = 'GENRE'; }
    else if (type === 'playlist') { kind = 'PLAYLIST'; }
    else if (type === 'webradio' || type === 'mywebradio') { kind = 'WEB RADIO'; }
    else if (type === 'remdisk') { kind = 'DRIVE'; }
    else if (/folder/.test(type)) { kind = 'FOLDER'; }
    else if (type === 'streaming-category') { kind = 'SOURCE'; }
    let where = '';
    const svc = String(p.service || '').toLowerCase();
    if (svc === 'mpd' || svc === '') {
      const m = /^music-library\/([^/]+)/.exec(uri);
      if (m) { where = m[1].toUpperCase(); }
    } else if (svc !== 'webradio') { where = svc.toUpperCase(); }
    return where ? kind + ' · ' + where : kind;
  }

  glyph(p) {
    const type = String(p.type || ''), uri = String(p.uri || '');
    if (type === 'webradio' || type === 'mywebradio') { return 'radio'; }
    if (type === 'playlist') { return 'queue_music'; }
    if (/^(albums|artists):\/\/[^/]+\/./.test(uri) || type === 'album') { return 'album'; }
    if (/^artists:\/\//.test(uri) || type === 'artist') { return 'person'; }
    if (/^albums:\/\//.test(uri)) { return 'album'; }
    if (/^genres:\/\//.test(uri)) { return 'graphic_eq'; }
    if (type === 'remdisk') { return 'usb'; }
    return 'folder';
  }
}

export default AwPinsService;
