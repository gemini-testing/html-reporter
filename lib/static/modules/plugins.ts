import {InstalledPlugin, loadPlugin, PluginConfig, preloadPlugin} from './load-plugin';

interface PluginSetupInfo {
    name: string
    config: PluginConfig
}

interface Config {
    pluginsEnabled: boolean;
    plugins: PluginSetupInfo[]
}

const plugins: Record<string, InstalledPlugin> = {};
const loadedPluginConfigs: PluginSetupInfo[] = [];

export function preloadAll(config: Config): void {
    if (!config || !config.pluginsEnabled || !Array.isArray(config.plugins)) {
        return;
    }

    config.plugins.forEach(plugin => preloadPlugin(plugin.name));
}

export async function loadAll(config: Config): Promise<void> {
    // if plugins are disabled, act like there are no plugins defined
    if (!config || !config.pluginsEnabled || !Array.isArray(config.plugins)) {
        return;
    }

    const pluginsSetupInfo = await Promise.all(config.plugins.map(async pluginConfig => {
        const plugin = await loadPlugin(pluginConfig.name, pluginConfig.config);
        if (plugin) {
            plugins[pluginConfig.name] = plugin;
            return pluginConfig;
        }
    }));

    pluginsSetupInfo.map((setupInfo) => {
        if (!setupInfo) {
            return;
        }

        loadedPluginConfigs.push(setupInfo);
    });
}

type ForEachPluginCallback = (plugin: InstalledPlugin, name: string) => void;

export function forEachPlugin(callback: ForEachPluginCallback): void {
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

export function getPluginField(name: string, field: string): unknown {
    const plugin = plugins[name];
    if (!plugin) {
        throw new Error(`Plugin "${name}" is not loaded.`);
    }
    if (!plugin[field]) {
        throw new Error(`"${field}" is not defined on plugin "${name}".`);
    }
    return plugins[name][field];
}

export function getLoadedConfigs(): PluginSetupInfo[] {
    return loadedPluginConfigs;
}
