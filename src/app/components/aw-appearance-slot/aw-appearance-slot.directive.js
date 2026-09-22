/**
 * The appearance switch, on Volumio's own Appearance page.
 *
 * That page is generated from a plugin's configuration, so instead of forking its template this
 * directive waits for the page to render and appends itself as one more section. The page is
 * recognised by the plugin's id (miscellanea-appearance), never by its title: the title is
 * translated, the id is not. Anywhere else the switch stays out of the way.
 */
const PLUGIN = 'miscellanea-appearance';

class AwAppearanceSlotDirective {
  constructor(themeManager) {
    'ngInject';
    return {
      restrict: 'E',
      templateUrl: themeManager.getHtmlPath('appearance-slot', 'components/appearance-slot'),
      scope: {},
      bindToController: true,
      controller: AwAppearanceSlotController,
      controllerAs: 'slot',
      link: (scope, element) => scope.slot.attach(element[0])
    };
  }
}

class AwAppearanceSlotController {
  constructor($scope, $timeout, $stateParams, awTheme, awAmbient, toastMessageService, awPlayerSettings) {
    'ngInject';
    this.ambient = awAmbient;
    this.player = awPlayerSettings;
    this.toast = toastMessageService;
    // the rows edit a draft; Save applies it, like every other section on this page
    this.draft = angular.copy(awAmbient.settings);
    $scope.$on('aw:ambient-settings', () => { this.draft = angular.copy(awAmbient.settings); });
    this.$scope = $scope;
    this.$timeout = $timeout;
    this.$stateParams = $stateParams;
    this.theme = awTheme;
    this.placed = false;
  }

  saveAmbient() {
    const d = this.draft;
    const time = v => /^([01]?\d|2[0-3]):[0-5]\d$/.test(String(v || '').trim());
    if (d.night && !(time(d.nightFrom) && time(d.nightTo))) {
      this.toast.showMessage('warning', 'Night hours need a time like 23:00 and 07:00.', 'Ambient display');
      return;
    }
    if (this.player.available) {
      // the player keeps it and pushes it to every screen; this one hears it back like the rest
      this.player.set({ ambient: angular.copy(d) });
      this.toast.showMessage('success', 'Ambient display settings saved for every screen of this player.', 'Ambient display');
    } else {
      this.ambient.set(angular.copy(d));
      this.toast.showMessage('success', 'Ambient display settings saved.', 'Ambient display');
    }
  }

  // the theme for the player's screens (companion plugin): '' clears the player's word
  setPlayerTheme(mode) { this.player.set({ theme: mode || null }); }

  attach(host) {
    this.host = host;
    host.style.display = 'none';
    const look = () => this.place();
    this.observer = new MutationObserver(() => {
      if (this.pending) { return; }
      this.pending = this.$timeout(() => { this.pending = null; look(); }, 120, false);
    });
    this.observer.observe(document.body, { childList: true, subtree: true });
    look();
    this.$scope.$on('$destroy', () => {
      if (this.observer) { this.observer.disconnect(); }
      if (this.pending) { this.$timeout.cancel(this.pending); }
    });
  }

  // append the switch to the Appearance page as its own section
  place() {
    const onPage = this.$stateParams && this.$stateParams.pluginName === PLUGIN;
    const wrapper = onPage ? document.getElementById('pluginWrapper') : null;
    const box = wrapper && wrapper.querySelector('.box');
    if (!box) {
      if (this.host && this.placed) { this.host.style.display = 'none'; this.placed = false; }
      return;
    }
    if (this.host.parentNode !== wrapper || wrapper.lastElementChild !== this.host) {
      wrapper.appendChild(this.host);
    }
    if (!this.placed) {
      this.host.style.display = '';
      this.placed = true;
      this.$scope.$applyAsync();
    }
  }
}

export default AwAppearanceSlotDirective;
