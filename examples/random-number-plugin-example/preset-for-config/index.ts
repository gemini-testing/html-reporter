import { ExtensionPointName } from "html-reporter/plugins-sdk";

/**
 * Plugin configuration options that will be passed to the UI component.
 * Add any plugin-specific config options here.
 */
interface PluginConfig {
    // Example: apiKey?: string;
}

/**
 * Creates a plugin preset for html-reporter configuration.
 *
 * Usage in testplane config:
 * ```js
 * const randomNumberPlugin = require('random-number-plugin-example');
 *
 * module.exports = {
 *   plugins: {
 *     'html-reporter/testplane': {
 *       plugins: randomNumberPlugin({ })
 *     }
 *   }
 * };
 * ```
 */
export = function createPluginPreset(config: PluginConfig = {}) {
    return [
        {
            // Unique name for the plugin - should match the package name
            name: "random-number-plugin-example",
            // Component name exported from ui/index.tsx
            component: "RandomNumberPlugin",
            // Where to render the plugin in the UI
            point: ExtensionPointName.ResultMeta,
            // Position relative to existing content
            position: "after",
            // Config passed to the UI component via pluginOptions.pluginConfig
            config,
        },
    ];
};

