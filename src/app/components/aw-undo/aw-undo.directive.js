/** The undo toast itself; mounted once in the layout, shown while awUndo holds one. */
class AwUndoController {
  constructor(awUndo, $state) {
    'ngInject';
    this.undo = awUndo;
    this.$state = $state;
  }
  // Now Playing has its own transport at the bottom: the toast rises above it
  get onPlayback() { return !!(this.$state.current && this.$state.current.name === 'volumio.playback'); }
}

class AwUndoDirective {
  constructor(themeManager) {
    'ngInject';
    return {
      restrict: 'E',
      templateUrl: themeManager.getHtmlPath('undo', 'components/undo'),
      scope: {},
      bindToController: true,
      controller: AwUndoController,
      controllerAs: 'u'
    };
  }
}

export default AwUndoDirective;
