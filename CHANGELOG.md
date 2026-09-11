# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[1.0.0]: https://github.com/michaltamas/volumio-artwork-theme/releases/tag/v1.0.0
