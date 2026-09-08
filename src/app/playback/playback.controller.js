class PlaybackController {
  constructor($rootScope, playerService, matchmediaService, $state, multiRoomService, socketService, playQueueService) {
    'ngInject';
    this.playerService = playerService;
    this.matchmediaService = matchmediaService;
    this.$state = $state;
    this.multiRoomService = multiRoomService;
    this.socketService = socketService;
    this.playQueueService = playQueueService;
    this.previousState = 'volumio.browse';
    this.npOutput = '';

    $rootScope.$on('$stateChangeStart', (event, toState, toStateParams, fromState, fromParams) => {
      this.previousState = fromState.name;
      //$rootScope.previousStateParams = fromParams;
    });

    // Now Playing header readout: current audio output device (spec §6.1)
    this.fetchOutputDevice();
  }

  // Zone / room = the self device in the multiroom list.
  get npRoom() {
    let list = (this.multiRoomService && this.multiRoomService.devices) || [];
    if (list && list.list) { list = list.list; }
    if (!Array.isArray(list)) { return ''; }
    const self = list.find(d => d && d.isSelf);
    return self ? self.name : '';
  }

  // Output device (DAC) for the header readout. Volumio doesn't expose it in
  // playback state, so read it from the ALSA-controller plugin UI config
  // (the same getUiConfig/pushUiConfig path the Playback Options page uses).
  fetchOutputDevice() {
    const handler = (cfg) => {
      if (this.npOutput || !cfg) { return; }
      let found = '';
      const walk = (arr) => (arr || []).forEach((el) => {
        if (!el) { return; }
        if (String(el.id || '') === 'output_device') {
          const v = el.value;
          found = (v && (v.label || v.value)) || found;
        }
        if (el.content) { walk(el.content); }
      });
      try {
        if (cfg.sections) { cfg.sections.forEach(s => walk(s.content)); }
        if (cfg.content) { walk(cfg.content); }
      } catch (e) { /* ignore */ }
      if (found) { this.npOutput = String(found); }
    };
    this.socketService.on('pushUiConfig', handler);
    this.socketService.emit('getUiConfig', { page: 'audio_interface/alsa_controller' });
  }

  // next few tracks in the queue, for the Now Playing "UP NEXT" filmstrip
  get upNext() {
    try {
      const q = (this.playQueueService && this.playQueueService.queue) || [];
      const pos = (this.playerService.state && this.playerService.state.position) || 0;
      return q.slice(pos + 1, pos + 4);
    } catch (e) { return []; }
  }

  goBack() {
    this.$state.go(this.previousState);
  }
}

export default PlaybackController;
