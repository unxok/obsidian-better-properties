# Changelog

Each release should include an entry detailing the changes made since the last
release. Some specific details may be omitted for brevity.

## 1.0.0

Not many user-facing changes this time, but I wanted to submit BP to the community plugins directory to hopefully get it approved before the end of the year. Fingers crossed🤞

### Fixed

- Dynamic Multi-/Selects now update their options after renaming a file. [#41](https://github.com/unxok/obsidian-better-properties/issues/41)

### Other

- Updated many parts of the plugin to ensure adherence to the different obsidian guidelines.

## 0.1.11

7 bugs and 3 feature requests completed. Thank you so much to everyone opening issues<3

### New

- Property value collapse indicators now display only when hovering over the type icon. [#30](https://github.com/unxok/obsidian-better-properties/issues/30)
- Array sub-properties now have a remove button next to their collapse indicator to more easily remove them. [#30](https://github.com/unxok/obsidian-better-properties/issues/30)
- Pressing "Enter" while inside an Array sub-property that isn't an Array or Object will create a new sub-property and focus within it. [#29](https://github.com/unxok/obsidian-better-properties/issues/29)
- Numeric will now always store a number and will display the number formatted according to locale while not actively typing within it.
- Select and Multi-Select items that are links will now open the linked file in a new tab on `Ctrl + click`. [#25](https://github.com/unxok/obsidian-better-properties/issues/25)

### Fixed

- Arrays containing Object sub-properties now behave correctly when a sub-property is updated. [#16](https://github.com/unxok/obsidian-better-properties/issues/16)
- Clicking the "Add property" button within an Array now behaves properly. [#28](https://github.com/unxok/obsidian-better-properties/issues/28)
- The property menu for Array sub-properties no longer shows the "Rename" and "Delete" option. [#33](https://github.com/unxok/obsidian-better-properties/issues/33)
- When using "Files from tag" for Selects and Multi-Selects, the tags entered in the "Tag(s)" setting can optionally start with a hashtag (#). [#24](https://github.com/unxok/obsidian-better-properties/issues/24)
- Clicking Enter while the cursor is inside a property's name input will now correctly move focus to the value editor. [#18](https://github.com/unxok/obsidian-better-properties/issues/18)
- Numeric will now treat commas (,) as decimal points (.) while typing an expression. [#34](https://github.com/unxok/obsidian-better-properties/issues/34)
- List properties no longer have unnecessary added height. [#31](https://github.com/unxok/obsidian-better-properties/issues/31)

## 0.1.10

This should be the last release before the beta annoucement🎉

### Fixed

- Hidden properties visiblity has been fixed when the "Show hidden" button is toggled on.
- ColorTextComponent's hidden color input is now correctly positioned within it's parent.
- Removed default options when opening settings for the first time for a Select or Multi-Select

## 0.1.9

Lots of `bpjs` updates!

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
