# Changelog

All notable changes to this project are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-09-23

### Added

- **Ambient.** After a few minutes without a touch, a display the player drives — HDMI, the Touch Display plugin, a TV — gives way to the cover, the essentials and a clock, and comes straight back on touch. Three layouts (cover-led, clock-led, full-bleed), a 12 or 24 hour clock, night hours that dim it, and a slow drift against burn-in. Set in Settings → Appearance; `?ambient=now` in the address shows it at once, `?kiosk=1` tells a browser it is the player's own display.
- **The Artwork One Companion**, a small plugin the installer puts on the player. It keeps the theme, the ambient settings and the pinned shelf there and pushes every change to every screen, so a choice made on the phone is on the living-room display a moment later and a display nobody can touch can be told anything at all. `--no-companion` skips it.
- **Lyrics**, a third face of Now Playing beside Cover and Info: the words from LRCLIB, synced to the music when the record has them, plain when not; a tap on a line seeks to it. On the phone they slide up over the player as a panel.
- **Info**, redrawn: who plays and what record, as two rows — the artist with Wikipedia's one-line description, the year they began and their opening paragraph; the record with its label, year and track count, and on a wide screen its paragraph. From MusicBrainz and Wikipedia, asked by the browser without keys; *Artist ›* and *Album ›* lead into the library.
- **Play next** and **Play last** in every row's menu, with a toast that says where the track landed and an *Undo* while it shows.
- **Quality badges** — hi-res, DSD, lossless, lossy, radio — on Now Playing, in the mini player, in track rows and on the resting display.
- **A sleep timer** from the Settings menu: presets or any number of minutes, stop or power off, the countdown on Now Playing and in the mini player.
- **Pins** on Home: a shelf under Recent albums for anything one keeps going back to — a source, a folder, a playlist, an album, a station — pinned from its row menu, reordered by drag, unpinned from the tile's own menu, shared by every screen through the companion.
- **Settings search** on the Settings landing (⌘K / Ctrl+K): finds a page or a section of one by name, across Volumio's pages, the installed plugins' pages and the theme's own.
- On a streaming service's pages the search field asks the service itself instead of filtering the rows on screen.
- The artists grid says how many albums each artist has; the artist page's album tiles carry the same hover and menu as the library's cards.
- The Now Playing album line carries the record's year, from the library.

### Changed

- The theme is one choice for the whole player when the companion is there, not one per browser.
- The Lyrics face keeps only the title above the words; the signal path reads on the Cover face.
- The artists grid's rows sit further apart.

### Fixed

- A context menu near an edge opened off-screen or under the mini player; it now opens toward the free side, under the sticky head and above the mini player, and a pin's menu on Home is no longer cut to its tile.
- The Settings landing on a phone was 216 px wide.
- Lyrics: a track without an artist made LRCLIB answer 400; it goes straight to the search by title now.
- On the phone the pins sat in a shelf of their own that scrolled sideways; they wrap into the same grid as Recent albums.
- The album page's title sits 24 px under the cover instead of 10.

## [1.6.2] - 2026-09-21

### Fixed

- A display driven by the player itself — HDMI, the Touch Display plugin — came up in the light theme after 1.6.0 and could not be switched back without touching it. The theme had defaulted to *System*, and a kiosk browser has no dark mode of its own, so it reported a light scheme. Dark is the default again, as it always was; *System* is now a choice to make. A display that cannot be reached by hand can carry the choice in its address instead: `?theme=dark`, `light` or `system` is saved on the first load.

## [1.6.1] - 2026-09-21

### Fixed

- On the album page the track list sat on a lighter slab the exact size of the list — in Safari, Edge and Chrome, though not in a headless render, which is why it survived the last release. The head column was a scroll container, and the browser composited the page in pieces around it. It no longer scrolls: the cover is already clamped to the window, so the head always fits.
- In a narrow or short window, where the album page scrolls as a whole, the last track ended under the mini player and could not be reached.
- The cover's shadow on the album page was cut off at the column's edge.
- Light theme: the row that plays and the row under the pointer are marked without a panel of their own — the playing one by its bars and bold title, the hovered one by a faint tint; the resting rows sit on nothing.
- Light theme: the favourite heart in a track row is an ink glyph now, not a white one lost on the paper.

## [1.6.0] - 2026-09-21

### Added

- **A light theme.** The cover still bleeds behind everything, but the veil over it runs up to warm paper (`#faf8f5`) instead of down to black: white glass instead of dark, ink at `#14161a`, warm shadows, and a transport that becomes an ink disc with a paper glyph. Built from a design handoff rather than by eye, and held to a measured contrast floor — over the darkest cover in a test library the metadata grey keeps 4.54:1 and the primary ink 12.9:1.
- **A theme switch** in Settings → Appearance: Dark, Light or System, which follows the device and changes with it. The choice is remembered in that browser, not in the player's configuration, so a phone can be light while the screen in the living room stays dark.

### Changed

- The theme's colours are written as tokens rather than literals — 842 of them, the white veils becoming a scale of their own. The dark theme came out of that pass with the same palette it had before, colour for colour.
- The blurred cover carries further into the page than it did: a record tints the interface it is on instead of hinting at it.

### Fixed

- The trail could grow into nonsense — an album that was never on the way, wrapped over three lines — because Volumio's navigation stack is a history, not a path. An album's own page can never be an ancestor, so those are dropped, and the trail keeps to the last two steps on one line.
- The seek track on Now Playing had an inset highlight that read as embossed plastic; it is a flat tint now.
- Glyphs that stand in for a cover — a playlist, a web radio, a folder — were painted white by the inherited theme and vanished on paper.

## [1.5.1] - 2026-09-20

### Fixed

- The equaliser bars on the current track kept moving while the player was paused or stopped, on the album page, the artist page and in search results, so a still player looked like it was playing.
- The album page drew a dark band across half the screen: its head sits in the info column, not across the page, so the tint and the blur ended in a hard edge. The band now belongs to the phone layout, where the cover really does scroll under the head.
- The album head started 22px lower than every other page, and a head without a filter in it was shorter than one with. Every head now starts on the same line and keeps the same height.
- The artist head sat 8px higher than the rest; it takes the same top padding now.
- The album's track list ran behind the mini player, its scrollbar disappearing under it, and the list ended 56px before its own scroll did. The column now stops just above the player and finishes with the last track.
- On a short window the album cover pushed the title, the meta line and the buttons behind the mini player. The cover gives way to what is left of the window instead.
- The home screen and the Browse landing had two different heads: home left out streaming services that Volumio reports as disabled and named web radio itself. Both now show the same tabs, the same search pill and the same spacing.

## [1.5.0] - 2026-09-20

### Added

- Every screen now shares one page head. It sticks to the top, carries the screen's own top padding and blurs whatever scrolls beneath it, so the interface no longer changes its mind from page to page. The home screen, the Browse landing, list pages, the artist page, albums and playlists, the MyVolumio profile and the search page all use it.
- On a phone the filter rests as a magnifier and slides open on a tap, which keeps the head on a single line instead of spending a second row on a search field.

### Changed

- Now Playing moves the volume from the top bar to the bottom right, beside what plays next, and the transport spacing closes up as the window narrows so the row never wraps out of sight.
- The volume in the Zones list looks like every other volume in the theme: a thin track with a white fill and a small knob, instead of the browser's own thick pill.
- The search page no longer draws its own bar over the landing's head, so it offers one search field instead of two.
- The home screen loses the avatar button: it pointed at an abstract state and did nothing. MyVolumio is reachable from the menu.

### Fixed

- The elapsed time could run past the end of a track — a four-minute song showing 165:12 — because Volumio keeps counting its own position while the player sits stopped at the end of a queue. The seek bar now shows nothing while stopped and never more than the track's length.
- On a phone the band across the top edge dimmed the menu button and the search field. It now belongs to the app's own stacking order, so it still covers what scrolls under it while the head stays clear.

## [1.4.1] - 2026-09-14

### Fixed

- The playback path named the wrong output on players with an I2S DAC, an Allo Piano 2.1 showing as *HDMI OUT*. Volumio hides the output-device field when an I2S DAC is enabled and leaves the previously selected card in it; the path now uses the DAC's own name.

## [1.4.0] - 2026-09-14

### Fixed

- The volume in the Zones & Outputs sheet jumped back a second or two after a change. For this player it read the multiroom device list, which keeps the volume the player was told at start-up; it now reads the live player state, and so does the mute icon.
- The playback path missed the resampling step on some players: switches that arrive as labels instead of booleans are now understood, and an I2S DAC is named by its own field. Volume normalisation also counts against *Bit perfect*.

### Changed

- The volume control on Now Playing has a longer track and a visible knob, for finer control.
- The parsed playback settings are exposed as `window.__artworkPath`, so a tester can see exactly what the theme reads.

## [1.3.0] - 2026-09-13

### Added

- The Zones & Outputs sheet can be pulled down by its handle to dismiss it, and the speaker icon on each device mutes and unmutes it.

### Fixed

- Dragging a volume slider in the sheet jumped around, because the slider followed the player's own updates mid-drag. The dragged value now leads and the player is told at most five times a second.

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

[1.4.1]: https://github.com/michaltamas/volumio-artwork-theme/releases/tag/v1.4.1
[1.4.0]: https://github.com/michaltamas/volumio-artwork-theme/releases/tag/v1.4.0
[1.3.0]: https://github.com/michaltamas/volumio-artwork-theme/releases/tag/v1.3.0
[1.2.1]: https://github.com/michaltamas/volumio-artwork-theme/releases/tag/v1.2.1
[1.2.0]: https://github.com/michaltamas/volumio-artwork-theme/releases/tag/v1.2.0
[1.1.0]: https://github.com/michaltamas/volumio-artwork-theme/releases/tag/v1.1.0
[1.0.1]: https://github.com/michaltamas/volumio-artwork-theme/releases/tag/v1.0.1
[1.0.0]: https://github.com/michaltamas/volumio-artwork-theme/releases/tag/v1.0.0
