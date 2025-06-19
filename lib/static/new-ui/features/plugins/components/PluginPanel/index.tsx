import React, {ReactNode} from 'react';
import {AsidePanel} from '@/static/new-ui/components/AsidePanel';
import {
    ExtensionPointPluginMetadata
} from '@/static/new-ui/features/plugins/types';
import {usePluginHealth} from '@/static/new-ui/features/plugins/hooks/plugin-health/usePluginHealth';

export function PluginPanel({plugin}: {plugin: ExtensionPointPluginMetadata}): ReactNode {
    const {statusIcon} = usePluginHealth(plugin);

    return <AsidePanel
        title={plugin.PluginComponent.metadata.name ?? plugin.name}
        description={plugin.PluginComponent.metadata.description}
        icon={statusIcon}
    >
        <plugin.PluginComponent />
    </AsidePanel>;
}
