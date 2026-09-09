export default class AwSettingsNavDirective {
  constructor(themeManager) {
    'ngInject';
    return {
      restrict: 'E',
      templateUrl: themeManager.getHtmlPath('settings-nav', 'components/settings-shell'),
      scope: {},
      controller: AwSettingsNavController,
      controllerAs: 'nav',
      bindToController: true
    };
  }
}

// icons by the item's stable key (awSettingsService.itemKey), never by its translated name
const ICONS = {
  playback: 'graphic_eq', sources: 'library_music', appearance: 'palette', network: 'wifi',
  system: 'memory', plugins: 'extension', alarm: 'alarm', sleep: 'bedtime',
  shutdown: 'power_settings_new', help: 'help', shop: 'storefront', zones: 'speaker',
  equalizer: 'tune', myvolumio: 'person', link: 'open_in_new'
};

// phone list groups (mockup "Mobile — Settings"), by the items' stable keys
const GROUPS = [
  { label: 'PLAYBACK', keys: ['playback', 'equalizer', 'appearance', 'zones'] },
  { label: 'LIBRARY & SOURCES', keys: ['sources', 'plugins'] },
  { label: 'SYSTEM', keys: ['network', 'system', 'alarm', 'sleep', 'shutdown', 'myvolumio', 'help', 'shop'] }
];

class AwSettingsNavController {
  constructor(awSettingsService, $state, $window) {
    'ngInject';
    this.svc = awSettingsService;
    this.$state = $state;
    this.$window = $window;
    this.svc.load();
  }

  // the settings landing shows the grouped list; plugin pages show their own back button
  get isLanding() { return this.$state.current.name === 'volumio.settings'; }
  get groups() {
    const menu = this.svc.menu || [];
    // memoised: a fresh array every digest would never settle ng-repeat's collection watch
    if (this._groupsFor === menu && this._groupsLen === menu.length) { return this._groups; }
    this._groupsFor = menu; this._groupsLen = menu.length;
    this._groups = this.buildGroups(menu);
    return this._groups;
  }
  buildGroups(menu) {
    const used = {};
    const out = GROUPS.map(g => ({ label: g.label, items: g.keys.map(k => menu.find(i => this.svc.itemKey(i) === k)).filter(Boolean) }));
    out.forEach(g => g.items.forEach(i => { used[this.svc.itemKey(i)] = true; }));
    const rest = menu.filter(i => !used[this.svc.itemKey(i)]);
    if (rest.length) { out.push({ label: 'MORE', items: rest }); }
    return out.filter(g => g.items.length);
  }
  // live values where the backend gives them (never invented)
  value(item) {
    const k = this.svc.itemKey(item);
    if (k === 'playback' && this.svc.alsa && this.svc.alsa.output) { return this.svc.alsa.output; }
    const net = Array.isArray(this.svc.network) ? this.svc.network[0] : this.svc.network;
    if (k === 'network' && net && net.type) { return net.type; }
    return '';
  }
  // the phone settings list is reached from the menu sheet: back returns to Now Playing
  back() { this.$state.go('volumio.playback'); }

  isActive(item) { return this.svc.isActive(item); }

  icon(item) {
    const k = this.svc.itemKey(item);
    if (ICONS[k]) { return ICONS[k]; }
    return k && k.indexOf('plugin:') === 0 ? 'extension' : 'settings';
  }
}
