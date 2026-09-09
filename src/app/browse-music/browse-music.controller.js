class BrowseMusicController {
  constructor($scope, browseService, playQueueService, playlistService, socketService,
    modalService, $timeout, matchmediaService, $compile, $document, $rootScope, $log, playerService,
    uiSettingsService, $state, themeManager, $stateParams, mockService, $http, authService, $filter, awMobileMenu) {
    'ngInject';
    this.awMenu = awMobileMenu;
    this.$scope = $scope;
    this.$log = $log;
    this.browseService = browseService;
    this.playQueueService = playQueueService;
    this.playlistService = playlistService;
    this.socketService = socketService;
    this.modalService = modalService;
    this.playerService = playerService;
    this.$timeout = $timeout;
    this.matchmediaService = matchmediaService;
    this.$compile = $compile;
    this.$document = $document;
    this.$scope = $scope;
    this.$rootScope = $rootScope;
    this.uiSettingsService = uiSettingsService;
    this.themeManager = themeManager;
    this.$stateParams = $stateParams;
    this.isDedicatedSearchView = false;
    this.historyUri = [];
    this.mockService = mockService;
    this.listViewSetting = 'list';
    this.mockArtistPage = mockService._mock.browseMusic.getArtistPageContent;
    this.mockAlbumPage = mockService._mock.browseMusic.getAlbumPageContent;
    this.$http = $http;
    this.authService = authService;
    this.filteredTranslate = $filter('translate');

    this.content = {};
    this.loadingCredit = {};
    this.hideInfoHeader = false;
    this.creditRequestOptions = {"timeout":7000};

    $scope.$on('browseService:fetchEnd', () => {
      /* While browsing this makes sense */
      // console.log(this.browseService);
      this.renderBrowsePage(this.browseService.lists);
    });

    if ((this.browseService.isBrowsing || this.browseService.isSearching) && this.browseService.lists) {
      /* However when navigating back from /playback we need to rely on this */
      this.renderBrowsePage(this.browseService.lists);
    }

    $scope.$on('browseService:eject', () => {
      this.backHome();
    });

    $scope.$on('browseService:rip', () => {
      this.backHome();
    });


    this.initController();
  }

  initController() {
    if (this.$document[0].body.id === 'artwork') { this.loadArtworkLibraryHome(); }
    // Artwork list pages (Artists, Albums, Genres…): local filter / sort / alphabet rail
    this.awFilter = ''; this.awSortDesc = false; this.awVisibleCount = null; this.awActiveLetter = '';
    this.awArtistShowAll = false; this.awArtistNewest = true;
    if (this.$document[0].body.id === 'artwork') {
      this.$rootScope.$on('browseController:listRendered', () => this.awAfterRender());
      // the row of the track that is playing carries .aw-playing (album page: EQ bars instead of the number)
      this.$scope.$watch(() => this.playerService.state && this.playerService.state.uri, () => this.awMarkPlaying());
      const onKey = e => { if ((e.metaKey || e.ctrlKey) && String(e.key).toLowerCase() === 'k' && document.getElementById('aw-search-input')) { e.preventDefault(); this.awFocusSearch(); } };
      this.$document[0].addEventListener('keydown', onKey);
      this.$scope.$on('$destroy', () => this.$document[0].removeEventListener('keydown', onKey));
    }

    this.socketService.on('pushBrowseLibrary', (data) => {
      this.fetchAdditionalMetas();
      this.fetchTrackTypeImage();
    });

    if (this.browseService.info) {
      this.currentItemMetas = {};
      if (this.browseService.info.type && this.browseService.info.type === 'artist' && this.browseService.info.title) {
        this.getArtistMetas(this.browseService.info);
      } else if (this.browseService.info.artist && this.browseService.info.album) {
        this.getAlbumMetas(this.browseService.info);
        this.getAlbumCredits(this.browseService.info);
      }
    }

    let bindedBackListener = this.backListener.bind(this);
    this.$document[0].addEventListener('keydown', bindedBackListener, false);
    this.$scope.$on('$destroy', () => {
      this.$document[0].removeEventListener('keydown', bindedBackListener, false);
    });

    this.$scope.$watch( () => this.$stateParams.isDedicatedSearch , (isDedicatedSearch) => {
      if (isDedicatedSearch) {
        this.setDedicatedSearch();
      } else {
        this.unsetDedicatedSearch();
      }
    }, true);
  }

  setDedicatedSearch(){
    this.isDedicatedSearchView = true;
    this.browseService.isSearching = true;
    this.browseService.lists = [];
    this.hideInfoHeader = true;
    this.resetBrowsePage();
    this.$timeout( function () {
      document.querySelector('#search-input-form').focus();
    },100 );
  }

  unsetDedicatedSearch(){
    this.hideInfoHeader = false;
    if (this.browseService.isSearching) {
      this.isDedicatedSearchView = false;
      this.browseService.isSearching = false;
      if (!this.browseService.isBrowsing) {
        this.browseService.lists = undefined;
        this.resetBrowsePage();
      } else if (this.browseService.lastBrowseLists) {
        this.browseService.lists = this.browseService.lastBrowseLists;
        this.renderBrowsePage(this.browseService.lists);
      }
    }

  }

  backListener() {
    let prventDefault;
    if (event.keyCode === 8) {
      let d = event.srcElement || event.target;
      if ((d.tagName.toUpperCase() === 'INPUT' &&
          (
             d.type.toUpperCase() === 'TEXT' ||
             d.type.toUpperCase() === 'PASSWORD' ||
             d.type.toUpperCase() === 'FILE' ||
             d.type.toUpperCase() === 'SEARCH' ||
             d.type.toUpperCase() === 'EMAIL' ||
             d.type.toUpperCase() === 'NUMBER' ||
             d.type.toUpperCase() === 'DATE')
          ) ||
          d.tagName.toUpperCase() === 'TEXTAREA') {
        prventDefault = d.readOnly || d.disabled;
      } else {
        prventDefault = true;
      }
    }
    if (prventDefault) {
      event.preventDefault();
      if (this.browseService.breadcrumbs) {
        this.fetchLibrary({uri: this.browseService.breadcrumbs.uri}, true);
      }
    }
  }


  // Artwork "Browse" landing: real library stats / counts / tile artwork read over
  // the same-origin REST API, so the browse view's socket state is never touched.
  loadArtworkLibraryHome() {
    if (this.libraryHome) { return; }
    const home = this.libraryHome = { stats: null, albumsArt: [], artistsArt: [], playlistArt: null, counts: {} };
    const get = (url) => this.$http.get(url).then(r => r.data).catch(() => null);
    const items = (j) => { try { return j.navigation.lists[0].items || []; } catch (e) { return []; } };
    const art = (i) => this.playerService.getAlbumart(i.albumart);
    get('/api/v1/collectionstats').then(s => { if (s && s.albums !== undefined) { home.stats = s; } });
    get('/api/v1/browse?uri=albums://').then(j => { home.albumsArt = items(j).slice(0, 8).map(art); }); // 8 candidates: broken covers drop out, the tile shows four
    get('/api/v1/browse?uri=artists://').then(j => { home.artistsArt = items(j).slice(0, 2).map(art); });
    get('/api/v1/browse?uri=favourites').then(j => { home.counts.favourites = items(j).length; });
    get('/api/v1/browse?uri=playlists').then(j => {
      const it = items(j); home.counts.playlists = it.length;
      if (it[0] && it[0].albumart) { home.playlistArt = art(it[0]); }
    });
    get('/api/v1/browse?uri=genres://').then(j => { home.counts.genres = items(j).length; });
  }

  sourceByUri(uri) {
    return (this.browseService.sources || []).find(s => s.uri === uri) || null;
  }

  // real music-service plugins beyond the built-in library sources (Qobuz, Tidal, Spotify…)
  get streamingSources() {
    const builtIn = ['favourites', 'playlists', 'music-library', 'artists://', 'albums://', 'genres://', 'upnp', 'Last_100', 'radio'];
    return (this.browseService.sources || []).filter(s => builtIn.indexOf(s.uri) === -1);
  }

  // "31 ARTISTS · 50 ALBUMS · 117 H" — one expression, so template minification
  // cannot swallow the spaces between bindings
  get libraryStatsLine() {
    const s = this.libraryHome && this.libraryHome.stats;
    if (!s) { return ''; }
    const h = parseInt(String(s.playtime || '').split(':')[0], 10);
    return `${s.artists} ARTISTS · ${s.albums} ALBUMS` + (isNaN(h) ? '' : ` · ${h} H`);
  }

  // current list (artists://, albums://, genres://…) for the Artwork title row —
  // browseService keeps the fetched item in currentFetchRequest
  get currentUri() {
    const r = this.browseService.currentFetchRequest;
    return r ? String(r.uri || '') : '';
  }
  get currentListTitle() {
    const r = this.browseService.currentFetchRequest;
    return r ? (r.name || r.title || '') : '';
  }
  // Volumio types a playlist page as 'playlist' or 'play-playlist'
  get isPlaylistInfo() {
    const t = this.browseService.info && this.browseService.info.type;
    return t === 'playlist' || t === 'play-playlist';
  }

  get currentListCount() {
    try { return this.browseService.lists[0].items.length; } catch (e) { return 0; }
  }

  fetchLibrary(item, back = false) {
    this.$log.debug(item);
    if (item.uri === '/' && back) {
      this.backHome();
      return;
    }
    if (item.uri !== 'cd') {
      this.browseService.fetchLibrary(item, back);
    }
  }

  /*
    ====== New navigation stack back functionality ======
  */
  goBack() {
    this.resetBrowsePage();
    this.browseService.goBack();
  }

  backHome() {
    this.resetBrowsePage();
    this.searchField = '';
    this.browseService.backHome();
    this.browseService.info = null;
  }

  clickBack() {
    if (this.browseService.breadcrumbs) {
      this.fetchLibrary({uri: this.browseService.breadcrumbs.uri}, true);
    } else {
      this.backHome();
    }
  }




  addWebRadio(item) {
    let
      templateUrl = 'app/browse/components/modal/modal-web-radio.html',
      controller = 'ModalWebRadioController',
      params = {
        title: 'Add web radio',
        item: item
      };
    this.modalService.openModal(
      controller,
      templateUrl,
      params,
      'sm');
  }

  editWebRadio(item) {
    this.addWebRadio(item);
  }

  safeRemoveDrive(item) {
    this.socketService.emit('safeRemoveDrive', item);
  }

  updateFolder(item) {
    this.socketService.emit('updateDb', item);
  }

  deleteFolder(curUri, item) {
    this.socketService.emit('deleteFolder', {'curUri':curUri, 'item':item});
  }

  search() {
    if (this.searchField && this.searchField.length >= 2) {
      this.browseService.isSearching = true;
      if (this.searchTimeoutHandler) {
        this.$timeout.cancel(this.searchTimeoutHandler);
      }
      this.searchTimeoutHandler = this.$timeout(() => {
        let emitPayload = {};
        if (this.isDedicatedSearchView) {
          emitPayload = {
            type: this.browseService.filterBy,
            value: this.searchField
          };
        } else {
          emitPayload = {
            type: this.browseService.filterBy,
            value: this.searchField,
            plugin_name: this.browseService.currentFetchRequest.plugin_name,
            plugin_type: this.browseService.currentFetchRequest.plugin_type,
            uri: this.browseService.currentFetchRequest.uri,
            service: this.browseService.currentFetchRequest.service
          };
        }
        this.$log.debug('search', emitPayload);
        this.socketService.emit('search', emitPayload);
      }, 600, false);
    } else {
      this.browseService.isSearching = false;
      this.browseService.lists = [];
    }
  }

  searchSubmit($event) {
    $event.preventDefault(); // Search has been done on input change, so don't submit
    this.$document[0].activeElement.blur(); // blur the input so that iOS keyboard closes
  }

  showHamburgerMenu(item) {
    let ret = item.type === 'radio-favourites' || item.type === 'radio-category' || item.type === 'spotify-category';
    return !ret;
  }

  showPlayButton(item) {
    if (!item) {
      return false;
    }
    // We avoid that by mistake one clicks on play all NAS or USB, freezing volumio
    if ((item.type === 'folder' && item.uri && item.uri.startsWith('music-library/') && item.uri.split('/').length < 4 ) ||
        item.disablePlayButton === true) {
      return false;
    }
    let ret = item.type === 'folder' || item.type === 'song' ||
        item.type === 'mywebradio' || item.type === 'webradio' ||
        item.type === 'playlist' || item.type === 'cuesong' ||
        item.type === 'remdisk' || item.type === 'cuefile' ||
        item.type === 'folder-with-favourites' || item.type === 'internal-folder';
    return ret;
  }

  showAddToQueueButton(item) {
    let ret = item.type === 'folder' || item.type === 'song' ||
        item.type === 'mywebradio' || item.type === 'webradio' ||
        item.type === 'playlist' || item.type === 'remdisk' ||
        item.type === 'cuefile' || item.type === 'folder-with-favourites' ||
        item.type === 'internal-folder';
    return ret;
  }
  showAddToPlaylist(item) {
    let ret = item.type === 'folder' || item.type === 'song' ||
    item.type === 'remdisk' || item.type === 'folder-with-favourites' ||
    item.type === 'internal-folder';
    return ret;
  }

  showMoreStory(details) {
    if (!this.authService.hasPremium() && !this.authService.isPremiumDevice()) {
      this.showPremiumFeatureModal();
      return;
    }
    if (details) {
      this.showCreditsDetails(details);
    }
  }

  showCreditsDetails(details) {
    const templateUrl = 'app/browse-music/components/modal/modal-credits-details.html';
    const controller = 'ModalCreditsDetailsController';
    const params = {
      title: details.title,
      story: details.story,
      credits: details.credits,
      upgradeCta: details.upgradeCta || false
    };
    this.modalService.openModal(
      controller,
      templateUrl,
      params,
      'md'
    );
  }

  checkAuthAndSubscription() {
    let result = {
      authEnabled: false,
      plan: null
    };
    if (this.authService) {
      result.authEnabled = this.authService.isEnabled;
      if (this.authService.user) {
        result.plan = this.authService.user.plan;
      }
    }
    return result;
  }

  checkCreditsEnabledForPlan() {
    if (this.checkAuthAndSubscription().authEnabled) {
      if (this.checkAuthAndSubscription().plan === 'superstar' || this.checkAuthAndSubscription().plan === 'premium') {
        return true;
      } else {
        return false;
      }
    } else {
      return true;
    }
  }

  timeFormat(time) {
    // Hours, minutes and seconds
    let hrs = ~~(time / 3600);
    let mins = ~~((time % 3600) / 60);
    let secs = ~~time % 60;
    // Output like "1:01" or "4:03:59" or "123:03:59"
    let ret = '';
    if (hrs > 0) {
        ret += '' + hrs + ':' + (mins < 10 ? '0' : '');
    }
    ret += '' + mins + ':' + (secs < 10 ? '0' : '');
    ret += '' + secs;
    return ret;
  }

  addToFavorites(e, item) {
    if (e) {
      e.stopPropagation();
    }
    if (!item) {
      return;
    }
    // Artwork rows show the real favourite state, so the heart toggles: remove when already a favourite
    if (this.$document[0].body.id === 'artwork' && item.favourite) {
      this.playlistService.removeFromFavourites(item);
    } else {
      this.playlistService.addToFavourites(item);
    }
    this.awFavouritesChanged();
  }

  addToFavoritesByIndex(e, listIndex, itemIndex) {
    e.stopPropagation();
    const item = this.browseService.lists[listIndex].items[itemIndex];
    this.addToFavorites(null, item);
  }

  fetchAdditionalMetas() {
    this.currentItemMetas = {};
    if (this.browseService.info) {
      if (this.browseService.info.type && this.browseService.info.type === 'artist' && this.browseService.info.title) {
        this.getArtistMetas(this.browseService.info);
      } else if (this.browseService.info.artist && this.browseService.info.album) {
        this.getAlbumMetas(this.browseService.info);
        this.getAlbumCredits(this.browseService.info);
      }
    }
  }

  getArtistMetas(artistInfo) {
    let requestObject = {
      'mode':'storyArtist',
      'artist': artistInfo.title
    };
    return this.requestMetavolumioApi(requestObject);
  }

  getAlbumMetas(albumInfo) {
    let requestObject = {
      'mode':'storyAlbum',
      'artist': albumInfo.artist,
      'album': albumInfo.album
    };
    return this.requestMetavolumioApi(requestObject);
  }

  /* ====== CREDITS IMPRO ====== */

  getArtistInfo(albumInfo) {

    if (!this.checkCreditsEnabledForPlan()) {
      this.showPremiumFeatureModal();
      return;
    }

    if (albumInfo.artist) {
      /* We have the artist info for sure */
      let mataVolumioUrl =  this.socketService.host + '/api/v1/pluginEndpoint';
      let metaObject = {
        'endpoint': 'metavolumio',
        'data': {
          'mode':'storyArtist',
          'artist': albumInfo.artist
        }
      };
      if (this.currentItemMetas.artistStory) {
        /* We've already cached the result */
        this.showCreditsDetails({
          title: this.browseService.info.artist,
          story: this.currentItemMetas.artistStory
        });
      } else {
        /* First call, let's fetch the data */
        this.$http.post(mataVolumioUrl, metaObject, this.creditRequestOptions).then((response) => {
          if (response.data && response.data.success && response.data.data && response.data.data.value) {
            this.currentItemMetas.artistStory = response.data.data.value;
            this.showCreditsDetails({
              title: this.browseService.info.artist,
              story: this.currentItemMetas.artistStory
            });
          } else {
            this.showCreditsDetails({
              title: this.browseService.info.artist,
              story: `<h3>${ this.filteredTranslate('BROWSER.ARTIST_STORY_NOT_FOUND_FOR') } ${ this.browseService.info.artist }.</h3>`
            });
          }
        });
      }
    } else {
      /* We don't have artist info for any reason */
      return null;
    }
  }

  showPremiumFeatureModal() {
    this.showCreditsDetails({
      title: this.filteredTranslate('MYVOLUMIO.MODAL_DISCOVERY_PREMIUM_TITLE'),
      story: `
        <h2 class="text-center">${ this.filteredTranslate('MYVOLUMIO.MODAL_DISCOVERY_PREMIUM_HEADING') }</h2>
        <p class="text-center">${ this.filteredTranslate('MYVOLUMIO.MODAL_DISCOVERY_PREMIUM_TEXT') }</p>
      `,
      upgradeCta: true
    });
  }

  getAlbumCredits(albumInfo) {
    this.currentItemMetas.albumCredits = '';
    if (albumInfo && albumInfo.artist && albumInfo.album) {
      let mataVolumioUrl =  this.socketService.host + '/api/v1/pluginEndpoint';
      let metaObject = {
        'endpoint': 'metavolumio',
        'data': {
          'mode':'creditsAlbum',
          'artist': albumInfo.artist,
          'album': albumInfo.album
        }
      };
      return this.$http.post(mataVolumioUrl, metaObject, this.creditRequestOptions).then((response) => {
        if (response.data && response.data.success && response.data.data && response.data.data.value) {
          this.currentItemMetas.albumCredits = response.data.data.value;
        }
      });
    }
  }

  requestMetavolumioApi(data) {
    let mataVolumioUrl =  this.socketService.host + '/api/v1/pluginEndpoint';
    let metaObject = {
      'endpoint': 'metavolumio',
      'data': data
    };
    return this.$http.post(mataVolumioUrl, metaObject, this.creditRequestOptions).then((response) => {
      if (response.data && response.data.success && response.data.data && response.data.data.value) {
        this.currentItemMetas.story = response.data.data.value;
      }
    });
  }

  showCreditLink(uri, title) {
    let mataVolumioUrl =  this.socketService.host + '/api/v1/pluginEndpoint';
    let metaObject = {
      'endpoint': 'metavolumio',
      'data': {}
    };
    if (uri.indexOf('mbid:/artist/') > -1) {
      metaObject.data.mbid = uri.replace('mbid:/artist/', '');
      metaObject.data.mode = 'storyArtist';
      this.loadingCredit[uri] = true;
    } else if (uri.indexOf('mbid:/label/') > -1) {
      metaObject.data.mbid = uri.replace('mbid:/label/', '');
      metaObject.data.mode = 'storyLabel';
      this.loadingCredit[uri] = true;
    } else if (uri.indexOf('mbid:/place/') > -1) {
      metaObject.data.mbid = uri.replace('mbid:/place/', '');
      metaObject.data.mode = 'storyPlace';
      this.loadingCredit[uri] = true;
    } else {
      return;
    }

    return this.$http.post(mataVolumioUrl, metaObject, this.creditRequestOptions).then((response) => {
      if (response.data && response.data.success && response.data.data && response.data.data.value) {
        this.loadingCredit[uri] = false;
        return this.showCreditsDetails({'title': title, 'story': response.data.data.value});
      }
    });
  }

  playMusicCardClick(e, item) {
    e.stopPropagation();
    this.play(item);
  }

  playRenderedMusicCardClick(listIndex, itemIndex) {
    let item = this.browseService.lists[listIndex].items[itemIndex];
    if (item && item.type === 'song') {
      let list = this.browseService.lists[listIndex].items;
      this.playItemsList(item, list, itemIndex);
    } else {
      this.playItemsList(item);
    }
  }

  play(item) {
    if (this.browseService.currentFetchRequest.uri === 'playlists') {
      this.playQueueService.replaceAndPlay(item);
    } else {
      return this.playQueueService.playItemsList(item);
    }
  }

  addToQueue(item) {
    if (this.browseService.currentFetchRequest.uri === 'playlists') {
      this.playQueueService.enqueue(item);
    } else {
      this.playQueueService.add(item);
    }
  }

  replaceAndPlay(item) {
    if (item.type === 'cuesong') {
      this.playQueueService.replaceAndPlayCue(item);
    } else {
      this.playQueueService.replaceAndPlay(item);
    }
  }

  addToPlaylist(item) {
    //TODO this is not necessary
    this.playlistService.refreshPlaylists();
    let
      templateUrl = 'app/browse/components/modal/modal-playlist.html',
      controller = 'ModalPlaylistController',
      params = {
        title: 'Add to playlist',
        item: item
      };
    this.modalService.openModal(
      controller,
      templateUrl,
      params,
      'sm');
  }

  showAlbumCredits() {
    if (!this.checkCreditsEnabledForPlan()) {
      this.showPremiumFeatureModal();
      return;
    }
    let creditsObject = {
      'title': this.browseService.info.album,
      'credits': this.currentItemMetas.albumCredits
    };
    this.showCreditsDetails(creditsObject);
  }

  playAlbumItemClick(item, list, itemIndex) {
    return this.playQueueService.playItemsList(item, list, itemIndex);
  }

  preventBubbling($event) {
    $event.stopPropagation();
    $event.preventDefault();
    /* $scope.status.isopen = !$scope.status.isopen; */
  }

  clickListItem(item, list, itemIndex) {
    if (item.type !== 'song' && item.type !== 'webradio' && item.type !== 'mywebradio' && item.type !== 'cuesong' && item.type !== 'album' && item.type !== 'artist' && item.type !== 'cd' && item.type !== 'play-playlist') {
      this.fetchLibrary(item);
    } else if (item.type === 'webradio' || item.type === 'mywebradio' || item.type === 'album' || item.type === 'artist') {
      this.play(item, list, itemIndex);
    } else if (item.type === 'song') {
      this.playItemsList(item, list, itemIndex);
    } else if (item.type === 'cuesong') {
      this.playQueueService.addPlayCue(item);
    } else if (item.type === 'cd') {
      this.playQueueService.replaceAndPlay(item);
    } else if ( item.type === 'play-playlist') {
      this.playQueueService.playPlaylist({title: item.name});
    }
  }

  clickListItemByIndex(listIndex, itemIndex) {
    let item = this.browseService.lists[listIndex].items[itemIndex];
    let list = this.browseService.lists[listIndex].items;
    this.clickListItem(item, list, itemIndex);
  }

  playItemsList(item, list, itemIndex) {
    return this.playQueueService.playItemsList(item, list, itemIndex);
  }

  addAndPlayList(item, list, itemIndex) {
    return this.playQueueService.addAndPlayList(item, list, itemIndex);
  }

  openMusicCardContenxtList(e, listIndex, itemIndex) {
    e.stopPropagation();
    let hamburgerMenuMarkup = `
      <div
          uib-dropdown
          on-toggle="browse.toggledItem(open, $event)"
          class="hamburgerMenu">
        <button id="hamburgerMenuBtn-${listIndex}-${itemIndex}" class="ghost-btn action-btn" uib-dropdown-toggle>
          <i class="fa fa-ellipsis-v"></i>
        </button>
        <ul class="dropdown-menu buttonsGroup align-to-right" uib-dropdown-toggle>
          <browse-hamburger-menu
              item="browse.browseService.lists[${listIndex}].items[${itemIndex}]"
              browse="browse">
          </browse-hamburger-menu>
        </ul>
      </div>
    `;
    hamburgerMenuMarkup = this.$compile(hamburgerMenuMarkup)(this.$scope);
    const hamburgerMenuBtn = document.getElementById(`hamburgerMenuBtn-${listIndex}-${itemIndex}`);
    if (hamburgerMenuBtn) {
      hamburgerMenuBtn.replaceWith(hamburgerMenuMarkup[0]);
    }

    this.$timeout(() => {
      document.querySelector(`#hamburgerMenuBtn-${listIndex}-${itemIndex}`).click();
    }, 0);
  }

  clickMusicCard(item) {
    if (item.type === 'song') {
      this.play(item);
    } else {
      this.fetchLibrary(item);
    }
  }

  resetBrowsePage() {
    const page = document.getElementById('browse-page');
    page.innerHTML = '';
  }

  renderBrowsePage(lists) {
    const html = lists.map((list, listIndex) => this.renderList(list, listIndex));
    const page = document.getElementById('browse-page');
    page.style.display = 'none';
    page.innerHTML = html.join('');

    this.$timeout(() => {
      this.$rootScope.$broadcast('browseController:listRendered');
      page.style.display = 'block';
    }, 0, false);
  }

  renderList(list, listIndex) {
    const canShowGridView = this.browseService.canShowGridView(list);
    const showGridView = this.browseService.showGridView;
    let items = '';
    if(showGridView && canShowGridView) {
      items = this.renderMusicCardItems(list.items, listIndex);
    } else {
      items = this.renderListItems(list.items, listIndex);
    }

    const html = `
    <div
      class="main__source">
      <h3 class="main__source__title panel-title ${ !list.title ? 'hidden' : '' }">${ list.title || '' }</h3>
      <div class="${showGridView && canShowGridView ? 'main__row' : 'main__list'}">
        ${ items }
        ${ items.length === 0 ? '<h3 class="text-center panel-title ">No items</h3>' : '' }
      </div> <!-- /.main__row -->
    </div> <!-- /.main__source -->
    `;
    return html;
  }

  renderMusicCardItems(items, listIndex) {
    let angularThis = `angular.element('#browse-page').scope().browse`;
    const html = items.map((item, itemIndex) => `
    <div class="music-card__wrapper">
      <div class="music-card" onclick="${angularThis}.clickListItemByIndex(${listIndex}, ${itemIndex})">
        <div class="music-card__header">
            <img
                class="music-card__img ${ !item.albumart ? 'hidden' : '' }"
                src="${this.playerService.getAlbumart(item.albumart)}"
                alt="">
            <div
              class="music-card__img-icon ${ !item.icon ? 'hidden' : '' }">
              <i class="${ item.icon }"></i>
            </div>
            <div
                class="music-card__overlay">
                <div class="meta__genre">${ item.genre || '' }</div>
                <div
                    onclick="${angularThis}.preventBubbling(event)"
                    class="meta__actions ${
                        ( item.type === 'radio-favourites' || item.type === 'radio-category' || item.type === 'spotify-category' || item.type === 'title' || item.type === 'streaming-category' || item.type === 'item-no-menu') ? 'hidden' : ''
                    }">
                    <button
                        id="hamburgerMenuBtn-${listIndex}-${itemIndex}"
                        onclick="${angularThis}.openMusicCardContenxtList(event, ${listIndex}, ${itemIndex})"
                        class="ghost-btn action-btn">
                        <i class="fa fa-ellipsis-v"></i>
                    </button>
                </div>
                <div
                  class="meta__play ${ !this.showPlayButton(item) ? 'hidden' : '' }"
                  onclick="${angularThis}.preventBubbling(event)">
                    <button
                        onclick="${angularThis}.playRenderedMusicCardClick(${listIndex}, ${itemIndex})"
                        class="ghost-btn play-btn">
                        <i class="fa fa-play play-btn__icon"></i>
                    </button>
                </div>
                <div
                    onclick="${angularThis}.addToFavoritesByIndex(event, ${listIndex}, ${itemIndex})"
                    class="meta__favorite ${
                      this.showPlayButton(item) && (item.type === 'song' || item.type === 'folder-with-favourites') && this.browseService.currentFetchRequest.uri !== 'favourites' && !item.favourite ? '' : 'hidden'
                    } ${
                      item.favorite ? 'favorited' : ''
                    }">
                    <span class="meta__favorite-heart">
                        <i class="fa fa-heart"></i>
                    </span>
                </div>
            </div>
        </div>
        <div class="music-card__info">
            <div
                class="music-card__label ${ item.qualityDescription === 'HI_RES' ? 'mr-2' : '' }"
                title="${ item.title || '' }">
                    ${ item.title || '' }
            </div>

            <img class="music-card__extension ${ !item.tagImage ? 'hidden' : '' }" src="${ this.playerService.getAlbumart(item.tagImage) }">
        </div>
        <p class="music-card__meta">${ item.meta || (item.artist || '') }</p>
      </div>
    </div>
    `);
    let joinItems = html.join('');
    /* Add placeholder items for correct sizing */
    joinItems += `
      <div class="music-card__wrapper placeholder-wrapper"></div>
      <div class="music-card__wrapper placeholder-wrapper"></div>
      <div class="music-card__wrapper placeholder-wrapper"></div>
      <div class="music-card__wrapper placeholder-wrapper"></div>
      <div class="music-card__wrapper placeholder-wrapper"></div>
      <div class="music-card__wrapper placeholder-wrapper"></div>
    `;
    return joinItems;
  }

  renderListItems(items, listIndex) {
    let angularThis = `angular.element('#browse-page').scope().browse`;
    const html = '';
    if (this.uiSettingsService.isMemorySavingTouchUiEnabled()) {
      const html = items.map((item, itemIndex) => {
        let generatedListItem = `
            <div class="album__tracks">
              <div class="music-item ${ item.type === 'title' ? 'title' : '' }" data-uri="${ String(item.uri || '').replace(/"/g, '&quot;') }" onclick="${angularThis}.clickListItemByIndex(${listIndex}, ${itemIndex})">
                <div
                  onclick="${angularThis}.preventBubbling(event)"
                  class="item__play ">
                    <button
                        onclick="${angularThis}.playRenderedMusicCardClick(${listIndex}, ${itemIndex})"
                        class="ghost-btn play-btn"
                        style="visibility:hidden">
                    </button>
                </div>

                <div class="item__info">
                  <div class="item__title truncate-text ${ (item.album && item.artist) ? 'item__title__third' : (!item.album && !item.artist) ? 'item__title__full' : 'item__title__half' }" title="${ item.title || '' }">
                      ${ item.title || '' } <img class="music-card__extension tagrow${ !item.tagImage ? 'hidden' : '' }" src="${ this.playerService.getAlbumart(item.tagImage) }">
                  </div>`;
        if (item.album) {
          generatedListItem += `
                      <div class="item__album truncate-text" title="${ item.album }">
                          ${ item.album || '' }
                      </div>`;
        }
        if (item.album && item.artist) {
          generatedListItem += `
                      <div class="item__info__separator">
                          •
                      </div>`;
        }
        if (item.artist) {
          generatedListItem += `
                      <div class="item__artist truncate-text ${ !item.artist ? 'hidden' : '' }" title="${ item.artist || '' }">
                          ${ item.artist || '' }
                      </div>
                  `;
        }
        generatedListItem += `
                </div>
                <div
                    onclick="${angularThis}.addToFavoritesByIndex(event, ${listIndex}, ${itemIndex})"
                    class="item__favorite ${
                      this.showPlayButton(item) && (item.type === 'song' || item.type === 'folder-with-favourites') && this.browseService.currentFetchRequest.uri !== 'favourites' && !item.favourite ? '' : 'hidden'
                    } ${
                      item.favorite ? 'favorited' : ''
                    }">
                    <span class="item__favorite-heart">
                        <i class="fa fa-heart"></i>
                    </span>
                </div>

                <div
                    class="item__duration ${ !item.duration ? 'hidden' : '' }">
                        ${ this.timeFormat(item.duration) }
                </div>

                <div
                    onclick="${angularThis}.preventBubbling(event)"
                    class="item__actions ${
                        ( item.type === 'radio-favourites' || item.type === 'radio-category' || item.type === 'spotify-category' || item.type === 'title' || item.type === 'streaming-category' || item.type === 'item-no-menu') ? 'hidden' : ''
                    }">
                    <button
                        id="hamburgerMenuBtn-${listIndex}-${itemIndex}"
                        onclick="${angularThis}.openMusicCardContenxtList(event, ${listIndex}, ${itemIndex})"
                        class="ghost-btn action-btn">
                        <i class="fa fa-ellipsis-v"></i>
                    </button>
                </div>
            </div>
          </div>
        `;
      return generatedListItem;
    });
      return html.join('');
    } else {
      const html = items.map((item, itemIndex) => {
        let generatedListItem = `
            <div class="album__tracks">
              <div class="music-item ${ item.type === 'title' ? 'title' : '' }" data-uri="${ String(item.uri || '').replace(/"/g, '&quot;') }" onclick="${angularThis}.clickListItemByIndex(${listIndex}, ${itemIndex})">
                <div
                  onclick="${angularThis}.preventBubbling(event)"
                  class="item__play ${ !this.showPlayButton(item) ? 'hidden' : '' }">
                    <button
                        onclick="${angularThis}.playRenderedMusicCardClick(${listIndex}, ${itemIndex})"
                        class="ghost-btn play-btn">
                        <i class="fa fa-play play-btn__icon"></i>
                    </button>
                </div>

                <div class="item__image">
                    <div class="item__number ${ item.tracknumber && !item.albumart ? '' : 'hidden' }">${ item.tracknumber }<span class="item__number-dot">.</span></div>
                    <div class="item__albumart ${ !item.albumart ? 'hidden' : '' }">
                        <img class="item__image__img" src="${this.playerService.getAlbumart(item.albumart)}" alt="">
                    </div>
                    <div
                      class="item__albumart-icon ${ !item.icon ? 'hidden' : '' }">
                      <i class="${ item.icon }"></i>
                    </div>
                </div>
                <div class="item__info">
                  <div class="item__title truncate-text ${ (item.album && item.artist) ? 'item__title__third' : (!item.album && !item.artist) ? 'item__title__full' : 'item__title__half' }" title="${ item.title || '' }">
                      ${ item.title || '' } <img class="music-card__extension tagrow${ !item.tagImage ? 'hidden' : '' }" src="${ this.playerService.getAlbumart(item.tagImage) }">
                  </div>`;
        if (item.album) {
          generatedListItem += `
                      <div class="item__album truncate-text" title="${ item.album }">
                          ${ item.album || '' }
                      </div>`;
        }
        if (item.album && item.artist) {
          generatedListItem += `
                      <div class="item__info__separator">
                          •
                      </div>`;
        }
        if (item.artist) {
          generatedListItem += `
                      <div class="item__artist truncate-text ${ !item.artist ? 'hidden' : '' }" title="${ item.artist || '' }">
                          ${ item.artist || '' }
                      </div>
                  `;
        }
        generatedListItem += `
                </div>
                <div
                    onclick="${angularThis}.addToFavoritesByIndex(event, ${listIndex}, ${itemIndex})"
                    class="item__favorite ${
                      this.showPlayButton(item) && (item.type === 'song' || item.type === 'folder-with-favourites') && this.browseService.currentFetchRequest.uri !== 'favourites' && !item.favourite ? '' : 'hidden'
                    } ${
                      item.favorite ? 'favorited' : ''
                    }">
                    <span class="item__favorite-heart">
                        <i class="fa fa-heart"></i>
                    </span>
                </div>

                <div
                    class="item__duration ${ !item.duration ? 'hidden' : '' }">
                        ${ this.timeFormat(item.duration) }
                </div>

                <div
                    onclick="${angularThis}.preventBubbling(event)"
                    class="item__actions ${
                        ( item.type === 'radio-favourites' || item.type === 'radio-category' || item.type === 'spotify-category' || item.type === 'title' || item.type === 'streaming-category' || item.type === 'item-no-menu') ? 'hidden' : ''
                    }">
                    <button
                        id="hamburgerMenuBtn-${listIndex}-${itemIndex}"
                        onclick="${angularThis}.openMusicCardContenxtList(event, ${listIndex}, ${itemIndex})"
                        class="ghost-btn action-btn">
                        <i class="fa fa-ellipsis-v"></i>
                    </button>
                </div>
            </div>
          </div>
        `;
        return generatedListItem;
      });
      return html.join('');
    }
  }

  /* ===== Artwork list pages: breadcrumb, local filter, sort order, alphabet rail.
     renderBrowsePage() emits plain HTML, so filter/sort act on the rendered nodes
     (hidden class / CSS order) and never touch the indices the click handlers use. ===== */
  get isPlainList() {
    return !!(this.browseService.isBrowsing && !this.browseService.isSearching &&
      !this.browseService.info && this.currentListTitle);
  }
  // ancestors between "Library" (the landing) and the current list — the real navigation stack
  get awCrumbs() {
    const stack = this.browseService.navigationStack || [];
    return stack.slice(0, -1).filter(s => s.title);
  }
  awGoCrumb(item) {
    this.fetchLibrary({ uri: item.uri, title: item.title, name: item.title, service: item.service,
      type: item.type, plugin_name: item.plugin_name, plugin_type: item.plugin_type });
  }
  setGridView(on) {
    if (Boolean(this.browseService.showGridView) === Boolean(on)) { return; }
    // re-render only when a list is loaded (toggleGridView() renders browseService.lists)
    if (this.browseService.lists) { this.toggleGridView(); } else { this.browseService.toggleGridView(); }
  }
  awNorm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }
  awNodes() {
    return Array.prototype.slice.call(document.querySelectorAll(
      '#browse-page .music-card__wrapper:not(.placeholder-wrapper), #browse-page .main__source:not(.aw-artist-albums) .album__tracks, .aw-artist-album'));
  }
  // artist page TRACKS head: rows left after the local filter
  get awArtistVisibleTracks() {
    return document.querySelectorAll('#browse-page .aw-artist-tracks .album__tracks:not(.aw-hidden)').length;
  }
  awTitleOf(el) {
    const t = el.querySelector('.music-card__label, .item__title, .aw-artist-album__title');
    return t ? t.textContent.trim() : '';
  }

  /* ===== Artwork artist page: albums + tracks from the artist's own lists (keyed on item types,
     not on the translated list titles). Year and track count of an album come from the tracks
     that name it — the album items themselves carry neither. ===== */
  get isArtistInfo() { return !!(this.browseService.info && this.browseService.info.type === 'artist'); }
  awArtistListsOf(kind) {
    const lists = (this.browseService.lists || []);
    return lists.map((l, i) => ({ l, i })).filter(({ l }) => {
      const items = l.items || [];
      const songs = items.filter(it => it.type === 'song').length;
      return kind === 'songs' ? (items.length && songs === items.length) : (items.length && songs === 0);
    });
  }
  get awArtistTracks() {
    return [].concat.apply([], this.awArtistListsOf('songs').map(({ l }) => l.items || []));
  }
  get awArtistTrackCount() { return this.isArtistInfo ? this.awArtistTracks.length : 0; }
  get awArtistAlbums() {
    if (!this.isArtistInfo) { return []; }
    const key = this.awNorm.bind(this);
    const sig = (this.browseService.lists || []).map(l => (l.items || []).length).join(',') + '|' + this.currentUri;
    if (this._awArtistSig === sig && this._awArtistAlbums) { return this._awArtistAlbums; }
    const byAlbum = {};
    this.awArtistTracks.forEach(t => {
      const k = key(t.album); if (!k) { return; }
      const e = byAlbum[k] || (byAlbum[k] = { tracks: 0, year: null });
      e.tracks++;
      const y = parseInt(String(t.year || '').slice(0, 4), 10);
      if (y && (!e.year || y < e.year)) { e.year = y; }
    });
    const out = [];
    this.awArtistListsOf('albums').forEach(({ l, i }) => {
      (l.items || []).forEach((item, j) => {
        const e = byAlbum[key(item.title)] || {};
        out.push({ item, uri: item.uri || (i + ':' + j), listIndex: i, itemIndex: j, year: e.year || null, tracks: e.tracks || 0 });
      });
    });
    this._awArtistSig = sig; this._awArtistAlbums = out;
    return out;
  }
  get awArtistHasYears() { return this.awArtistAlbums.some(a => a.year); }
  get awArtistAlbumsSorted() {
    const albums = this.awArtistAlbums;
    if (!this.awArtistHasYears) { return albums; }
    const dir = this.awArtistNewest ? -1 : 1;
    return albums.slice().sort((a, b) => {
      if (!a.year && !b.year) { return 0; } if (!a.year) { return 1; } if (!b.year) { return -1; }
      return (a.year - b.year) * dir || 0;
    });
  }
  awToggleArtistOrder() { this.awArtistNewest = !this.awArtistNewest; }
  // shuffle: play the artist, with random on (Volumio has no per-item shuffle command)
  awShuffle(item) {
    const p = this.playItemsList(item);
    const on = () => { if (this.playerService.state && !this.playerService.state.random) { this.playerService.shuffle(); } };
    if (p && typeof p.then === 'function') { p.then(on, on); } else { this.$timeout(on, 600, false); }
  }
  // Volumio renders the artist's album list as cards in #browse-page too — the theme's own grid
  // replaces it, so tag those sources (by list index, never by title) for the stylesheet
  awTagArtistSources() {
    if (!this.isArtistInfo) { return; }
    const sources = document.querySelectorAll('#browse-page .main__source');
    const albums = this.awArtistListsOf('albums').map(x => x.i);
    const songs = this.awArtistListsOf('songs').map(x => x.i);
    Array.prototype.forEach.call(sources, (el, i) => {
      el.classList.toggle('aw-artist-albums', albums.indexOf(i) !== -1);
      el.classList.toggle('aw-artist-tracks', songs.indexOf(i) !== -1);
    });
  }
  applyAwFilter() {
    const q = this.awNorm(this.awFilter).trim();
    let visible = 0;
    this.awNodes().forEach(el => {
      const hide = !!q && this.awNorm(this.awTitleOf(el)).indexOf(q) === -1;
      el.classList.toggle('aw-hidden', hide);
      if (!hide) { visible++; }
    });
    this.awVisibleCount = q ? visible : null;
  }
  toggleAwSort() { this.awSortDesc = !this.awSortDesc; this.applyAwSort(); }
  applyAwSort() {
    const nodes = this.awNodes();
    if (!this.awSortDesc) { nodes.forEach(el => { el.style.order = ''; }); return; }
    // Z–A by the normalised title (the backend order is case-sensitive)
    const ranked = nodes.slice().sort((a, b) => this.awNorm(this.awTitleOf(b)).localeCompare(this.awNorm(this.awTitleOf(a))));
    ranked.forEach((el, i) => { el.style.order = String(i + 1); });
  }
  get awLetters() {
    let items = [];
    try { items = this.browseService.lists[0].items || []; } catch (e) { return []; }
    const seen = {};
    items.forEach(it => {
      const c = this.awNorm(it.title || it.name).charAt(0).toUpperCase();
      if (/[A-Z0-9]/.test(c)) { seen[c] = true; }
    });
    const letters = Object.keys(seen).sort();
    return this.awSortDesc ? letters.reverse() : letters;
  }
  awJumpTo(letter) {
    const nodes = this.awNodes().filter(el => !el.classList.contains('aw-hidden'));
    const target = nodes.find(el => this.awNorm(this.awTitleOf(el)).charAt(0).toUpperCase() === letter);
    if (target) { this.awActiveLetter = letter; target.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
  }
  // uib-dropdown on-toggle of a row's context menu: the row whose menu is open reads as active
  // (the markup already calls this; it was never implemented)
  toggledItem() {
    this.$timeout(() => {
      Array.prototype.forEach.call(document.querySelectorAll('#browse-page .music-item'), row => {
        row.classList.toggle('aw-active', !!row.querySelector('.hamburgerMenu.open'));
      });
    }, 0, false);
  }

  /* ---- favourites on list rows (Artwork): Volumio does not flag library items, so the theme reads the
     Favourites list over the REST proxy and marks matching rows (.aw-fav) and items (item.favourite,
     which the context menu already understands). ---- */
  awLoadFavourites() {
    if (this.$document[0].body.id !== 'artwork') { return; }
    this.$http.get('/api/v1/browse', { params: { uri: 'favourites' } }).then(res => {
      const norm = u => String(u || '').replace(/^(music-library|mnt)\//, '');
      const lists = (res.data && res.data.navigation && res.data.navigation.lists) || [];
      const set = {};
      lists.forEach(l => (l.items || []).forEach(i => { if (i.uri) { set[norm(i.uri)] = true; } }));
      this.awFavourites = set;
      this.awMarkFavourites();
    }, () => {});
  }
  awMarkFavourites() {
    if (!this.awFavourites) { return; }
    const norm = u => String(u || '').replace(/^(music-library|mnt)\//, '');
    (this.browseService.lists || []).forEach(l => (l.items || []).forEach(i => {
      if (i && i.uri && i.type === 'song') { i.favourite = !!this.awFavourites[norm(i.uri)]; }
    }));
    Array.prototype.forEach.call(document.querySelectorAll('#browse-page .music-item[data-uri]'), el => {
      el.classList.toggle('aw-fav', !!this.awFavourites[norm(el.getAttribute('data-uri'))]);
    });
  }
  // after an add/remove the backend needs a moment before the Favourites list reflects it
  awFavouritesChanged() {
    if (this.$document[0].body.id !== 'artwork') { return; }
    this.$timeout(() => this.awLoadFavourites(), 900, false);
  }

  /* ---- Artwork landing search: the pill on the Browse landing is a real input; results render in place
     (global search, like the dedicated page) and clearing the field brings the landing back ---- */
  get isLandingSearch() {
    return !!(this.browseService.isSearching && !this.browseService.isBrowsing);
  }
  awSearch() {
    if (this.searchField && this.searchField.length >= 2) {
      this.browseService.isSearching = true;
      if (this.searchTimeoutHandler) { this.$timeout.cancel(this.searchTimeoutHandler); }
      this.searchTimeoutHandler = this.$timeout(() => {
        this.socketService.emit('search', { type: this.browseService.filterBy, value: this.searchField });
      }, 600, false);
    } else if (!this.searchField) {
      this.awClearSearch();
    }
  }
  awClearSearch() {
    if (this.searchTimeoutHandler) { this.$timeout.cancel(this.searchTimeoutHandler); }
    this.searchField = '';
    this.browseService.isSearching = false;
    this.browseService.lists = null;
    this.resetBrowsePage();
  }
  awFocusSearch() {
    const el = document.getElementById('aw-search-input');
    if (el) { el.focus(); el.select(); }
  }
  get awSearchCount() {
    try { return (this.browseService.lists || []).reduce((n, l) => n + ((l.items || []).length), 0); } catch (e) { return 0; }
  }

  awMarkPlaying() {
    // the player reports local files as mnt/…, the library lists them as music-library/… — same file
    const norm = u => String(u || '').replace(/^(music-library|mnt)\//, '');
    const uri = norm(this.playerService.state && this.playerService.state.uri);
    Array.prototype.forEach.call(document.querySelectorAll('#browse-page .music-item[data-uri]'), el => {
      const playing = !!uri && norm(el.getAttribute('data-uri')) === uri;
      el.classList.toggle('aw-playing', playing);
      // rows with a cover carry the EQ bars as an overlay element (the number-slot rows use the number itself)
      const img = el.querySelector('.item__image');
      if (img && playing && !img.querySelector('.aw-eq')) { const eq = document.createElement('span'); eq.className = 'aw-eq'; eq.appendChild(document.createElement('i')); img.appendChild(eq); }
      if (img && !playing) { const eq = img.querySelector('.aw-eq'); if (eq) { eq.remove(); } }
    });
  }
  awAfterRender() {
    this.awMarkPlaying();
    this.awLoadFavourites();
    this.awTagArtistSources();
    if (this._awListUri !== this.currentUri) {
      this._awListUri = this.currentUri;
      this.awFilter = ''; this.awSortDesc = false; this.awActiveLetter = ''; this.awVisibleCount = null;
      this.awArtistShowAll = false; this.awArtistNewest = true;
    }
    this.applyAwFilter(); this.applyAwSort();
  }

  toggleGridView() {
    this.browseService.toggleGridView();
    this.renderBrowsePage(this.browseService.lists);
  }

  isVolumio3Theme(){
    return ['volumio3', 'artwork'].indexOf(this.themeManager.theme) > -1;
  }

  fetchTrackTypeImage() {
    if (this.browseService.info && this.browseService.info.trackType) {
      this.browseService.info.fileFormat = '';
      this.browseService.info.fileFormat = this.loadFileFormatIcon(this.browseService.info.trackType);
    }
  }

  loadFileFormatIcon(trackType){
    return this.playerService.loadFileFormatIcon(trackType);
  }

  /* changeListViewSetting(view) {
    if (['grid', 'list'].indexOf(view) === -1) {
      console.error('Invalid list view type. Must be one grid or list, got ' + view);
      return;
    }
    this.listViewSetting = view;
  } */

}

export default BrowseMusicController;
