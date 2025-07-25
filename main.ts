import { App, Plugin, PluginSettingTab, Setting, Modal, Notice, TFile, MarkdownView } from 'obsidian';

interface ClipboardEntry {
    id: string;
    content: string;
    timestamp: number;
    preview: string;
}

interface ClipboardManagerSettings {
    maxEntries: number;
    checkInterval: number;
    enableNotifications: boolean;
    defaultExportFolder: string;
    defaultExportCount: number;
}

const DEFAULT_SETTINGS: ClipboardManagerSettings = {
    maxEntries: 100,
    checkInterval: 1000, // 1 second
    enableNotifications: false,
    defaultExportFolder: 'clipboard',
    defaultExportCount: 50
};

export default class ClipboardManagerPlugin extends Plugin {
    settings: ClipboardManagerSettings;
    clipboardHistory: ClipboardEntry[] = [];
    lastClipboardContent: string = '';
    intervalId: number;
    private historyUpdateCallbacks: Set<() => void> = new Set();

    async onload() {
        await this.loadSettings();

        // Add ribbon icon
        this.addRibbonIcon('clipboard', 'Clipboard manager', (evt: MouseEvent) => {
            new ClipboardHistoryModal(this.app, this).open();
        });

        // Add command
        this.addCommand({
            id: 'open-clipboard-manager',
            name: 'Open clipboard history',
            callback: () => {
                new ClipboardHistoryModal(this.app, this).open();
            }
        });

        // Add command to paste from history
        this.addCommand({
            id: 'paste-from-history',
            name: 'Paste from history',
            callback: () => {
                new ClipboardPasteModal(this.app, this).open();
            }
        });

        // Add settings tab
        this.addSettingTab(new ClipboardManagerSettingTab(this.app, this));

        // Load clipboard history
        await this.loadClipboardHistory();

        // Start monitoring clipboard
        this.startClipboardMonitoring();

        console.log('Clipboard Manager plugin loaded');
    }

    onunload() {
        this.stopClipboardMonitoring();
        console.log('Clipboard Manager plugin unloaded');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }

    async loadClipboardHistory() {
        const data = await this.loadData();
        this.clipboardHistory = data?.clipboardHistory || [];
    }

    async saveClipboardHistory() {
        await this.saveData({
            ...this.settings,
            clipboardHistory: this.clipboardHistory
        });
    }

    startClipboardMonitoring() {
        // Get initial clipboard content
        const { clipboard } = require('electron');
        this.lastClipboardContent = clipboard.readText();

        this.intervalId = window.setInterval(() => {
            this.checkClipboard();
        }, this.settings.checkInterval);
    }

    stopClipboardMonitoring() {
        if (this.intervalId) {
            window.clearInterval(this.intervalId);
        }
    }

    checkClipboard() {
        try {
            const { clipboard } = require('electron');
            const currentContent = clipboard.readText();

            if (currentContent && currentContent !== this.lastClipboardContent) {
                this.addClipboardEntry(currentContent);
                this.lastClipboardContent = currentContent;

                if (this.settings.enableNotifications) {
                    new Notice('Clipboard content saved!');
                }
            }
        } catch (error) {
            console.error('Error checking clipboard:', error);
        }
    }

    addClipboardEntry(content: string) {
        const entry: ClipboardEntry = {
            id: Date.now().toString(),
            content: content,
            timestamp: Date.now(),
            preview: this.createPreview(content)
        };

        // Add to beginning of array
        this.clipboardHistory.unshift(entry);

        // Limit history size
        if (this.clipboardHistory.length > this.settings.maxEntries) {
            this.clipboardHistory = this.clipboardHistory.slice(0, this.settings.maxEntries);
        }

        // Save to storage
        this.saveClipboardHistory();

        // Notify listeners of history update
        this.notifyHistoryUpdate();
    }

    registerHistoryUpdateCallback(callback: () => void) {
        this.historyUpdateCallbacks.add(callback);
    }

    unregisterHistoryUpdateCallback(callback: () => void) {
        this.historyUpdateCallbacks.delete(callback);
    }

    private notifyHistoryUpdate() {
        this.historyUpdateCallbacks.forEach(callback => callback());
    }

    createPreview(content: string): string {
        const maxLength = 100;
        const trimmed = content.trim().replace(/\n/g, ' ');
        return trimmed.length > maxLength ? trimmed.substring(0, maxLength) + '...' : trimmed;
    }

    searchClipboardHistory(query: string): ClipboardEntry[] {
        if (!query) return this.clipboardHistory;
        
        const lowerQuery = query.toLowerCase();
        return this.clipboardHistory.filter(entry => 
            entry.content.toLowerCase().includes(lowerQuery) ||
            entry.preview.toLowerCase().includes(lowerQuery)
        );
    }

    async copyToClipboard(content: string) {
        try {
            const { clipboard } = require('electron');
            clipboard.writeText(content);
            new Notice('Copied to clipboard!');
        } catch (error) {
            console.error('Error copying to clipboard:', error);
            new Notice('Failed to copy to clipboard');
        }
    }

    deleteClipboardEntry(id: string) {
        this.clipboardHistory = this.clipboardHistory.filter(entry => entry.id !== id);
        this.saveClipboardHistory();
        this.notifyHistoryUpdate();
    }

    clearClipboardHistory() {
        this.clipboardHistory = [];
        this.saveClipboardHistory();
        this.notifyHistoryUpdate();
        new Notice('Clipboard history cleared!');
    }

    async exportClipboardEntries(entries: ClipboardEntry[], folderPath?: string, maxEntries?: number) {
        // Create clipboard folder if it doesn't exist
        const clipboardFolder = folderPath || this.settings.defaultExportFolder;
        
        // Limit the number of entries to export
        const limitedEntries = entries.slice(0, maxEntries || this.settings.defaultExportCount);
        
        try {
            if (!(await this.app.vault.adapter.exists(clipboardFolder))) {
                await this.app.vault.createFolder(clipboardFolder);
            }
            
            // Generate timestamp for filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `${clipboardFolder}/${timestamp}.md`;
            
            // Format content
            let content = `# Clipboard Export (${new Date().toLocaleString()})\n\n`;
            
            // Add each entry with timestamp
            limitedEntries.forEach((entry, index) => {
                content += `## Entry ${index + 1} - ${new Date(entry.timestamp).toLocaleString()}\n\n`;
                
                // Check if content appears to be markdown
                if (entry.content.includes('#') || entry.content.includes('```') || 
                    entry.content.includes('*') || entry.content.includes('- [')) {
                    // For markdown content, add a special code block to preserve formatting
                    content += "```markdown\n" + entry.content + "\n```\n\n";
                    // Also add raw version for usability
                    content += entry.content + "\n\n";
                } else {
                    // Regular content
                    content += "```\n" + entry.content + "\n```\n\n";
                }
            });
            
            // Create file
            await this.app.vault.create(filename, content);
            
            // Show confirmation
            new Notice(`Exported ${limitedEntries.length} clipboard entries to ${filename}`);
            
            return filename;
        } catch (error) {
            console.error('Error exporting clipboard entries:', error);
            new Notice('Failed to export clipboard entries');
            return null;
        }
    }
}

class ClipboardHistoryModal extends Modal {
    plugin: ClipboardManagerPlugin;
    searchInput: HTMLInputElement;
    historyContainer: HTMLElement;
    private updateCallback: () => void;

    constructor(app: App, plugin: ClipboardManagerPlugin) {
        super(app);
        this.plugin = plugin;
        this.updateCallback = () => this.renderHistory();
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Register for history updates
        this.plugin.registerHistoryUpdateCallback(this.updateCallback);

        contentEl.createEl('h2', { text: 'Clipboard history' });

        // Search input
        const searchContainer = contentEl.createDiv('clipboard-search-container');
        this.searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: 'Search clipboard history...',
            cls: 'clipboard-search-input'
        });

        this.searchInput.addEventListener('input', () => {
            this.renderHistory();
        });

        // Buttons container
        const buttonsContainer = contentEl.createDiv('clipboard-buttons');
        
        // Export button
        const exportButton = buttonsContainer.createEl('button', {
                                    text: 'Export all',
            cls: 'mod-cta'
        });
        exportButton.addEventListener('click', () => {
            const entries = this.searchInput.value 
                ? this.plugin.searchClipboardHistory(this.searchInput.value)
                : this.plugin.clipboardHistory;
                
            if (entries.length > 0) {
                this.plugin.exportClipboardEntries(entries);
            } else {
                new Notice('No entries to export');
            }
        });
        
        // Clear all button
        const clearButton = buttonsContainer.createEl('button', {
                                    text: 'Clear all',
            cls: 'mod-warning'
        });
        clearButton.addEventListener('click', () => {
            this.plugin.clearClipboardHistory();
        });

        // History container
        this.historyContainer = contentEl.createDiv('clipboard-history-container');

        this.renderHistory();

        // Focus search input
        this.searchInput.focus();
    }

    renderHistory() {
        this.historyContainer.empty();

        const query = this.searchInput.value;
        const filteredHistory = this.plugin.searchClipboardHistory(query);

        if (filteredHistory.length === 0) {
            this.historyContainer.createEl('p', {
                text: query ? 'No matching clipboard entries found.' : 'No clipboard history yet.',
                cls: 'clipboard-empty-message'
            });
            return;
        }

        filteredHistory.forEach(entry => {
            const entryEl = this.historyContainer.createDiv('clipboard-entry');
            
            const headerEl = entryEl.createDiv('clipboard-entry-header');
            const timeEl = headerEl.createEl('span', {
                text: new Date(entry.timestamp).toLocaleString(),
                cls: 'clipboard-entry-time'
            });

            const actionsEl = headerEl.createDiv('clipboard-entry-actions');
            
            const copyButton = actionsEl.createEl('button', {
                text: 'Copy',
                cls: 'mod-cta clipboard-action-btn'
            });
            copyButton.addEventListener('click', () => {
                this.plugin.copyToClipboard(entry.content);
            });


            const deleteButton = actionsEl.createEl('button', {
                text: 'Delete',
                cls: 'mod-warning clipboard-action-btn'
            });
            deleteButton.addEventListener('click', () => {
                this.plugin.deleteClipboardEntry(entry.id);
            });

            const contentEl = entryEl.createDiv('clipboard-entry-content');
            contentEl.createEl('pre', {
                text: entry.content,
                cls: 'clipboard-entry-text'
            });
        });
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Unregister from history updates
        this.plugin.unregisterHistoryUpdateCallback(this.updateCallback);
    }
}

class ClipboardPasteModal extends Modal {
    plugin: ClipboardManagerPlugin;
    searchInput: HTMLInputElement;
    private updateCallback: () => void;

    constructor(app: App, plugin: ClipboardManagerPlugin) {
        super(app);
        this.plugin = plugin;
        this.updateCallback = () => this.renderPasteOptions();
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        // Register for history updates
        this.plugin.registerHistoryUpdateCallback(this.updateCallback);

        contentEl.createEl('h2', { text: 'Paste from clipboard history' });

        // Search input
        const searchContainer = contentEl.createDiv('clipboard-search-container');
        this.searchInput = searchContainer.createEl('input', {
            type: 'text',
            placeholder: 'Search and paste...',
            cls: 'clipboard-search-input'
        });

        this.searchInput.addEventListener('input', () => {
            this.renderPasteOptions();
        });

        this.searchInput.addEventListener('keydown', (evt) => {
            if (evt.key === 'Enter') {
                this.pasteFirstResult();
            }
        });

        // Results container
        const resultsContainer = contentEl.createDiv('clipboard-paste-results');

        this.renderPasteOptions();

        // Focus search input
        this.searchInput.focus();
    }

    renderPasteOptions() {
        const resultsContainer = this.contentEl.querySelector('.clipboard-paste-results') as HTMLElement;
        resultsContainer.empty();

        const query = this.searchInput.value;
        const filteredHistory = this.plugin.searchClipboardHistory(query).slice(0, 10); // Limit to 10 results

        if (filteredHistory.length === 0) {
            resultsContainer.createEl('p', {
                text: 'No matching clipboard entries found.',
                cls: 'clipboard-empty-message'
            });
            return;
        }

        filteredHistory.forEach((entry, index) => {
            const entryEl = resultsContainer.createDiv('clipboard-paste-entry');
            
            const shortcut = entryEl.createEl('span', {
                text: `${index + 1}`,
                cls: 'clipboard-paste-shortcut'
            });

            const preview = entryEl.createEl('span', {
                text: entry.preview,
                cls: 'clipboard-paste-preview'
            });

            entryEl.addEventListener('click', () => {
                this.pasteEntry(entry);
            });

            // Add keyboard shortcut support
            if (index < 9) {
                entryEl.addEventListener('keydown', (evt) => {
                    if (evt.key === (index + 1).toString()) {
                        this.pasteEntry(entry);
                    }
                });
            }
        });
    }

    pasteFirstResult() {
        const query = this.searchInput.value;
        const filteredHistory = this.plugin.searchClipboardHistory(query);
        if (filteredHistory.length > 0) {
            this.pasteEntry(filteredHistory[0]);
        }
    }

    pasteEntry(entry: ClipboardEntry) {
        // Get the active editor
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView) {
            const editor = activeView.editor;
            editor.replaceSelection(entry.content);
        }
        
        this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        
        // Unregister from history updates
        this.plugin.unregisterHistoryUpdateCallback(this.updateCallback);
    }
}

class ClipboardManagerSettingTab extends PluginSettingTab {
    plugin: ClipboardManagerPlugin;

    constructor(app: App, plugin: ClipboardManagerPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();



        new Setting(containerEl)
            .setName('Maximum entries')
            .setDesc('Maximum number of clipboard entries to store')
            .addText(text => text
                .setPlaceholder('100')
                .setValue(this.plugin.settings.maxEntries.toString())
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.maxEntries = num;
                        await this.plugin.saveSettings();
                    }
                }));

        new Setting(containerEl)
            .setName('Check interval')
            .setDesc('How often to check clipboard (in milliseconds)')
            .addText(text => text
                .setPlaceholder('1000')
                .setValue(this.plugin.settings.checkInterval.toString())
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num >= 100) {
                        this.plugin.settings.checkInterval = num;
                        await this.plugin.saveSettings();
                        // Restart monitoring with new interval
                        this.plugin.stopClipboardMonitoring();
                        this.plugin.startClipboardMonitoring();
                    }
                }));

        new Setting(containerEl)
            .setName('Enable notifications')
            .setDesc('Show notifications when clipboard content is saved')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.enableNotifications)
                .onChange(async (value) => {
                    this.plugin.settings.enableNotifications = value;
                    await this.plugin.saveSettings();
                }));
                
        new Setting(containerEl)
            .setName('Default export folder')
            .setDesc('Path where clipboard entries will be exported (relative to vault root)')
            .addText(text => text
                .setPlaceholder('clipboard')
                .setValue(this.plugin.settings.defaultExportFolder)
                .onChange(async (value) => {
                    if (value) {
                        this.plugin.settings.defaultExportFolder = value;
                        await this.plugin.saveSettings();
                    }
                }));
                
        new Setting(containerEl)
            .setName('Default export count')
            .setDesc('Maximum number of entries to export (most recent first)')
            .addText(text => text
                .setPlaceholder('50')
                .setValue(this.plugin.settings.defaultExportCount.toString())
                .onChange(async (value) => {
                    const num = parseInt(value);
                    if (!isNaN(num) && num > 0) {
                        this.plugin.settings.defaultExportCount = num;
                        await this.plugin.saveSettings();
                    }
                }));
    }
} 