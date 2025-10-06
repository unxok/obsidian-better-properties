# Better Properties

What if Properties in Obsidian were... better?

This [Obsidian](https://obsidian.md) plugin adds many different properties-related features, such as new property types and per-property settings.

For documentation, check out the [Better Properties Docs](https://better-properties.unxok.com) website.

![property menu](/demo-assets/property-menu.png)

![properties](/demo-assets/properties.png)

## Community Plugins submission prep

### Adhere to the [Style guide](https://help.obsidian.md/style-guide#Directions)

- [x] Terminology and grammar
  - This heading has no text under it...
- [x] Language style
- [x] Terms
- [x] Product names
- [x] UI and interactions
- [x] Notes, files, and folders
- [x] Reference documentation for settings
- [x] Directional terms
- [x] Instructions
- [x] Sentence case
- [x] Examples
- [x] Key names
- [x] Markdown
- [x] Images
- [x] Icons and images
- [x] Icons
- [x] Image anchor tags
- [x] Optimization
- [x] Layout
- [x] Broken links
- [x] Descriptions
- [x] Directions
- [x] Translations

### Adhere to the [Plugin guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines)

- [x] General
  - [x] Avoid using global app instance
  - [x] Avoid unnecessary logging to console
    - There are two uses each in `src/CustomPropertyTypes/MultiSelect` and `src/CustomPropertyTypes/Select`, but they are in response to a user action where the user expects the logging to occur.
  - [x] Consider organizing your code base using folders
  - [x] Rename placeholder class names
- [x] Mobile
- [x] UI text
  - [x] Only use headings under settings if you have more than one section
  - [x] Avoid "settings" in settings headings
  - [x] Use sentence case in UI
  - [x] Use setHeading instead of a `<h1>`, `<h2>`
- [x] Security
  - [x] Avoid innerHTML, outerHTML and insertAdjacentHTML
- [x] Resource management
  - [x] Clean up resources when plugin unloads
  - [x] Don’t detach leaves in unload
- [x] Commands
  - [x] Avoid setting a default hotkey for commands
  - [x] Use the appropriate callback type for commands
- [x] Workspace
  - [x] Avoid accessing workspace.activeLeaf directly
  - [x] Avoid managing references to custom views
- [x] Vault
  - [x] Prefer the Editor API instead of Vault.modify to the active file
  - [x] Prefer Vault.process instead of Vault.modify to modify a file in the background
  - [x] Prefer FileManager.processFrontMatter to modify frontmatter of a note
  - [x] Prefer the Vault API over the Adapter API
  - [x] Avoid iterating all files to find a file by its path
  - [x] Use normalizePath() to clean up user-defined paths
- [x] Editor
  - [x] Change or reconfigure editor extensions
- [x] Styling
  - [x] No hardcoded styling
- [x] TypeScript
  - [x] Prefer const and let over var
  - [x] Prefer async/await over Promise

### [Obsidian October plugin self-critique checklist](https://docs.obsidian.md/oo/plugin)

#### Releasing and naming

- [x] Remove placeholder names such as MyPlugin and SampleSettingTab.
- [x] Don't include the word "Obsidian" in your name unless it absolutely makes sense. Most of the time it's redundant.
- [x] Don't include your plugin name in command names. Obsidian adds this for you.
- [x] Don't prefix commands with your plugin ID. Obsidian adds this for you.
- [x] Don't include main.js in your repo. Only include it in your releases.
- [x] If you haven't, consider add a fundingUrl so that users of your plugin can show some support. Learn more.

#### Compatibility

- [x] Don't provide default hotkeys for commands. Learn more.
- [x] Don't override core styling. If needed, add your own class and make the styling only apply to your class.
- [x] Do scan your code for deprecated methods (they usually show up as strikeout text in IDEs).
- [x] Don't assign styles via JavaScript or in HTML. Learn more.
- [x] Don't access the hardcoded .obsidian folder if you need to access the configuration directory. The location could be customized, so please use Vault.configDir instead.

#### Mobile support

Complete this section if you have isDesktopOnly set to false in your manifest.

- [x] Don’t use Node.js modules such as fs, path, or electron at the top level. If needed, gate the functionality behind Platform.isDesktopApp and require() them dynamically at runtime.
- [x] Don't use regex lookbehinds if you want to support iOS versions lower than 16.4 (ignore this if you don't use regex in your plugin). Learn more.
- [x] Don't cast Vault.adapter to FileSystemAdapter. All usages of FileSystemAdapter should be gated behind an instanceof check. On mobile, Vault.adapter will be an instance of CapacitorAdapter.
- [x] Don't use process.platform, use Obsidian's Platform instead. Link to API.
- [x] Don't use fetch or axios.get, use Obsidian's requestUrl instead. Link to API.

#### Coding style

- [x] Don't use var. Use let or const instead. Learn more.
- [x] Don't use the global app instance. Use this.app provided to your plugin instance instead. Learn more.
- [x] Do break up your main.ts into smaller files or even folders if it gets big to make code easier to find.
- [x] Do use async and await when you can for readability, instead of using Promise. Learn more.
- [x] Don't use global variables. Try to keep variables either in the scope of classes or functions. Learn more.
- [x] Do test with instanceof before casting into other types such as TFile, TFolder, or FileSystemAdapter.
- [x] Don't use use as any and use proper typing instead.

#### Security

- [x] Do disclose relevant information in your README file (payments, account requirements, network use, external file access, ads, telemetry with privacy policy, closed source code).
- [x] Do be mindful of all dependencies you add to your plugin. Remember that less is safer.
- [x] Do not include any client-side telemetry. Libraries that offer usage tracking and metrics will often collect information that users could consider sensitive.
- [x] Do commit and use a lock file (package-lock.json, pnpm-lock.yaml, or yarn.lock) when using a package manager (npm, pnpm, or yarn).

#### API usage

- [x] Don't use Vault.modify. If you want to edit the active file, prefer using the Editor interface. If you want to edit it in the background, use Vault.process.
- [x] Don't manually read and write frontmatter. Instead, use FileManager.processFrontMatter. Learn more.
- [x] Don't use vault.delete to delete files. Use trashFile instead to make sure the file is deleted according to the users preferences. Learn more.
- [x] Don't use the Adapter API whenever possible. Use Vault API instead. Learn more.
- [x] Don't manage reading and write plugin data yourself. Use Plugin.loadData() and Plugin.saveData() instead.
- [x] Do use normalizePath() if you take user defined paths. Learn more.

#### Performance

- [x] Do optimize your plugin's load time. Detailed guide.
- [x] Don't iterate all files to find a file or folder by its path. Learn more.
- [x] If you want your plugins to be compatible with Obsidian 1.7.2+, update your plugin to work with DeferredViews. Detailed guide.
- [x] If you're using moment, make sure you're doing import { moment} from 'obsidian' so that you don't import another copy.
- [x] Do minimize your main.js for releasing.
- [x] Do your initial UI setup on workspace.onLayoutReady() instead of in the constructor or onload() function. Learn more.

#### User interface

- [x] Don't use setting headings unless you have more than one section. Learn more.
- [x] Don't include the word "setting" or "option" in setting headings. Learn more.
  - Used "options" or "options" a few times for settings talking specifically about a Select/Mult-Select's available options, so I think that's fine.
- [x] Do use sentence case in all text in UI elements to be consistent with rest of Obsidian UI. Learn more.
- [x] Don't use `<h1>` or `<h2>` for setting header. Use Obsidian API instead. Learn more.
- [x] Don't do console.log unless they are absolutely necessarily. Remove testing console logs that are not needed for production.
