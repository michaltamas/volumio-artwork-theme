# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2026-09-13

### Fixed

- The Zones & Outputs sheet appeared blurred and dimmed, most visibly on iOS Safari: Volumio's own stacking kept the sheet below the layer that dims the page behind it. The sheet now sits above it, and its volume row is tidier.

## [1.2.0] - 2026-09-13

Thanks to the first tester on the Volumio community forum, who found all four of these
on a Raspberry Pi 4 running Volumio 4.119.

### Added

- A volume control on Now Playing, next to the header badge, the same one the mini player uses.
- On phones, the speaker button on Now Playing opens the Zones & Outputs sheet, which carries the volume, instead of the Zones page.

### Fixed

- The signal path claimed *No resample* whatever the player was set to, and the *Bit perfect* badge was always lit. Both now come from the player's own playback settings: the path shows the resampling target when resampling is on, omits the step while the settings are unknown, and the badge appears only when nothing touches the stream.
- Changing this player's volume on the Zones page could crash the Volumio backend and reload the interface. The page sent the volume as a multiroom command, which a player without the multiroom plugin cannot answer. This player's volume now uses the plain volume command.
- The Zones & Outputs sheet could not be closed on a phone: it covered the screen and the layer that dismisses it sat underneath. It is now a bottom sheet on phones and a panel on wide screens, and a tap outside closes it.

## [1.1.0] - 2026-09-13

### Changed

- Now Playing, the phone screen and the mini player use a real seek bar with a track, a fill and a draggable handle, in place of the waveform. The waveform was a generated pattern rather than the track's audio peaks, so it showed nothing true about the music. Dragging and the arrow keys (five second steps) work as before.

### Fixed

- Dragging the seek bar on a phone no longer closes Now Playing: the swipe gesture ignores the seek bar again.

## [1.0.1] - 2026-09-11

### Fixed

- Mini player: the track title was clipped at the top, most visibly on phones, and the format label (*FLAC*) rendered larger than the rest of the quality line. The three lines now keep their own heights and sit centred on the cover.

### Changed

- New README introduction and refreshed screenshots.

## [1.0.0] - 2026-09-11

First public release.

### Added

- The Artwork One theme for Volumio's web interface: the playing cover, blurred, as the background, frosted-glass controls, and a colour palette sampled from the cover.
- Now Playing with a large cover, the real format and sample rate, a full-width waveform scrubber with playhead and elapsed, remaining and total time, *Up next* thumbnails, and a slide-up / slide-down transition from the mini player.
- Mini player with the quality line, transport, waveform, volume, zone picker and queue count.
- Floating queue panel with drag-to-reorder, remove, shuffle, repeat, save as playlist, clear and the queue's end time.
- Home, album and artist pages, breadcrumbs, grid and list views, sorting, filtering and an A–Z index.
- Restyled settings, plugin pages, MyVolumio pages (login, sign-up, profile, plans, subscription), dialogs and notifications.
- Fluid layout without fixed breakpoints, a phone layout with a menu sheet and swipe gestures, and edge-to-edge display on iPhone.
- Self-hosted fonts and icons.
- `scripts/install.sh` and `scripts/uninstall.sh`, which install the interface on a player through Volumio's third-party interface list, so it survives system updates.
- Reproducible Docker build (`build.sh`), a deployment script for development and a packaging script for releases.

### Fixed

- The interface language was never applied after the socket connection was rebuilt, for example when a MyVolumio address was opened directly, so every text showed its translation key. Volumio's UI settings are now requested again for every new connection.

[1.2.1]: https://github.com/michaltamas/volumio-artwork-theme/releases/tag/v1.2.1
[1.2.0]: https://github.com/michaltamas/volumio-artwork-theme/releases/tag/v1.2.0
[1.1.0]: https://github.com/michaltamas/volumio-artwork-theme/releases/tag/v1.1.0
[1.0.1]: https://github.com/michaltamas/volumio-artwork-theme/releases/tag/v1.0.1
[1.0.0]: https://github.com/michaltamas/volumio-artwork-theme/releases/tag/v1.0.0
