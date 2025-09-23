# Changelog

Each release should include an entry detailing the changes made since the last release. Some specific details may be omitted for brevity.

## 0.1.8

### New

- Made all property types able to be collapsed

### Bug fixes

- Fixed hot-reload issues with bpjs blocks using `api.renderProperty()`

## 0.1.7

### New

- Setup fully automated releases through github actions with changelog entries

### Bug fixes

- Fixed styling and rendering of Multiselect type when items should overflow to more than one line
- Fixed sub-properties within the Object type storing a stale reference of the its parent Object's value
- Fixed hot-reload issues with bpjs blocks that use `api.import()`
