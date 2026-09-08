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

const ICONS = [
  ['playback', 'graphic_eq'], ['source', 'library_music'], ['appearance', 'palette'],
  ['network', 'wifi'], ['system', 'memory'], ['plugin', 'extension'], ['alarm', 'alarm'],
  ['sleep', 'bedtime'], ['shutdown', 'power_settings_new'], ['help', 'help'], ['shop', 'storefront'],
  ['zone', 'speaker'], ['equal', 'tune']
];

class AwSettingsNavController {
  constructor(awSettingsService) {
    'ngInject';
    this.svc = awSettingsService;
    this.svc.load();
  }

  isActive(item) { return this.svc.isActive(item); }

  icon(item) {
    const n = String((item && item.name) || '').toLowerCase();
    const hit = ICONS.find(([k]) => n.indexOf(k) > -1);
    return hit ? hit[1] : 'settings';
  }
}
