/**
 * The settings search (handoff 11a): one field on the settings landing; results are rows —
 * the section as the title, its page beneath, a plugin's name as a mono eyebrow — and opening
 * one goes to the page and lights the section. ⌘K / Ctrl+K focuses the field on the landing.
 */
export default class AwSettingsSearchDirective {
  constructor(themeManager) {
    'ngInject';
    return {
      restrict: 'E',
      templateUrl: themeManager.getHtmlPath('settings-search', 'components/settings-shell'),
      scope: {},
      bindToController: true,
      controller: AwSettingsSearchController,
      controllerAs: 'ss'
    };
  }
}

class AwSettingsSearchController {
  constructor($scope, $element, $window, $timeout, awSettingsService) {
    'ngInject';
    this.svc = awSettingsService;
    this.$timeout = $timeout;
    this.q = '';
    this.results = [];
    this.focus = 0;
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k') {
        const input = $element[0].querySelector('input');
        if (input) { e.preventDefault(); input.focus(); }
      }
    };
    $window.addEventListener('keydown', onKey);
    // sections arrive while the query stands: the rows grow without the count jumping about
    $scope.$watch(() => Object.keys(this.svc.searchIndex).length + (this.svc.indexing ? 'a' : ''), () => this.refresh());
    // the host carries the state, so what follows it on the landing can step aside while a query stands
    $scope.$watch(() => this.active, (on) => $element.toggleClass('is-active', !!on));
    $scope.$on('$destroy', () => { $window.removeEventListener('keydown', onKey); this.svc.searchQuery = ''; });
  }

  input() {
    this.svc.searchQuery = this.q;
    this.results = this.svc.searchSettings(this.q);
    this.focus = 0;
    if (String(this.q).trim()) { this.svc.askMissing(); }
  }
  // sections arrive while the query stands: the rows grow without the count jumping about
  refresh() { if (String(this.q).trim()) { this.results = this.svc.searchSettings(this.q); } }
  clear() { this.q = ''; this.input(); }
  get active() { return !!String(this.q).trim(); }
  open(r) { this.svc.openResult(r); this.clear(); }
  key(e) {
    if (!this.results.length) { return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); this.focus = Math.min(this.results.length - 1, this.focus + 1); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.focus = Math.max(0, this.focus - 1); }
    else if (e.key === 'Enter') { e.preventDefault(); this.open(this.results[this.focus]); }
    else if (e.key === 'Escape') { this.clear(); }
  }
}
