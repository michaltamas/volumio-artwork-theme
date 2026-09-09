class ModalPlaylistController {
  constructor(socketService, $uibModalInstance, playlistService, dataObj) {
    'ngInject';
    this.socketService = socketService;
    this.$uibModalInstance = $uibModalInstance;
    this.playlistService = playlistService;
    this.dataObj = dataObj;
  }

  addToFavourites() {
    this.playlistService.addToFavourites(this.dataObj.item);
    this.$uibModalInstance.close();
  }

  addToPlaylist(playlist) {
    this.doAddToPlaylist(playlist);
  }

  addToCustomPlaylist() {
    this.doAddToPlaylist(this.customPlaylist);
  }

  doAddToPlaylist(playlist) {
    if (this.dataObj.addQueue) {
      this.playlistService.addQueueToPlaylist(playlist);
    } else {
      this.playlistService.addToPlaylist(this.dataObj.item, playlist);
    }
    this.$uibModalInstance.close();
  }

  /* ---- Artwork sheet: pick a target, then confirm with "Add" ---- */
  select(target) { this.selected = target; }           // 'favourites' or a playlist name
  isSelected(target) { return this.selected === target; }
  confirm() {
    if (this.selected === 'favourites') { this.addToFavourites(); }
    else if (this.selected) { this.addToPlaylist(this.selected); }
  }
  get subject() {
    if (this.dataObj && this.dataObj.addQueue) { return 'Queue'; }
    const it = this.dataObj && this.dataObj.item;
    return it ? (it.title || it.name || it.album || '') : '';
  }

  cancel() {
    this.$uibModalInstance.dismiss('cancel');
  }
}

export default ModalPlaylistController;
