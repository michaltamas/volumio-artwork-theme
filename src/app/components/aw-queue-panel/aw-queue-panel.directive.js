/* Artwork floating queue panel (mockup "Queue — floating overlay panel"). Same actions as
   Volumio's queue page: play / remove a row, drag to reorder (pointer drag → moveQueue), random,
   repeat (off → all → single), save the queue as a playlist, clear. */
export default class AwQueuePanelDirective {
  constructor(themeManager) {
    'ngInject';
    return {
      restrict: 'E',
      templateUrl: themeManager.getHtmlPath('queue-panel', 'components/queue-panel'),
      scope: {},
      controller: AwQueuePanelController,
      controllerAs: 'q',
      bindToController: true
    };
  }
}

class AwQueuePanelController {
  constructor($scope, $document, $timeout, $element, playQueueService, playerService, socketService, modalService, awQueuePanel) {
    'ngInject';
    this.$scope = $scope;
    this.$document = $document;
    this.$timeout = $timeout;
    this.$element = $element;
    this.playQueueService = playQueueService;
    this.playerService = playerService;
    this.socketService = socketService;
    this.modalService = modalService;
    this.panel = awQueuePanel;

    this.initDrag();
    $scope.$watch(() => this.panel.open, (open) => { if (open) { this.$timeout(() => this.scrollToCurrent(), 0, false); } });

    this.onKey = (e) => { if (e.key === 'Escape' && this.panel.open) { $scope.$apply(() => this.panel.hide()); } };
    $document[0].addEventListener('keydown', this.onKey);
    $scope.$on('$destroy', () => { $document[0].removeEventListener('keydown', this.onKey); });
  }

  get queue() { return this.playQueueService.queue || []; }
  get state() { return this.playerService.state || {}; }
  get position() { return typeof this.state.position === 'number' ? this.state.position : -1; }
  isCurrent(i) { return i === this.position && this.state.status !== 'stop'; }

  play(i) { this.playQueueService.play(i); }
  remove(i, $event) { if ($event) { $event.stopPropagation(); } this.playQueueService.remove(i); }
  clear() { this.playQueueService.clearQueue(); }
  shuffle() { this.playerService.shuffle(); }
  // off → all → single → off (Volumio's queue page cycles the same way)
  cycleRepeat() {
    if (!this.state.repeat) { this.playerService.repeatAlbum(true, false); }
    else if (!this.state.repeatSingle) { this.playerService.repeatAlbum(true, true); }
    else { this.playerService.repeatAlbum(false, false); }
  }
  get repeatIcon() { return this.state.repeat && this.state.repeatSingle ? 'repeat_one' : 'repeat'; }
  // "Add queue" playlist modal — the same one the queue page's save button opens
  saveAsPlaylist() {
    this.modalService.openModal('ModalPlaylistController', 'app/browse/components/modal/modal-playlist.html', { title: 'Add to playlist', addQueue: true }, 'sm');
  }

  fmt(sec) {
    const s = Math.max(0, parseInt(sec, 10) || 0);
    const m = Math.floor(s / 60), r = s % 60;
    return m + ':' + (r < 10 ? '0' + r : r);
  }
  // seconds still to play: the rest of the current track plus every track after it (null when
  // the queue carries no durations)
  get secondsLeft() {
    const q = this.queue; if (!q.length) { return null; }
    const from = Math.max(0, this.position);
    let total = 0, known = false;
    q.forEach((t, i) => { if (i < from) { return; } const d = parseInt(t.duration, 10); if (d > 0) { known = true; total += d; } });
    if (!known) { return null; }
    if (this.position >= 0 && this.state.status !== 'stop') { total -= Math.floor((this.state.seek || 0) / 1000); }
    return Math.max(0, total);
  }
  get minutesLeft() { const s = this.secondsLeft; return s === null ? null : Math.round(s / 60); }
  get endsAt() {
    const s = this.secondsLeft; if (s === null || this.state.repeat) { return null; }
    const d = new Date(Date.now() + s * 1000);
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }
  get endNote() {
    if (this.state.repeat && this.state.repeatSingle) { return 'Repeats this track'; }
    if (this.state.repeat) { return 'Repeats the queue'; }
    return 'Stops after the queue ends';
  }

  scrollToCurrent() {
    const el = this.$element[0].querySelector('.aw-queue__row.is-current');
    if (el) { el.scrollIntoView({ block: 'nearest' }); }
  }

  /* drag to reorder: a pointer-driven move that never touches the DOM order (ng-repeat owns it) —
     the dragged row follows the pointer, the rows it passes slide aside, and on release the
     backend gets moveQueue and re-renders the new order */
  initDrag() {
    const root = this.$element[0];
    if (root._awDragBound) { return; }
    root._awDragBound = true;
    root.addEventListener('pointerdown', (e) => {
      const handle = e.target.closest && e.target.closest('.aw-queue__drag');
      if (!handle || e.button) { return; }
      const row = handle.closest('.aw-queue__row'); const list = row && row.parentNode;
      if (!list) { return; }
      e.preventDefault();
      const rows = Array.prototype.slice.call(list.querySelectorAll('.aw-queue__row'));
      const from = rows.indexOf(row); if (from < 0) { return; }
      const rects = rows.map(r => r.getBoundingClientRect());
      const startY = e.clientY; let to = from;
      row.classList.add('is-dragging'); list.classList.add('is-reordering');
      const place = (y) => {
        const dy = y - startY;
        // target slot: the row whose vertical middle the pointer has crossed
        const cy = rects[from].top + rects[from].height / 2 + dy;
        to = from;
        rects.forEach((rc, i) => { if (i < from && cy < rc.top + rc.height / 2) { to = Math.min(to, i); } if (i > from && cy > rc.top + rc.height / 2) { to = Math.max(to, i); } });
        rows.forEach((r, i) => {
          if (i === from) { r.style.transform = 'translateY(' + dy + 'px)'; return; }
          let shift = 0;
          if (from < to && i > from && i <= to) { shift = -rects[from].height; }
          if (from > to && i >= to && i < from) { shift = rects[from].height; }
          r.style.transform = shift ? 'translateY(' + shift + 'px)' : '';
        });
      };
      const move = (ev) => place(ev.clientY);
      const up = () => {
        document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
        rows.forEach(r => { r.style.transform = ''; });
        row.classList.remove('is-dragging'); list.classList.remove('is-reordering');
        if (to !== from) { this.socketService.emit('moveQueue', { from: from, to: to }); }
      };
      document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
    });
  }
}
