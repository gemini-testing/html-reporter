import {loadPlugin, preloadPlugin} from './load-plugin';

const plugins = Object.create(null);
const loadedPluginConfigs = [];

export function preloadAll(config) {
    if (!config || !config.pluginsEnabled || !Array.isArray(config.plugins)) {
        return;
    }

    config.plugins.forEach(plugin => preloadPlugin(plugin.name));
}

export async function loadAll(config) {
    // if plugins are disabled, act like there are no plugins defined
    if (!config || !config.pluginsEnabled || !Array.isArray(config.plugins)) {
        return;
    }

    const pluginConfigs = await Promise.all(config.plugins.map(async pluginConfig => {
        const plugin = await loadPlugin(pluginConfig.name, pluginConfig.config);
        if (plugin) {
            plugins[pluginConfig.name] = plugin;
            return pluginConfig;
        }
    }));

    loadedPluginConfigs.push(...pluginConfigs.filter(Boolean));
}

export function forEach(callback) {
    const visited = new Set();
    loadedPluginConfigs.forEach(({name}) => {
        if (!visited.has(name)) {
            visited.add(name);
            try {
                callback(plugins[name], name);
            } catch (err) {
                console.error(`Error on "${name}" plugin iteration:`, err);
            }
        }
    });
}

export function get(name, field) {
    const plugin = plugins[name];
    if (!plugin) {
        throw new Error(`Plugin "${name}" is not loaded.`);
    }
    if (!plugin[field]) {
        throw new Error(`"${field}" is not defined on plugin "${name}".`);
    }
    return plugins[name][field];
}

export function getLoadedConfigs() {
    return loadedPluginConfigs;
}
