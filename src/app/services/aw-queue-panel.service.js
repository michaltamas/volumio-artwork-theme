/* Artwork: open/closed state of the floating queue panel (rail, mini player and Now Playing
   toggle it; the panel itself closes on its × and on Escape) */
class AwQueuePanelService {
  constructor() {
    'ngInject';
    this.open = false;
  }
  show() { this.open = true; }
  hide() { this.open = false; }
  toggle() { this.open = !this.open; }
}

export default AwQueuePanelService;
