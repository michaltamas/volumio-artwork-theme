class ModalService {
  constructor($uibModal, socketService, $rootScope, $filter,  $log, themeManager) {
    'ngInject';
    this.themeManager = themeManager;
    this.$uibModal = $uibModal;
	  this.$filteredTranslate = $filter('translate');
    this.socketService = socketService;
    this.$log = $log;
    this.openedModals = [];
    $rootScope.$on('socket:init', () => {
      this.init();
    });
    $rootScope.$on('socket:reconnect', () => {
      this.initService();
    });
  }

  openModal(
    controller = 'ModalController',
    templateUrl = 'app/components/modals/default-modal.html',
    dataObj = null,
    size = 'sm',
    backdrop = 'static'
  ) {
    // a theme may ship its own sheet for a core dialog (same controller and data)
    const own = this.themeTemplate(templateUrl);
    templateUrl = own.templateUrl;
    let modalInstance = this.$uibModal.open({
      animation: true,
      windowClass: own.windowClass,
      templateUrl: templateUrl,
      controller: controller,
      controllerAs: 'modal',
      size: size,
      backdrop: backdrop,
      resolve: {
        dataObj: () => dataObj
      }
    });

    this.openedModals.push(modalInstance);
    (i => {
      modalInstance.closed.then(a => {
        this.openedModals.splice(i, 1);
      });
    })(this.openedModals.length - 1);

    return modalInstance;
  }

  // returns { templateUrl, windowClass }: the Artwork theme's own sheet (and a window class the
  // theme sizes the dialog by) for the core dialogs it redesigns; unchanged otherwise
  themeTemplate(templateUrl) {
    if (!this.themeManager || this.themeManager.theme !== 'artwork') { return { templateUrl }; }
    const own = {
      'app/components/side-menu/elements/modal-sleep.html': 'sleep',
      'app/components/side-menu/elements/modal-alarm-clock.html': 'alarm-clock',
      'app/components/side-menu/elements/modal-power-off.html': 'power-off',
      'app/browse/components/modal/modal-playlist.html': 'playlist',
      'app/components/track-manager/components/modals/modal-track-manager-actions.html': 'track-actions'
    };
    const key = own[templateUrl];
    if (!key) { return { templateUrl }; }
    return { templateUrl: 'app/themes/artwork/components/modals/artwork-modal-' + key + '.html', windowClass: 'aw-dlg aw-dlg--' + key };
  }

  openDefaultModal(titleLangKey, descLangKey, callback = null) {
    var params = {
      title: this.$filteredTranslate(titleLangKey),
      message: this.$filteredTranslate(descLangKey),
      disableCancelButton: true,
      callback: callback
    };
    return this.openModal(undefined, undefined, params);
  }

  openDefaultConfirm(titleLangKey, descLangKey, callback = null, cancelCallback = null) {
    var params = {
      title: this.$filteredTranslate(titleLangKey),
      message: this.$filteredTranslate(descLangKey),
      disableCancelButton: false,
      callback: callback,
      cancelCallback: cancelCallback
    };
    return this.openModal(undefined, undefined, params);
  }

  openDefaultErrorModal(descLangKey = '', callback = null) {
    this.$log.debug('MyVolumio error: ', descLangKey);
    if (descLangKey.constructor !== String && descLangKey.constructor === Object) {
      descLangKey = this.parseErrorObject(descLangKey);
    }
    return this.openDefaultModal(this.$filteredTranslate('MYVOLUMIO.ERROR'), descLangKey, callback);
  }

  parseErrorObject(errorObj) {
    if (errorObj.error) {
      return errorObj.error;
    } else if (errorObj.data && errorObj.data.error && errorObj.data.error.message) {
      return errorObj.data.error.message;
    } else if (errorObj.message) {
      return errorObj.message;
    } else {
      return this.$filteredTranslate('MYVOLUMIO.ERROR');
    }
  }

  init() {
    this.registerListner();
    this.initService();
  }

  registerListner() {
    this.socketService.on('closeAllModals', () => {
      this.closeAllModals();
    });
  }

  closeAllModals(){
    this.openedModals.forEach(modal => {
      modal.close();
    });
  }

  emitCloseAllModals(){
    this.socketService.emit('closeModals', '');
  }
  initService() {}
}

export default ModalService;
