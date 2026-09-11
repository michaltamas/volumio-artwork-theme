# Security policy

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's [private vulnerability reporting](https://github.com/michaltamas/volumio-artwork-theme/security/advisories/new) instead, or contact the maintainer directly. You will get an acknowledgement as soon as possible, and a fix or an explanation once the report has been assessed.

## What the theme does and does not do

Artwork One is a set of static files that the player's own web server delivers to your browser. It talks to the Volumio backend of the player it was loaded from through the same Socket.IO and REST interfaces as Volumio's own interfaces. The theme adds no external resources: its fonts and icons are bundled. Volumio features that contact outside services, such as MyVolumio, subscriptions, music services and Volumio's optional usage statistics, behave exactly as in the stock interface.

It stores no passwords or tokens of its own. Signing in to MyVolumio and to music services is handled by Volumio exactly as in the stock interface.

## What the installer changes on the player

`scripts/install.sh` runs as the `volumio` user and writes only:

- `/data/artwork-ui/`, the interface files,
- `/data/thirdPartyUisList.json`, where Volumio looks for additional interfaces,
- `/data/active_volumio_ui`, and only when you pass `--activate`.

It downloads the release archive from this repository's GitHub releases over HTTPS. Releases are built by GitHub Actions from the tagged source. As with any script piped into a shell, you are encouraged to read it first; it is short.
