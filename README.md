> [!WARNING]
> 🚧 **UNDER CONSTRUCTION** 🚧
>
> This plugin is not yet intended to be used by others.
>
> But if you _really_ want to anyway, just be aware that there may be breaking changes that may require you to reconfigure different features and settings.

> [!IMPORTANT]
>
> **OBSIDIAN 1.9.x**
>
> There have been many "breaking" changes relating to properties since Obsidian version `1.9.x`. As such, this plugin will no longer work in Obsidian `1.8.x `and below

# Better Properties

What if Properties in Obsidian were... better?

This plugin adds many different properties-related features, such as new property types and per-property settings.

<div style="display: flex; gap: 5px; flex-wrap: wrap;">

<!-- ![property types example](./demo-assets/property-types-example.png)

![property types](./demo-assets/property-types.png)

![property types](./demo-assets/property-menu.png) -->

</div>

> [!WARNING] > **DISCLAIMER**
>
> This plugin aims to extend and seamlessly integrate into the existing metadata properties core-feature.
>
> In order to be so closely integrated with core features, this plugin makes _heavy_ use of the _undocumented Obsidian API_ and uses a few _monkey-patches_ around existing app functions.
>
> Because of the above, this plugin is prone to unforeseen, breaking changes on new updates to the Obsidian application.
>
> If you use this plugin, I would recommend you _turn off_ automatic updates for Obsidian _or_ be prepared to open bug reports and/or wait for fixes

## Contributing

- Bugs, feature requests, questions-- [Open an issue!](https://github.com/unxok/obsidian-better-properties/issues/new/choose)
- Pull requests-- likely won't be accepted at this time as the plugin is still in very early stages
- Translations-- _instructions TBD_

## Where's the docs??

My goal is to not _need_ to create official documentation for the features of this plugin. If needed, I may add additional help text to different settings or modals as needed. Please [open an issue](https://github.com/unxok/obsidian-better-properties/issues/new/choose) if you notice something that needs better documentation, whether within obsidian or not.

## Features

### Additional property types

**note:** Types that have a reserved keyword are marked with an asterisk (\*)

- [ ] Banner
- [ ] Button
- [ ] Color
- [ ] Counter
- [ ] Custom
- [x] Created\*
- [ ] Date Custom
- [x] Dropdown
- [x] Group
- [ ] Image
- [x] Markdown
- [ ] Modified
- [ ] Multiselect
- [ ] Progress
- [ ] Relation
- [ ] Select
- [ ] Slider
- [ ] Stars
- [ ] Tags Category
- [ ] Time
- [x] Title\*
- [x] Toggle

### Metadata (frontmatter) Editor

- [x] Resizable, draggable property label width
- [x] Hidden properties
- [ ] _More_ button
  - [x] Toggle showing hidden properties
  - [x] Sort properties
  - [ ] Synchronize with template

### Property editor

- [ ] property menu
  - [ ] Property type
    - [x] Distinguish custom from built-in
    - [ ] Option to separately group custom from built-in
  - [x] Open property settings
  - [x] Rename property
  - [x] Change icon
  - [ ] Other notes with this property
  - [x] Delete property from all notes
- [x] property aliase option
- [x] custom icon option
- [x] default value option
- [ ] custom suggestions option
- [ ] loader function option
- [ ] Save properties section fold state to property

### Commands

- [x] Open property settings
- [x] Refresh all Metadata Editors
- [x] Rebuild all views

### Miscellaneous

- [x] Option to disable certain property types
- [ ] Full link-recognition in property values
- [ ] Render property within note content as codeblock or inline-codeblock
