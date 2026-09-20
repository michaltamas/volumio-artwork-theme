/**
 * The breadcrumb trail used in every page head: Library / …the pages walked through… / here.
 *
 *   <aw-crumbs trail="browse.awCrumbs" current="browse.currentListTitle"
 *              on-home="browse.backHome()" on-crumb="browse.awGoCrumb(crumb)"></aw-crumbs>
 *
 * `trail` and the handlers are optional: without them it renders just the root and the
 * current page, which is what the pages outside the music library need.
 */
class AwCrumbsDirective {
  constructor(themeManager) {
    'ngInject';
    return {
      restrict: 'E',
      templateUrl: themeManager.getHtmlPath('crumbs', 'components/page-head'),
      scope: { trail: '<?', current: '<', root: '@?', onHome: '&?', onCrumb: '&?' },
      bindToController: true,
      controller: AwCrumbsController,
      controllerAs: 'crumbs'
    };
  }
}

class AwCrumbsController {
  constructor() { 'ngInject'; }
  get rootLabel() { return this.root || 'Library'; }
  home() { if (this.onHome) { this.onHome(); } }
  go(crumb) { if (this.onCrumb) { this.onCrumb({ crumb: crumb }); } }
}

export default AwCrumbsDirective;
