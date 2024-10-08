# Better Properties

Adds additional property types and configuration options to Obsidian's core **Properties View** plugin!

<div style="display: flex; gap: 5px;">

![property types example](./demo-assets/property-types-example.png)

![property types](./demo-assets/property-types.png)

![property types](./demo-assets/property-menu.png)

</div>

## Features

### General

-   Custom icon by property name
-   Custom icon and text colors
-   Mass update properties
-   Delete properties from all notes
-   Specify default hidden properties
    -   These will be hidden until the "Show hidden" button is clicked

### Additional property types

-   Dropdown
    -   Customizable options values and labels
-   Toggle
-   Color
-   Slider
    -   can set min, max, step, and if limits should be displayed
-   Button
    -   run inline JavaScript, a JavaScript file, or a command. (more options TBD)
-   Markdown (live preview)
    -   Obsidian only considers links here as "real" links (those that show in graph view, etc.) if the link is the only thing in the value.
-   Number+
    -   can set a min, max, and update via an expression
-   Stars
    -   can set custom star icon and count

## Roadmap

### Custom type widgets

-   [x] Dropdown
-   [x] Slider
-   [x] Toggle
-   [x] Color
-   [x] Number+
-   [x] Markdown
-   [x] Stars
-   [x] Button
-   [ ] ...more??

### Property icon menu

Additional options shown when clickong in the icon next to the property key

-   [x] delete property from all notes
-   [x] mass update property
-   [x] rename property
-   [x] configure property settings
-   [x] Show and link to notes that have this property
-   [x] change icon for property
-   [ ] ...more?

### Misc

-   [ ] translation (i18Next) support
-   [ ] sync with template
    -   Idea is to be able to sync notes that share a property/value pair of some kind with a designated template. This would add (and optionally remove?) properties from notes to be aligned with said template note.
-   [ ] set groups for property names
    -   tried this by patching the `metdataEditor` prototype, but I could only move the rendered property after it was rendered, which causes an ugly flash of it being moved, plus some weird duplication I couldn't figure out.
-   [ ] nested properties
    -   a way to do 'grouped' properties that are just objects in YAML. Dataview already supports these, so I could use them to create a copy of the metdataEditor for each nested property 'group'.
-   [ ] render property within regular and inline codeblocks
    -   allow render of individual property editors that can update the current note or other notes.
    -   inline code something like `&(key: string, filePath?: string, hideKey?: boolean)`
    -   Codeblock something like
        -   ```yaml
            key: <property-key>
            filePath: <file-path> (defaults to current note)
            hideKey: <boolean> (default false)
            ```
