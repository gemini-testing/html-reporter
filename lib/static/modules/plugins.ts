import {ConfigForStaticFile} from '@/server-utils';
import {InstalledPlugin, loadPlugin, preloadPlugin} from './load-plugin';
import {PluginDescription} from '@/types';

export type ExtensionPointComponentPosition = 'wrap' | 'before' | 'after'

const plugins: Record<string, InstalledPlugin> = {};
const loadedPluginConfigs: PluginDescription[] = [];

export function preloadAll(config?: ConfigForStaticFile): void {
    if (!config || !config.pluginsEnabled || !Array.isArray(config.plugins)) {
        return;
    }

    config.plugins.forEach(plugin => preloadPlugin(plugin.name));
}

export async function loadAll(config?: ConfigForStaticFile): Promise<void> {
    // if plugins are disabled, act like there are no plugins defined
    if (!config || !config.pluginsEnabled || !Array.isArray(config.plugins)) {
        return;
    }

    const pluginsSetupInfo = await Promise.all(config.plugins.map(async pluginDescription => {
        const plugin = await loadPlugin(pluginDescription.name, pluginDescription.config);

        if (plugin) {
            plugins[pluginDescription.name] = plugin;
            return pluginDescription;
        }

        return undefined;
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

export function getPluginField<T>(name: string, field: string): T {
    const plugin = plugins[name];
    if (!plugin) {
        throw new Error(`Plugin "${name}" is not loaded.`);
    }
    if (!plugin[field]) {
        throw new Error(`"${field}" is not defined on plugin "${name}".`);
    }
    return plugins[name][field] as T;
}

export function getLoadedConfigs(): PluginDescription[] {
    return loadedPluginConfigs;
}
