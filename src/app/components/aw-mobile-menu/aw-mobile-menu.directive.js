/* Artwork phone menu sheet (mockup "Mobile — Menu"): zone + output, bit-perfect readout, the
   rail's destinations with live counts, playback device, settings, power, OS version. Every
   entry is a real Volumio destination/action (the settings menu items come from the backend). */
export default class AwMobileMenuDirective {
  constructor(themeManager) {
    'ngInject';
    return {
      restrict: 'E',
      templateUrl: themeManager.getHtmlPath('mobile-menu', 'components/mobile-menu'),
      scope: {},
      controller: AwMobileMenuController,
      controllerAs: 'mm',
      bindToController: true
    };
  }
}

class AwMobileMenuController {
  constructor($scope, $state, $timeout, $document, awMobileMenu, awQueuePanel, awSettingsService, playerService, playQueueService, browseService, multiRoomService) {
    'ngInject';
    this.$state = $state;
    this.$timeout = $timeout;
    this.menu = awMobileMenu;
    this.queue = awQueuePanel;
    this.settings = awSettingsService;
    this.playerService = playerService;
    this.playQueueService = playQueueService;
    this.browseService = browseService;
    this.multiRoomService = multiRoomService;
    this.settings.load();
    this.onKey = (e) => { if (e.key === 'Escape' && this.menu.open) { $scope.$apply(() => this.menu.hide()); } };
    $document[0].addEventListener('keydown', this.onKey);
    $scope.$on('$destroy', () => $document[0].removeEventListener('keydown', this.onKey));
  }

  get zone() {
    let list = (this.multiRoomService && this.multiRoomService.devices) || [];
    if (list && list.list) { list = list.list; }
    const self = Array.isArray(list) ? list.find(d => d && d.isSelf) : null;
    return self ? self.name : '';
  }
  get output() { return (this.settings.alsa && this.settings.alsa.output) || ''; }
  // "24/96" from the live state (bit depth / sample rate numbers)
  get signal() {
    const st = this.playerService.state || {};
    const n = v => { const m = String(v || '').match(/[\d.]+/); return m ? m[0] : ''; };
    const b = n(st.bitdepth), r = n(st.samplerate);
    return b && r ? b + '/' + r : (b || r || '');
  }
  get sourcesCount() { return (this.browseService.sources || []).length; }
  get queueCount() { return (this.playQueueService.queue || []).length; }
  get osVersion() { return this.settings.systemInfo ? this.settings.systemInfo.systemversion : ''; }
  is(state) { return this.$state.current.name === state; }
  item(key) { return this.settings.menu.find(i => this.settings.itemKey(i) === key) || null; }

  go(state) { this.menu.hide(); this.$state.go(state); }
  goSearch() {
    this.menu.hide();
    this.$state.go('volumio.browse');
    this.$timeout(() => { const b = angular.element(document.getElementById('browse')).scope(); if (b && b.browse) { b.browse.backHome(); this.$timeout(() => b.browse.awFocusSearch && b.browse.awFocusSearch(), 300, false); } }, 400, false);
  }
  openQueue() { this.menu.hide(); this.queue.show(); }
  openItem(key) { const it = this.item(key); this.menu.hide(); if (it) { this.settings.itemClick(it); } else if (key === 'playback') { this.$state.go('volumio.settings'); } }
}
