/**
 * What the player's signal path looks like, from its real playback settings.
 *
 * Volumio's playback state says what the track is (format, rate, depth) but not what the
 * player does with it: the output device, resampling and the mixer live in the ALSA plugin's
 * configuration. This service reads them once over the same getUiConfig/pushUiConfig path the
 * Playback Options page uses, and answers the questions Now Playing and the ambient display
 * both ask — which output, is it resampled, is it bit perfect. Nothing is claimed while the
 * settings are unknown.
 */
class AwSignalService {
  constructor(socketService, multiRoomService) {
    'ngInject';
    this.socketService = socketService;
    this.multiRoomService = multiRoomService;
    this.output = '';
    this.alsa = null;
    this.socketService.on('pushUiConfig', (cfg) => this.applyAlsaConfig(cfg));
    this.socketService.emit('getUiConfig', { page: 'audio_interface/alsa_controller' });
  }

  // the zone this screen belongs to: the self device in the multiroom list
  get room() {
    let list = (this.multiRoomService && this.multiRoomService.devices) || [];
    if (list && list.list) { list = list.list; }
    if (!Array.isArray(list)) { return ''; }
    const self = list.find(d => d && d.isSelf);
    return self ? self.name : '';
  }

  // Reads the player's playback settings out of the ALSA plugin's UI config.
  applyAlsaConfig(cfg) {
    if (!cfg) { return; }
    const found = {};
    const walk = (arr) => (arr || []).forEach((el) => {
      if (!el) { return; }
      const id = String(el.id || '');
      if (id) {
        const v = el.value;
        found[id] = (v && typeof v === 'object') ? (v.label !== undefined ? v.label : v.value) : v;
      }
      if (el.content) { walk(el.content); }
    });
    try {
      if (cfg.sections) { cfg.sections.forEach(s => walk(s.content)); }
      if (cfg.content) { walk(cfg.content); }
    } catch (e) { return; }
    // a different plugin's config: none of the playback fields are in it
    if (found.output_device === undefined && found.resampling === undefined && found.i2sid === undefined) { return; }
    // With an I2S DAC the output-device field is hidden and keeps whatever card was
    // chosen before (an HDMI output, say); the DAC's own name is in i2sid.
    const i2s = this.flag(found.i2s);
    const device = (i2s === true && found.i2sid) ? found.i2sid : (found.output_device || found.i2sid || '');
    if (device) { this.output = String(device); }
    this.alsa = {
      i2s: i2s,
      resampling: this.flag(found.resampling),
      bitdepth: this.target(found.resampling_target_bitdepth),
      samplerate: this.target(found.resampling_target_samplerate),
      normalization: this.flag(found.volume_normalization),
      mixerType: found.mixer_type ? String(found.mixer_type) : ''
    };
    // so a tester can read what the theme sees: type __artworkPath in the browser console
    try { window.__artworkPath = angular.extend({ output: this.output }, this.alsa); } catch (e) { /* ignore */ }
  }

  // switches come back as booleans, as "true"/"false", and on some builds as a label
  flag(v) {
    if (v === true || v === false) { return v; }
    const s = String(v === undefined || v === null ? '' : v).trim().toLowerCase();
    if (!s) { return null; }
    if (['true', 'on', 'yes', 'enabled', '1'].indexOf(s) > -1) { return true; }
    if (['false', 'off', 'no', 'disabled', '0'].indexOf(s) > -1) { return false; }
    return null;
  }

  // "*" and "Native" both mean "leave this as the track has it"
  target(v) {
    const s = String(v === undefined || v === null ? '' : v).trim();
    if (!s || s === '*' || /native/i.test(s)) { return ''; }
    return s;
  }

  // The resample step of the signal path. Empty while the settings are unknown, so the path
  // never claims something untrue.
  get resample() {
    const a = this.alsa;
    if (!a || a.resampling === null) { return ''; }
    if (!a.resampling) { return 'NO RESAMPLE'; }
    const target = [a.bitdepth, a.samplerate].filter(Boolean).join(' / ');
    return target ? 'RESAMPLE ' + target : 'RESAMPLE';
  }

  // Bit perfect means the stream reaches the DAC untouched: no resampling, and the volume
  // is not applied in software. False while the settings are unknown.
  get bitPerfect() {
    const a = this.alsa;
    if (!a || a.resampling === null) { return false; }
    const mixer = String(a.mixerType || '').toLowerCase();
    const softMixer = !(mixer === 'hardware' || mixer === 'none' || mixer === 'disabled');
    return a.resampling === false && !softMixer && a.normalization !== true;
  }

  // "24 bit" -> {n:"24", u:"bit"}, "48 kHz" -> {n:"48", u:"kHz"}
  splitVal(s) {
    const m = String(s || '').trim().match(/^([\d.]+)\s*(.*)$/);
    return m ? { n: m[1], u: m[2] } : { n: '', u: String(s || '') };
  }

  // "24/88.2" from a state's depth and rate; one of them alone if that is all there is
  signal(state) {
    const st = state || {};
    const b = this.splitVal(st.bitdepth).n, r = this.splitVal(st.samplerate).n;
    return b && r ? `${b}/${r}` : (b || r || '');
  }

  // "FLAC", or "FLAC · QOBUZ" when it comes from a streaming service
  format(state) {
    const st = state || {};
    const fmt = String(st.trackType || st.stream || '').toUpperCase();
    const svc = String(st.service || '').toUpperCase();
    // a streaming service names itself as the track type ("tidal"/"tidal"): say it once
    if (!svc || svc === 'MPD' || svc === fmt) { return fmt; }
    return fmt ? `${fmt} · ${svc}` : svc;
  }
}

export default AwSignalService;
