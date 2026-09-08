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

class AwSettingsNavController {
  constructor(awSettingsService) {
    'ngInject';
    this.svc = awSettingsService;
    this.svc.load();
  }

  isActive(item) { return this.svc.isActive(item); }

  icon(item) {
    const k = this.svc.itemKey(item);
    if (ICONS[k]) { return ICONS[k]; }
    return k && k.indexOf('plugin:') === 0 ? 'extension' : 'settings';
  }
}
