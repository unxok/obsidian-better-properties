# Changelog

Each release should include an entry detailing the changes made since the last release. Some specific details may be omitted for brevity.

## 0.1.9

### New

- When importing a JS file in a bpjs block with `api.import(file)`, the JS file can optionally use the syntax `export default` rather than `module.exports =`
- bpjs blocks can now use `api.import()` with the following file types: `.js`, `.css`, `.json`, `.yaml`, `.csv`, `.tsv`, `.md`, and `.txt`. Note, for `.csv` and `.tsv` you pass a second paramater for a custom delimeter character, for example: `api.import("data.csv", ";")`
- bpjs blocks can now use `api.markdown({text, element?})` to render plain text to markdown

### Fixed

- bpjs blocks will now show as plain text in Source Mode
- bpjs blocks will now auto-refresh when:
  - Any property's type changes
  - A "subscribed" file changes
    - Any file imported with `api.import(file)`
    - The file from the path passed to `api.getMetadata({property, file})`, `api.getProperty({property, file})`, or `api.renderProperty({property, file})`. If no file path is passed, then the file they are rendered in is used instead. Note you can opt out of auto-refresh by passing `subscribe: false`, for example: `api.getProperty({property: "status", subscribe: false})`

### Other

- removed the "script" codeblock processor (was used for prototyping)

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
