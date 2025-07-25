# Clipboard Manager Plugin

A powerful clipboard manager plugin for Obsidian that automatically stores your clipboard history and provides advanced search functionality. Perfect for managing text snippets, code blocks, and frequently used content.

## Features

### 🔄 Automatic Clipboard Monitoring
- Automatically captures all text copied to your clipboard while Obsidian is running
- Configurable monitoring interval (default: 1 second)
- Persistent storage across Obsidian sessions

### 🔍 Advanced Search
- Real-time search through your clipboard history
- Search both content and previews
- Fast filtering for quick access to past clipboard entries

### 📋 Smart Management
- Configurable history limit (default: 100 entries)
- Automatic cleanup of old entries
- Preview generation for long text content
- Timestamp tracking for each entry

### 🎯 Quick Access
- Ribbon icon for easy access
- Command palette integration
- Hotkey support
- Quick paste modal with keyboard shortcuts

### 📤 Export Functionality
- Export all entries or filtered search results to Markdown files
- Configurable export folder location
- Preserves formatting with proper Markdown syntax

### ⚙️ Customizable Settings
- Adjustable maximum entries
- Configurable check interval
- Optional notifications
- Clean and intuitive settings panel

## Installation

### Manual Installation
1. Download the latest release files
2. Create a folder `clipboard-manager` in your `.obsidian/plugins/` directory
3. Copy `main.js`, `manifest.json`, and `styles.css` into the folder
4. Reload Obsidian
5. Enable the plugin in Settings → Community Plugins

### Development Installation
1. Clone this repository into your `.obsidian/plugins/` directory
2. Run `npm install` to install dependencies
3. Run `npm run build` to build the plugin
4. Reload Obsidian and enable the plugin

## Usage

### Basic Usage
1. **Automatic Capture**: Simply copy text as usual - the plugin automatically saves it
2. **Access History**: Click the clipboard icon in the ribbon or use the command palette
3. **Search**: Type in the search box to filter your clipboard history
4. **Copy Back**: Click "Copy" next to any entry to copy it back to your clipboard
5. **Delete Entries**: Remove unwanted entries with the "Delete" button
6. **Export**: Export all clipboard history to Markdown files

### Quick Paste Feature
1. Use the "Paste from Clipboard History" command
2. Search for the content you want
3. Press Enter or click to paste directly into your active note
4. Use number keys (1-9) for quick selection

### Commands
- **Open Clipboard Manager**: Opens the main clipboard history window
- **Paste from Clipboard History**: Opens quick paste modal for direct insertion

### Keyboard Shortcuts
- Search and filter in real-time
- Enter to paste first search result
- Number keys (1-9) for quick selection in paste modal
- Standard navigation with arrow keys

## Settings

### Maximum Entries
Set the maximum number of clipboard entries to store (default: 100). Older entries are automatically removed when this limit is exceeded.

### Check Interval
Configure how often the plugin checks for clipboard changes (default: 1000ms). Lower values provide faster detection but may impact performance.

### Notifications
Enable/disable notifications when new clipboard content is saved (default: disabled).

### Default Export Folder
Set the folder path where clipboard entries will be exported (default: "clipboard"). This path is relative to your vault root.

### Default Export Count
Set the maximum number of clipboard entries to export (default: 50). Entries are exported in chronological order, with the most recent entries first.

## Privacy & Security

- All clipboard data is stored locally in your Obsidian vault
- No data is sent to external servers
- Plugin only monitors text content (no images or files)
- Data persists only in your local Obsidian configuration

## Technical Details

### System Requirements
- Obsidian 0.15.0 or higher
- Desktop version only (uses Electron clipboard API)
- macOS, Windows, or Linux

### Storage
- Uses Obsidian's built-in data storage API
- Data stored in `.obsidian/plugins/clipboard-manager/data.json`
- Automatic backup with Obsidian's sync features

## Troubleshooting

### Plugin Not Working
1. Ensure you're using Obsidian desktop (not mobile)
2. Check that the plugin is enabled in Settings → Community Plugins
3. Restart Obsidian if the plugin isn't responding

### Clipboard Not Being Monitored
1. Verify the check interval setting isn't too high
2. Check console for errors (Ctrl/Cmd + Shift + I)
3. Try disabling and re-enabling the plugin

### Performance Issues
1. Reduce the maximum entries limit
2. Increase the check interval
3. Clear old clipboard history

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## License

MIT License - see LICENSE file for details.

## Changelog

### Version 1.0.0
- Initial release
- Automatic clipboard monitoring
- Search functionality
- Quick paste feature
- Export functionality for clipboard entries
- Export entries to Markdown files
- Configurable export settings
- Preserves formatting with proper Markdown syntax
- Configurable settings
- Clean, responsive UI