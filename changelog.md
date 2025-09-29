# Changelog

Each release should include an entry detailing the changes made since the last release. Some specific details may be omitted for brevity.

## 0.1.8

Not much done in this release, but it's the first release since creating the [Better Properties Docs](https://better-properties.unxok.com) site!

### New

- Made all property types able to be collapsed

### Bug fixes

- Fixed hot-reload issues with bpjs blocks using `api.renderProperty()`

### Other

- Started prototyping the `Relation` type. It's not quite ready to release
- Updated `manifest.json` id to not include "obsidian"
- Updated readme with the link to the new docs site
- Temporarily removed feature of `bpjs` blocks to re-render when subscribed files change due to memory leak. I have an idea of how to fix it that will likely be in next release.

## 0.1.7

### New

- Setup fully automated releases through github actions with changelog entries

### Bug fixes

- Fixed styling and rendering of Multiselect type when items should overflow to more than one line
- Fixed sub-properties within the Object type storing a stale reference of the its parent Object's value
- Fixed hot-reload issues with bpjs blocks that use `api.import()`
