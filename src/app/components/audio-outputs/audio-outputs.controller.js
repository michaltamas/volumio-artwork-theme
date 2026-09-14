class AudioOutputsController {
  constructor($log, audioOutputsService, socketService, playerService, $rootScope, $timeout) {
    "ngInject";
    this.audioOutputsService = audioOutputsService;
    this.$timeout = $timeout;
    this.socketService = socketService;
    this.playerService = playerService;
    this.$log = $log;

    this.menuVisible = false;
    this.outputs = [];

    // screens outside the footer (the phone's Now Playing bar) ask for the sheet this way
    $rootScope.$on('volumio:toggleOutputs', () => this.toggleMenu());

    this.defaultView = true;
    this.groupView = false;
  }

  toggleMenu() {
    this.menuVisible = !this.menuVisible;
  }

  isMultiOutputsAvailable() {
    // TODO - MULTIROOM FIX AFTER DONE
    // console.log(this.audioOutputsService.outputs);
    // console.log(this.audioOutputsService.multiRoomDevices);

    return true;
    /* if (this.audioOutputsService.outputs && this.audioOutputsService.outputs.length > 1) {
      return true;
    } else {
      return false;
    } */
  }

  toggleAudioOutput(id, enabled) {
    if (enabled === true) {
      this.audioOutputsService.disableAudioOutput(id);
    } else {
      this.audioOutputsService.enableAudioOutput(id);
    }
  }

  showArtistAndTitle(artist, title, type) {
    var text = "";
    if (artist && title) {
      text = artist + " - " + title;
      return text;
    } else {
      if (title) {
        return title;
      } else {
        return type;
      }
    }
  }

  onDeviceVolumeChange(id, level) {
    const volume = parseInt(level);
    this.audioOutputsService.onDeviceVolumeChange(id, volume);
  }

  // A dragged slider must not fight the player. The device objects are rebuilt on every
  // push from the backend, which used to snap the handle back mid-drag; the dragged value
  // wins for a moment, and the command goes out at most every 200 ms plus once at the end.
  volumeFn(device) {
    if (!device) { return () => 0; }
    const id = device.id;
    this._volFns = this._volFns || {};
    this._localVol = this._localVol || {};
    if (!this._volFns[id]) {
      this._volFns[id] = (value) => {
        if (value === undefined) {
          const local = this._localVol[id];
          // the device list keeps the volume it was told at boot, so for this player read
          // the live one; a remote device keeps the dragged value a little longer instead
          if (local && Date.now() - local.at < (device.isSelf ? 900 : 3000)) { return local.value; }
          if (device.isSelf && this.playerService.state) { return parseInt(this.playerService.state.volume, 10) || 0; }
          return device.state ? parseInt(device.state.volume, 10) : 0;
        }
        const v = parseInt(value, 10);
        if (isNaN(v)) { return; }
        this._localVol[id] = { value: v, at: Date.now() };
        this.sendVolume(device, v);
        return v;
      };
    }
    return this._volFns[id];
  }

  sendVolume(device, volume) {
    this._volTimers = this._volTimers || {};
    this._volSentAt = this._volSentAt || {};
    const id = device.id;
    const push = () => {
      this._volSentAt[id] = Date.now();
      this._volTimers[id] = null;
      const item = { id: device.id, type: device.type, host: device.host, isSelf: device.isSelf, state: { volume: this.volumeFn(device)() } };
      this.audioOutputsService.onDeviceVolumeChange(item);
    };
    if (this._volTimers[id]) { return; }                      // one is already queued
    const since = Date.now() - (this._volSentAt[id] || 0);
    if (since >= 200) { push(); } else { this._volTimers[id] = this.$timeout(push, 200 - since, false); }
  }

  isMuted(device) {
    if (!device) { return false; }
    if (device.isSelf && this.playerService.state) { return !!this.playerService.state.mute; }
    return !!(device.state && device.state.mute);
  }

  // the speaker icon mutes and unmutes the device
  toggleMute(device) {
    if (!device || !device.state) { return; }
    const muted = device.isSelf && this.playerService.state ? !!this.playerService.state.mute : !!device.state.mute;
    device.state.mute = !muted;                               // answer the tap at once
    if (device.isSelf) {
      this.playerService.toggleMute();
      return;
    }
    this.socketService.emit('setAudioOutputVolume', {
      id: device.id, type: device.type, host: device.host, isSelf: device.isSelf,
      mute: !muted, volume: device.state.volume
    });
  }

  onDeviceClick(device) {
    if (device.host) {
      this.socketService.host = device.host;
    }
  }

  toggleView() {
    this.defaultView = !this.defaultView;
    this.groupView = !this.groupView;
  }
}

export default AudioOutputsController;
