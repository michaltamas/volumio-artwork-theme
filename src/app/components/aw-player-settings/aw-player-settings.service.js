/**
 * The settings the player keeps for every screen.
 *
 * On its own the interface remembers the theme and the ambient display in the browser it runs
 * in. With the Artwork One Companion plugin on the player those two live there instead: this
 * service asks for them when the socket comes up, follows every push, and writes changes back.
 * Without the plugin nothing answers, `available` stays false, and the browser goes on
 * remembering for itself — the interface never depends on the plugin being there.
 *
 * Contract (mirrored in plugin/artwork_companion/index.js):
 *   callMethod miscellanea/artwork_companion getSettings {}      -> pushArtworkSettings (to us)
 *   callMethod miscellanea/artwork_companion setSettings {...}   -> pushArtworkSettings (to all)
 *   payload: { version, theme?: 'dark'|'light'|'system', ambient?: {...} } — a key is absent
 *   until someone chose it.
 */
const ENDPOINT = 'miscellanea/artwork_companion';
const EVENT = 'pushArtworkSettings';

class AwPlayerSettingsService {
  constructor($rootScope, socketService, awTheme, awAmbient, awPins) {
    'ngInject';
    this.pins = awPins;
    this.$rootScope = $rootScope;
    this.socketService = socketService;
    this.theme = awTheme;
    this.ambient = awAmbient;
    this.available = false;
    this.settings = {};
    socketService.on(EVENT, (data) => this.receive(data));
    $rootScope.$on('socket:reconnect', () => this.ask());
    this.ask();
  }

  ask() {
    if (!this.socketService.isSocketAvalaible()) { return; }
    this.socketService.emit('callMethod', { endpoint: ENDPOINT, method: 'getSettings', data: {} });
  }

  receive(data) {
    if (!data || typeof data !== 'object') { return; }
    this.available = true;
    this.settings = data;
    // the theme is one for the whole player: every screen — the display it drives, the phone,
    // the desktop — shows the same one. The browser's own pick only counts while the player
    // has no word (a fresh install), or without the plugin at all.
    if (data.theme) { this.theme.follow(data.theme, true); }
    else { this.theme.unfollow(); }
    // the ambient display is a matter of the player's screens: the player's word is final
    if (data.ambient) { this.ambient.adopt(data.ambient); }
    else if (this.ambient.remote) { this.ambient.revert(); }   // the player's word withdrawn: back to this browser's copy
    // the pins: the player's list is the list; a change here goes back to it
    if (Array.isArray(data.pins)) { this.pins.adopt(data.pins, (list) => this.set({ pins: list })); }
    else if (!this.pins.remote) { this.pins.adopt(this.pins.read(), (list) => this.set({ pins: list })); }
    this.$rootScope.$broadcast('aw:player-settings', data);
    this.$rootScope.$applyAsync();
  }

  // the player answers with a push to everyone, which is how this screen learns the result too
  set(patch) {
    if (!this.available) { return; }
    this.socketService.emit('callMethod', { endpoint: ENDPOINT, method: 'setSettings', data: patch });
  }

  get playerTheme() { return this.settings.theme || ''; }
}

export default AwPlayerSettingsService;
