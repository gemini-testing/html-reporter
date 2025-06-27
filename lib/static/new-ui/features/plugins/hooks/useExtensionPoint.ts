import * as plugins from '@/static/modules/plugins';
import {
    ExtensionPointName,
    ExtensionPointPluginMetadata,
    PluginComponentType
} from '@/static/new-ui/features/plugins/types';
import {useMemo} from 'react';
import {PluginDescription} from '@/types';
import {useSelector} from 'react-redux';
import {getIsInitialized} from '@/static/new-ui/store/selectors';

export const useExtensionPoint = (name: ExtensionPointName): ExtensionPointPluginMetadata[] => {
    const isInitialized = useSelector(getIsInitialized) as boolean;

    return useMemo(() => {
        if (!isInitialized) {
            return [];
        }

        const loadedPluginConfigs = plugins.getLoadedConfigs();

        if (!loadedPluginConfigs.length) {
            return [];
        }

        return (loadedPluginConfigs as PluginDescription[])
            .filter((plugin) => {
                return plugin.point === name;
            })
            .map(config => {
                try {
                    const PluginComponent: PluginComponentType = plugins.get(config.name, config.component);

                    // Fill with default options
                    PluginComponent.metadata = {
                        name: config.name,
                        ...PluginComponent.metadata
                    };

                    return {
                        PluginComponent,
                        name: config.name,
                        point: config.point,
                        position: config.position,
                        config: config.config
                    };
                } catch (err) {
                    console.error(err);
                    return false;
                }
            }).filter(Boolean) as unknown as ExtensionPointPluginMetadata[];
    }, [name, isInitialized]);
};
