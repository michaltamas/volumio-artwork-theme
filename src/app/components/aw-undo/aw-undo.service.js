/**
 * A toast with a way back (handoff 7b).
 *
 * "Playing next · {title}", "Added to the end · {title}": the action in the present tense plus
 * the title on one line, 3.2 s at the bottom centre above the mini player, with Undo. One at a
 * time — a new one replaces the old. Volumio answers the same actions with a toast of its own;
 * with `swallow` the ordinary toast stack lets the next one pass, so the screen shows one
 * toast, not two.
 */
const SHOW_MS = 3200;

class AwUndoService {
  constructor($rootScope, $timeout) {
    'ngInject';
    this.$rootScope = $rootScope;
    this.$timeout = $timeout;
    this.current = null;
    this.timer = null;
    this.swallowUntil = 0;
  }

  show(opts) {
    if (this.timer) { this.$timeout.cancel(this.timer); }
    this.current = { icon: opts.icon || 'info', eyebrow: opts.eyebrow || '', title: opts.title || '', undo: opts.undo || null, key: Date.now() };
    // the player answers the action with one toast of its own within a moment; that one stays quiet
    if (opts.swallow) { this.swallowUntil = Date.now() + 2500; }
    this.timer = this.$timeout(() => { this.current = null; this.timer = null; }, SHOW_MS);
    this.$rootScope.$applyAsync();
  }

  undo() {
    const c = this.current;
    this.hide();
    if (c && c.undo) { try { c.undo(); } catch (e) { /* the queue moved on */ } }
  }

  hide() {
    if (this.timer) { this.$timeout.cancel(this.timer); this.timer = null; }
    this.current = null;
    this.$rootScope.$applyAsync();
  }

  // the ordinary toast stack asks before it shows a message from the player: the first one after
  // an undoable action is that action's echo
  swallows() {
    if (!this.swallowUntil || Date.now() > this.swallowUntil) { return false; }
    this.swallowUntil = 0;
    return true;
  }
}

export default AwUndoService;
