/**
 * Artwork settings shell — shared state for the left nav and the right widget
 * column (spec: Settings 3-pane). Everything here is real device data:
 *  - the settings menu   (getMenuItems / pushMenuItems, same as the core page)
 *  - system info         (getSystemInfo / pushSystemInfo)
 *  - network interfaces  (getInfoNetwork / pushInfoNetwork)
 *  - library stats       (REST /api/v1/collectionstats)
 *  - the ALSA config     read passively from the plugin page's own pushUiConfig
 *                        (we never emit getUiConfig ourselves: a second push would
 *                        re-render the open form and discard unsaved edits)
 */
class AwSettingsService {
  constructor($rootScope, $state, $window, $log, socketService, modalService, playerService, $http) {
    'ngInject';
    this.$rootScope = $rootScope;
    this.$state = $state;
    this.$window = $window;
    this.$log = $log;
    this.socketService = socketService;
    this.modalService = modalService;
    this.playerService = playerService;
    this.$http = $http;

    this.menu = [];
    this.systemInfo = null;
    this.network = null;
    this.stats = null;
    this.alsa = null;      // { output, mixerType, mixer, resampling, resamplingTarget }
    this._loaded = false;
  }

  load() {
    if (this._loaded) { return; }
    this._loaded = true;
    this.handlers = {
      pushMenuItems: (data) => { this.menu = (data || []).filter(i => i && i.id !== 'my-volumio'); },
      pushSystemInfo: (d) => { this.systemInfo = d || null; },
      pushInfoNetwork: (d) => { this.network = Array.isArray(d) ? d : (d ? [d] : null); },
      pushUiConfig: (cfg) => { this.readAlsa(cfg); this.indexUiConfig(cfg); },
      pushInstalledPlugins: (list) => this.readInstalled(list)
    };
    this.listen();
    // Volumio pages call socketService.off('<event>') on $destroy, which drops
    // EVERY listener for that event — ours included. Re-attach after each
    // navigation so the widgets keep receiving pushes.
    this.$rootScope.$on('$stateChangeSuccess', () => this.listen());
    this.socketService.emit('getMenuItems');
    this.socketService.emit('getSystemInfo');
    this.socketService.emit('getInfoNetwork');
    this.$http.get('/api/v1/collectionstats').then(r => { this.stats = r.data; }).catch(() => {});
  }

  listen() {
    Object.keys(this.handlers).forEach((ev) => {
      try { this.socketService.off(ev, this.handlers[ev]); } catch (e) { /* off(event, handler) unsupported */ }
      this.socketService.on(ev, this.handlers[ev]);
    });
  }

  /* ---- settings search (handoff 11a): pages by title, sections by label ----
     The index fills as pages are read: a plugin page's sections are known once its UI config
     has been pushed — when the page was opened, or when the landing asks for it while a search
     runs (only on the landing: a push re-renders an open form, and would discard its edits).
     Keys are plugin names and section ids, never the translated text. */
  get searchIndex() { return this._sindex || (this._sindex = {}); }
  // the sections this theme adds to Volumio's pages itself (the appearance slot): not in any push,
  // so they are known from the start — ids as on the slot's panels, labels as the slot spells them
  get themeSections() { return { 'miscellanea/appearance': [{ id: 'aw-theme', label: 'Theme' }, { id: 'aw-ambient', label: 'Ambient display' }] }; }
  sectionsOf(pn) { return (this.searchIndex[pn] || []).concat(this.themeSections[pn] || []); }

  // the plugin page a push belongs to: the open one, or the one the landing just asked for
  indexUiConfig(cfg) {
    if (!cfg || !Array.isArray(cfg.sections)) { return; }
    let key = null;
    if (this.$state.current.name === 'volumio.plugin' && this.$state.params.pluginName) { key = String(this.$state.params.pluginName).replace('-', '/'); }
    else if (this._asking) { key = this._asking; }
    if (!key) { return; }
    // a section without a label has nothing a person would type
    this.searchIndex[key] = cfg.sections.filter(sec => sec && !sec.hidden && sec.id && sec.label).map(sec => ({ id: String(sec.id), label: String(sec.label) }));
    if (this._asking === key) { this._asking = null; this.$rootScope.$applyAsync(); this.askNext(); }
  }

  // the installed plugins' own pages, reached through Plugins in the menu: searched like the rest
  readInstalled(list) {
    const parent = (this.menu || []).find(i => i && i.state === 'volumio.plugin-manager');
    this.extraPages = (Array.isArray(list) ? list : []).filter(pl => pl && pl.name && pl.category && (pl.enabled === true || pl.enabled === 'true'))
      .map(pl => ({ name: String(pl.prettyName || pl.name), state: 'volumio.plugin', params: { pluginName: pl.category + '/' + pl.name }, group: parent ? String(parent.name) : 'Plugins', installed: true }));
    this.$rootScope.$applyAsync();
    if (this._asking === '*installed') { this._asking = null; this.askNext(); }
  }
  get allPages() { return (this.menu || []).concat(this.extraPages || []); }
  get pluginPages() { return this.allPages.filter(i => i && i.state === 'volumio.plugin' && i.params && i.params.pluginName); }
  get indexing() { return !!this._asking; }

  // on the landing, read the pages not yet in the index, one at a time
  askMissing() {
    if (this.$state.current.name !== 'volumio.settings' || this._asking) { return; }
    this.askNext();
  }
  askNext() {
    if (this.$state.current.name !== 'volumio.settings') { this._asking = null; return; }
    if (!this.extraPages) {
      this._asking = '*installed';
      this.socketService.emit('getInstalledPlugins');
      this.$window.setTimeout(() => { if (this._asking === '*installed') { this.extraPages = []; this._asking = null; this.askNext(); } }, 2500);
      return;
    }
    const next = this.pluginPages.find(i => !this.searchIndex[i.params.pluginName]);
    if (!next) { this._asking = null; return; }
    this._asking = next.params.pluginName;
    this.socketService.emit('getUiConfig', { page: next.params.pluginName });
    // a page that never answers must not stall the rest
    this.$window.setTimeout(() => { if (this._asking === next.params.pluginName) { this.searchIndex[next.params.pluginName] = []; this._asking = null; this.$rootScope.$applyAsync(); this.askNext(); } }, 2500);
  }

  // rows for a query: pages whose title matches, then sections whose label matches
  searchSettings(q) {
    const norm = v => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const needle = norm(q).trim();
    if (!needle) { return []; }
    const out = [];
    this.allPages.forEach(item => {
      if (!item) { return; }
      const title = String(item.name || '');
      const pn = item.params && item.params.pluginName;
      const key = pn || this.itemKey(item) || title;
      if (norm(title).indexOf(needle) > -1) { out.push({ kind: 'page', title: title, sub: item.installed ? item.group : '', eyebrow: '', item: item, key: key }); }
      if (!pn) { return; }
      this.sectionsOf(pn).forEach(sec => {
        if (norm(sec.label).indexOf(needle) > -1) { out.push({ kind: 'section', title: sec.label, sub: item.installed ? item.group + ' · ' + title : title, eyebrow: item.installed ? title : '', item: item, section: sec.id, key: pn + '#' + sec.id }); }
      });
    });
    return out;
  }

  // open a result: the page, then the section — scrolled to and lit for 600ms
  openResult(r) {
    this.itemClick(r.item);
    if (!r.section) { return; }
    const id = r.section, started = Date.now();
    const look = () => {
      const el = this.$window.document.querySelector('#pluginWrapper [data-section-id="' + id.replace(/"/g, '') + '"]');
      if (el) { el.scrollIntoView({ block: 'center' }); el.classList.add('aw-flash'); this.$window.setTimeout(() => el.classList.remove('aw-flash'), 600); return; }
      if (Date.now() - started < 4000) { this.$window.setTimeout(look, 150); }
    };
    this.$window.setTimeout(look, 300);
  }

  // Pick the ALSA values out of a pushed UI config — only when it IS the ALSA page
  readAlsa(cfg) {
    if (!cfg) { return; }
    const found = {};
    const walk = (arr) => (arr || []).forEach((el) => {
      if (!el) { return; }
      const id = String(el.id || '');
      const v = el.value;
      const label = v && typeof v === 'object' ? (v.label || v.value) : v;
      if (id) { found[id] = label; }
      if (el.content) { walk(el.content); }
    });
    try {
      (cfg.sections || []).forEach(s => walk(s.content));
      walk(cfg.content);
    } catch (e) { return; }
    if (found.output_device === undefined) { return; }
    const res = found.resampling;
    this.alsa = {
      output: found.output_device ? String(found.output_device) : '',
      mixerType: found.mixer_type ? String(found.mixer_type) : '',
      mixer: found.mixer ? String(found.mixer) : '',
      resampling: (res === true || res === 'true') ? true : ((res === false || res === 'false') ? false : null),
      resamplingTarget: [found.resampling_target_bitdepth, found.resampling_target_samplerate].filter(Boolean).join(' / ')
    };
  }

  // --- navigation (ported from settings.controller itemClick, so the nav behaves identically)
  itemClick(item) {
    if (!item) { return; }
    if (item.id === 'modal' || item.id === 'shutdown') {
      const controllerName = item.params.modalName.split('-').map(p => p[0].toUpperCase() + p.slice(1)).join('');
      // modalService swaps in the theme's own sheets (artwork-modal-*.html) where they exist
      const templateUrl = 'app/components/side-menu/elements/' + item.params.modalName + '.html';
      this.modalService.openModal(controllerName + 'Controller', templateUrl, item, item.params.modalSize || 'lg');
    } else if (item.id === 'link') {
      this.$window.open(item.params.url);
    } else if (item.id === 'static-page') {
      this.$state.go('volumio.static-page', { pageName: item.pageName });
    } else if (item.id === 'iframe-page') {
      this.$state.go('volumio.iframe-page', { url: item.params.url });
    } else if (item.state && item.params) {
      const params = {};
      Object.keys(item.params).forEach(k => { params[k] = String(item.params[k]).replace('/', '-'); });
      this.$state.go(item.state, params);
    } else if (item.state) {
      this.$state.go(item.state);
    }
  }

  isActive(item) {
    if (!item || !item.state) { return false; }
    const cur = this.$state.current.name;
    if (cur !== item.state) { return false; }
    if (item.state === 'volumio.plugin' && item.params && item.params.pluginName) {
      return String(item.params.pluginName).replace('/', '-') === this.$state.params.pluginName;
    }
    return true;
  }

  get activeItem() {
    return this.menu.find(i => this.isActive(i)) || null;
  }

  // Stable key for a menu item. Never derived from item.name — Volumio translates it and the
  // icons/widgets would change with the UI language. Keys come from the backend's untranslated
  // fields: params.pluginName, params.modalName, params.url, id.
  itemKey(item) {
    if (!item) { return null; }
    const p = item.params || {};
    const plugin = String(p.pluginName || '');
    if (plugin) {
      const byPlugin = {
        'audio_interface/alsa_controller': 'playback',
        'miscellanea/my_music': 'sources',
        'miscellanea/appearance': 'appearance',
        'system_controller/network': 'network',
        'system_controller/system': 'system',
        'audio_interface/fusiondsp': 'equalizer'
      };
      return byPlugin[plugin] || ('plugin:' + plugin);
    }
    const modal = String(p.modalName || '');
    if (modal) {
      const byModal = { 'modal-alarm-clock': 'alarm', 'modal-sleep': 'sleep', 'modal-power-off': 'shutdown' };
      return byModal[modal] || ('modal:' + modal);
    }
    const url = String(p.url || '');
    if (url) {
      if (url.indexOf('help.') > -1) { return 'help'; }
      if (url.indexOf('/shop') > -1) { return 'shop'; }
      return 'link';
    }
    const byId = { 'plugin-manager': 'plugins', shutdown: 'shutdown', 'my-volumio': 'myvolumio', multiroom: 'zones' };
    return byId[item.id] || item.id || null;
  }

  // which right-column widget applies to the open page
  get pageKey() {
    const k = this.itemKey(this.activeItem);
    return ['playback', 'system', 'network', 'sources'].indexOf(k) > -1 ? k : null;
  }

  get hasSide() { return !!this.pageKey; }
}

export default AwSettingsService;
