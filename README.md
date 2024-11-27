> [!WARNING] 
> 🚧UNDER CONSTRUCTION🚧
> This plugin is _almost_ ready for beta release... but not yet.
> I am currently doing some integration testing and it should be stable for others to use, but I wouldn't reccomend it as of right now.

# Better Properties

Adds additional property types and configuration options to Obsidian's core **Properties View** plugin!

<div style="display: flex; gap: 5px; flex-wrap: wrap;">

![property types example](./demo-assets/property-types-example.png)

![property types](./demo-assets/property-types.png)

![property types](./demo-assets/property-menu.png)

</div>

> [!WARNING] DISCLAIMER
> This property aims to extend and seamlessly integrate into the existing metadata properties core-feature.
>
> In order to be so closely integrated with core features, this plugin makes _heavy_ use of the _undocumented Obsidian API_ and uses a few _monkey-patches_ around existing app functions.
>
> Because of the above, this plugin is prone to unforeseen, breaking changes on new updates to the Obsidian application.
>
> If you use this plugin, I would recommend you _turn off automatic updates_ for Obsidian _or_ be prepared to open bug reports and/or wait for fixes when Obsidian updates release.

## Table of contents

- [Better Properties](#better-properties)
  - [Table of contents](#table-of-contents)
  - [Features](#features)
    - [Additional property types](#additional-property-types)
    - [Additional frontmatter property editor functionaly](#additional-frontmatter-property-editor-functionaly)
    - [Additional property features](#additional-property-features)
    - [Wrapper for dataview `EARLY ALPHA`](#wrapper-for-dataview-early-alpha)
      - [Why IDs instead of storing config in markown?](#why-ids-instead-of-storing-config-in-markown)
    - [In-note property editing `EARLY ALPHA`](#in-note-property-editing-early-alpha)
  - [Contributing](#contributing)
- [Old](#old)
  - [Features](#features-1)
    - [General](#general)
    - [Additional property types](#additional-property-types-1)
  - [Roadmap](#roadmap)
    - [Custom type widgets](#custom-type-widgets)
    - [Property icon menu](#property-icon-menu)
    - [Misc](#misc)

## Features

### Additional property types

Numerous property types are added to Obsidian!

> [!WARNING] Changes to built-in types
> _Better Properties_ heavily prefers to create new types as opposed to modifying existing types that Obsidian has built in. Therefore, requests to add/change functionality to built-in types will likely not be completed.

| Type     | Summary                                                               |
| -------- | --------------------------------------------------------------------- |
| Button   | Perform an action on clicking the button                              |
| Color    | A color input using native HTML functionality                         |
| Dropdown | A select input to choose from a set of options                        |
| Group    | An object of additional sub-properties                                |
| Markdown | Live-preview enabled markdown editor                                  |
| Number+  | A number input with added action buttons                              |
| Progress | A progress bar from 0% - 100%                                         |
| Relation | Display a property from another note that is updated bi-directionally |
| Slider   | A slider input with customizable limits                               |
| Stars    | A number of stars that act like a rating input                        |
| Time     | A time input (no date)                                                |
| Toggle   | A toggle input that acts the same as a checkbox                       |

### Additional frontmatter property editor functionaly

Added functionaly has been added to the property editor for notes.

| Feature                | Summary                                                                                                         |
| ---------------------- | --------------------------------------------------------------------------------------------------------------- |
| Hidden properties      | Set properties as "hidden", which will hide them by default when opening a note until "show hidden" is clicked. |
| Sort properties        | Reorder properties based on name, type, or a `UPCOMING` template                                                |
| Synchronize properties | Sync properties between a template note and notes that correlate with it.                                       |

### Additional property features

asdf

### Wrapper for dataview `EARLY ALPHA`

Dataview tables become enabled with editing functionality for each property with our wrapper.

> [!NOTE] But Datacore...?
> This wrapper has a different goal than Datacore.
> To put it simply, this wrapper just renders the property widgets that are normally used in the frontmatter property editor... plus some other things like pagination and other basic table-editing features.

Simply change your block language to `datavie-bp` then press space and type and ID like the following:

````
```dataview-bp SOME-ID
TABLE col1, col2
FROM #tag
```
````

> [!WARNING] Dataview gotchas
>
> - **Only** _TABLE_ queries are allowed
> - _GROUP BY_ is **not** allowed
> - _Inline properties_ are **not** supported
> - Use the `tags` property to properly update note tags (**not** `file.tags` or `file.etags`)

#### Why IDs instead of storing config in markown?

An ID for each `dataview-bp` is needed to associate a block with stored configuration like whether to show property type icons.

I have previously experimented with storing this configuration as YAML inside the codeblock markdown, but have decided instead to use an ID system for the following reasons:

- Updates to the source text of a codeblock will _always_ cause a re-render which can cause unnecessary re-renders which complicates certain features
- Makes blocks incompatible with Dataview syntax
- Can't share configuration between blocks in different places
- More prone to accidental (breaking) changes by users/other pugins/etc.

However, this approach does have some cons

- Less portable for users to copy and paste elsewhere
- Unused ID cofigs may take up disk space
  - `UPCOMING` You can automatically check for unused IDs in the plugin settings and choose to delete them.

### In-note property editing `EARLY ALPHA`

## Contributing

Please open [open an issue] to request new ones or feature requests to existing types. If your request has already been opened, please give it a thumbs up to show your support for it.

If you'd like to contribute to a bug fix or feature request, please feel free to submit a PR.

---

# Old

## Features

### General

- Custom icon by property name
- Custom icon and text colors
- Mass update properties
- Delete properties from all notes
- Specify default hidden properties
  - These will be hidden until the "Show hidden" button is clicked

### Additional property types

- Dropdown
  - Customizable options values and labels
- Toggle
- Color
- Slider
  - can set min, max, step, and if limits should be displayed
- Button
  - run inline JavaScript, a JavaScript file, or a command. (more options TBD)
- Markdown (live preview)
  - Obsidian only considers links here as "real" links (those that show in graph view, etc.) if the link is the only thing in the value.
- Number+
  - can set a min, max, and update via an expression
- Stars
  - can set custom star icon and count

## Roadmap

### Custom type widgets

- [x] Dropdown
- [x] Slider
- [x] Toggle
- [x] Color
- [x] Number+
- [x] Markdown
- [x] Stars
- [x] Button
- [ ] JS
  - Essentially a "custom" type. Executes arbitrary JS that receives the normal arguments provided to type widget render functions, allowing users to make a practically custom type widget
- [ ] Progress
  - May or may not do this. Most people probably would want JS to update this dynamically which is better suited for the JS type
- [ ] Date range
- [ ] Group (nested object)
- [ ] Cycle
- [ ] Time
- [ ] ...more?? (open an issue for a FR with suggestions!)

### Property icon menu

Additional options shown when clickong in the icon next to the property key

- [x] delete property from all notes
- [x] mass update property
- [x] rename property
- [x] configure property settings
- [x] Show and link to notes that have this property
- [x] change icon for property
- [ ] ...more?

### Misc

- [x] zod for validation
- translation (i18Next) support
  - [x] Replace all hardcoded strings
  - [ ] Make guide for contributing translations and what are currently added/reviewed
- sync with template
  - [x] Customizable template-id property name
  - [x] Customiable template proeprty name
  - [x] Sync properties option in more options button menu
  - [x] Option to show warning
  - [ ] Option to delete extra properties
- [ ] set groups for property names
  - tried this by patching the `metdataEditor` prototype, but I could only move the rendered property after it was rendered, which causes an ugly flash of it being moved, plus some weird duplication I couldn't figure out.
- [ ] nested properties
  - a way to do 'grouped' properties that are just objects in YAML. Dataview already supports these, so I could use them to create a copy of the metdataEditor for each nested property 'group'.
- [ ] render property within regular and inline codeblocks
  - First implementation ready, need to review and refine
    - [ ] Need to replace hard coded strings with i18next
    - [x] Doesn't render in table cells. For reference, it looks like dataview has this issue but meta-bind doesn't.
      - Fixed. However, when you click the cell obsidian switches the cell from reading to live-preview and places the cursor in the code text and unrenders the widget. Don't know a solution yet. Meta-bind has the same problem.
  - allow render of individual property editors that can update the current note or other notes.
  - inline code something like `&=propertyName: <string>, fileName: <string | undefined>, cssClass: <string | undefined>`
  - Codeblock something like
    - ```yaml
      propertyName: <string>
      filePath: <string | undefined> (defaults to current note)
      cssClass: <string | undefined>
      ```
