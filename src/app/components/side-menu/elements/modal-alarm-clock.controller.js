class ModalAlarmClockController {
  constructor($uibModalInstance, socketService, dataObj, playlistService, $log, $translate) {
    'ngInject';
    this.$uibModalInstance = $uibModalInstance;
    this.socketService = socketService;
    this.dataObj = dataObj;
    this.playlistService = playlistService;
    this.$log = $log;
    this.$translate = $translate;

    this.init();
    // this.alarms = [
    //   {id: 1, enabled: true, time: '', playlist: 'Mock play 1'},
    //   {id: 2, enabled: false, time: '', playlist: 'Mock play 2'}
    // ];
    this.alarms = [];
  }

  save() {
    this.socketService.emit('saveAlarm', this.alarms);
    this.$uibModalInstance.close();
  }

  add() {
    this.alarms.push(
      {
        enabled: true,
        time: '',
        playlist: ''
      });
    this.$log.debug(this.alarms);
  }

  deleteAlarm(index) {
    this.alarms.splice(this.alarms.indexOf(index), 1);
  }

  cancel() {
    this.$uibModalInstance.dismiss();
  }

  /* ---- helpers for the Artwork alarms sheet (stepper + "next" line) ---- */
  // alarm.time is a Date for the time picker; the backend echoes it as an ISO string
  alarmDate(alarm) {
    if (!(alarm.time instanceof Date)) {
      const d = alarm.time ? new Date(alarm.time) : new Date();
      if (isNaN(d.getTime())) { alarm.time = new Date(); alarm.time.setSeconds(0, 0); } else { alarm.time = d; }
    }
    return alarm.time;
  }
  stepAlarm(alarm, unit, delta) {
    const d = this.alarmDate(alarm);
    if (unit === 'h') { d.setHours((d.getHours() + delta + 24) % 24); } else { d.setMinutes((d.getMinutes() + delta + 60) % 60); }
    alarm.time = new Date(d.getTime());
  }
  alarmPart(alarm, unit) {
    const d = this.alarmDate(alarm);
    return ('0' + (unit === 'h' ? d.getHours() : d.getMinutes())).slice(-2);
  }
  // next occurrence among the enabled alarms (times repeat daily)
  get nextAlarm() {
    const now = new Date(); let best = null;
    (this.alarms || []).forEach(a => {
      if (!a.enabled || !a.time) { return; }
      const d = this.alarmDate(a); const t = new Date(now); t.setHours(d.getHours(), d.getMinutes(), 0, 0);
      if (t <= now) { t.setDate(t.getDate() + 1); }
      if (!best || t < best) { best = t; }
    });
    if (!best) { return ''; }
    const tomorrow = best.getDate() !== now.getDate();
    return (tomorrow ? 'TOMORROW ' : 'TODAY ') + ('0' + best.getHours()).slice(-2) + ':' + ('0' + best.getMinutes()).slice(-2);
  }

  init() {
    this.registerListner();
    this.initService();
  }

  registerListner() {
    this.socketService.on('pushAlarm', (data) => {
      this.alarms = data;
      //this.$log.debug('pushAlarm', data);
    });
  }

  initService() {
    this.socketService.emit('getAlarms');
  }
}

export default ModalAlarmClockController;
