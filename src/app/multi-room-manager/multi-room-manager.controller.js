class MultiRoomManagerController {
  constructor(socketService, multiRoomService, $timeout, $log, playerService) {
    'ngInject';
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
  setVolume(device) {
    if (!device || !device.state) { return; }
    const v = parseInt(device.state.volume, 10);
    if (isNaN(v)) { return; }
    if (device.isChild) { this.changeChildVolume(device.ip, v); } else { this.changeGroupVolume(device.ip, v); }
  }

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
