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
  constructor($scope, $timeout, $stateParams, awTheme, awAmbient) {
    'ngInject';
    this.ambient = awAmbient;
    this.$scope = $scope;
    this.$timeout = $timeout;
    this.$stateParams = $stateParams;
    this.theme = awTheme;
    this.placed = false;
  }

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
