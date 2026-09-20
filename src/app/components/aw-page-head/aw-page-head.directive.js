/**
 * The page head every screen shares: menu button, optional back arrow, a navigation slot
 * (breadcrumbs or tabs) and an actions slot (search, filters, view toggle).
 *
 * The head owns the behaviour that used to be copied into each page: it sticks to the top of
 * the screen, keeps the screen's top padding, and blurs whatever scrolls underneath it. Pages
 * only say what goes in it.
 *
 *   <aw-page-head on-back="browse.goBack()">
 *     <aw-head-nav><aw-crumbs current="browse.currentListTitle" ...></aw-crumbs></aw-head-nav>
 *     <aw-head-actions><label class="aw-filter">…</label></aw-head-actions>
 *   </aw-page-head>
 */
class AwPageHeadDirective {
  constructor(themeManager) {
    'ngInject';
    return {
      restrict: 'E',
      templateUrl: themeManager.getHtmlPath('page-head', 'components/page-head'),
      transclude: { nav: '?awHeadNav', actions: '?awHeadActions' },
      scope: { onBack: '&?', backLabel: '@?', variant: '@?' },
      bindToController: true,
      controller: AwPageHeadController,
      controllerAs: 'head'
    };
  }
}

class AwPageHeadController {
  constructor($attrs, awMobileMenu) {
    'ngInject';
    this.awMenu = awMobileMenu;
    this.hasBack = $attrs.onBack !== undefined;
  }
  toggleMenu() { this.awMenu.toggle(); }
  back() { if (this.onBack) { this.onBack(); } }
}

export default AwPageHeadDirective;
