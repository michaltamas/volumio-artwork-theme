class MultiRoomManagerController {
  constructor(socketService, multiRoomService, $timeout, $log, playerService, awMobileMenu) {
    'ngInject';
    this.awMenu = awMobileMenu;
    this.socketService = socketService;
    this.multiRoomService = multiRoomService;
    this.$timeout = $timeout;
    this.$log = $log;
    this.playerService = playerService;
  }

  // onDragComplete(data,event){
  // }

  onDropComplete(from, to, event) {
    this.$log.debug(from, to);
    this.multiRoomService.addChild(from, to);
  }

  toggleClientsView(device) {
    if (device.clientVisible) {
      device.clientVisible = false;
    } else {
      device.clientVisible = true;
    }
  }

  changeGroupVolume(ip, volume) {
    if (this.timeoutHandler) {
      this.$timeout.cancel(this.timeoutHandler);
    }
    this.timeoutHandler = this.$timeout(() => {
      this.multiRoomService.changeGroupVolume(ip, volume);
    }, 300, false);
  }

  /* ---- used by the Artwork Zones page (no drag & drop): open a device, group / ungroup, volume ---- */
  switchTo(device) {
    if (device && !device.isChild && !device.isSelf) { this.socketService.host = device.host; }
  }
  groupTargets(device) {
    const all = (this.multiRoomService && this.multiRoomService.devices) || [];
    return all.filter(d => d !== device && !d.isChild);
  }
  group(device, target) {
    if (!device || !target) { return; }
    this.multiRoomService.addChild(device, target);
    device.$groupWith = null;
  }
  ungroup(device) {
    if (device && device.ip) { this.multiRoomService.removeChildDevice(device.ip); }
  }
  // This player's own volume goes through the plain volume command. Only a grouped device
  // takes the multiroom route: on a player without the multiroom plugin the backend answers
  // setMultiroom with nothing and crashes on it, taking the whole UI down with it.
  setVolume(device) {
    if (!device || !device.state) { return; }
    const v = parseInt(device.state.volume, 10);
    if (isNaN(v)) { return; }
    if (device.isSelf) { this.playerService.volume = v; return; }
    if (device.isChild) { this.changeChildVolume(device.ip, v); return; }
    if (this.isGrouped(device)) { this.changeGroupVolume(device.ip, v); }
  }

  isGrouped(device) { return !!(device && (device.groupable || device.leader || (device.child && device.child.length))); }

  // a remote player that is not grouped has no volume channel we may use
  canSetVolume(device) { return !!(device && device.state && (device.isSelf || device.isChild || this.isGrouped(device))); }

  changeChildVolume(ip, volume) {
    if (this.timeoutHandler) {
      this.$timeout.cancel(this.timeoutHandler);
    }
    this.timeoutHandler = this.$timeout(() => {
      this.multiRoomService.changeChildVolume(ip, volume);
    }, 300, false);
  }


}

export default MultiRoomManagerController;
