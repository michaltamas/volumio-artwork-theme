# Contributing

Thanks for taking the time to help.

## Reporting a bug

Open an issue with the bug report template and include:

- the Artwork One version (`cat /data/artwork-ui/VERSION` on the player),
- the Volumio version and the device,
- the browser, its version and the operating system,
- the window or screen size, or the phone or tablet model,
- a screenshot, and what you expected to see instead.

For problems that are not visual, the browser console often tells the story: open the developer tools, reproduce the problem and copy any red messages into the issue.

## Working on the code

Everything builds in Docker; see [Building from source](README.md#building-from-source).

```bash
./build.sh artwork artwork                 # build into dist/
scripts/deploy.sh volumio@volumio.local    # install the build on a player
```

`deploy.sh` installs your build with the same `scripts/install.sh` a release uses, so what you test is what users get. A player you can experiment on is the only realistic test environment, because the interface depends on live data from Volumio.

The theme lives in `src/app/themes/artwork/`. Components only this theme uses are named `aw-*`. Changes to Volumio's shared code must keep its other themes working: prefer a theme-specific template with a fallback to Volumio's own, as the existing ones do.

## House rules

- **Keep every Volumio feature.** The theme restyles; it does not remove. A control that exists in the stock interface must remain reachable.
- **Real data only.** Show what Volumio reports, and nothing invented. If data is not available, leave the element out.
- **Fluid, not breakpoint-driven.** Sizes flow from the `clamp()` tokens in `artwork-tokens.scss`. Structural switches for small or unusual screens belong in `zz-fluid/`. Check a change at a phone width (around 390 px), a tablet, a desktop window and a short, wide display.
- **Never key behaviour on translated text.** Choose icons and logic by ids, plugin names, URIs or state, never by a label that changes with the language.
- **Reuse the shared controls.** Buttons, pills, switches, rows and cards already exist; new screens use them instead of new variants.
- **Fix causes, not symptoms.** Explain in the commit message why something happened, not only what was changed.

### Build quirks worth knowing

- libsass silently drops `min()` and `max()` with mixed units. Wrap them in `unquote("…")`.
- The CSS optimiser removes `:has()` selectors, so do not rely on them.
- Stylesheets under `themes/artwork/components/` are injected after `zz-fluid/`. A small-screen override for one of those components needs a more specific selector.
- In AngularJS templates, never bind `ng-repeat` to a getter that returns a new array on every call. That causes an infinite digest; cache the result.

## Commit messages

One logical change per commit. Write the subject as a short statement of what changed and use the body for why:

```
artwork: mini player centre column carries the full waveform

The fluid grid sized the centre column to the transport, which squeezed
the waveform to about 210 px.
```

## Pull requests

Say what changed, why, and how you tested it: which browsers and screen sizes, and whether you ran it on a real player with which Volumio version. CI builds the theme and checks the shell scripts; it must be green.
