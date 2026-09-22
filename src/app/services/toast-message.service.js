class ToastMessageService {
  constructor ($rootScope, toastr, socketService, $log, $injector) {
    'ngInject';
    this.$injector = $injector;
    this.socketService = socketService;
    this.toastr = toastr;
    this.$log = $log;
    this.toastrDefaultConfig = {
      timeOut: 5000,
      extendedTimeOut: 1000,
      progressBar: true,
      maxOpened: 1,
      autoDismiss: true
    };

    $rootScope.$on('socket:init', () => {
      this.init();
    });
    $rootScope.$on('socket:reconnect', () => {
      this.initService();
    });
  }

  showMessage (type, message, title) {
    // the Artwork theme shows some actions as an undo toast of its own; the player's echo of them stays quiet
    try { if (this.$injector.has('awUndo') && this.$injector.get('awUndo').swallows(message)) { return; } } catch (e) { /* not that theme */ }
    switch (type) {
      case 'success':
        this.toastr.success(message, title, this.toastrDefaultConfig);
        break;
      case 'info':
        this.toastr.info(message, title, this.toastrDefaultConfig);
        break;
      case 'warning':
        this.toastr.warning(message, title, this.toastrDefaultConfig);
        break;
      case 'error':
        this.toastr.error(message, title, this.toastrDefaultConfig);
        break;
      case 'stickyerror':
        this.toastr.error(message, title, {closeButton: true});
        break;
    }
  }

  init () {
    this.registerListner();
    this.initService();
  }

  registerListner () {
    this.socketService.on('pushToastMessage', (data) => {
      // this.$log.debug('pushToastMessage', data);
      this.showMessage(data.type, data.message, data.title);
    });
  }

  initService () {}
}

export default ToastMessageService;
