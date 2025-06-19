import styles from './index.module.css';
import React, {FunctionComponent} from 'react';
import {
    ExtensionPointName,
    ExtensionPointPluginMetadata
} from '@/static/new-ui/features/plugins/types';
import {useExtensionPoint} from '@/static/new-ui/features/plugins/hooks/useExtensionPoint';
import {PanelSection} from '@/static/new-ui/components/PanelSection';
import {Divider} from '@gravity-ui/uikit';
import {usePluginHealth} from '@/static/new-ui/features/plugins/hooks/plugin-health/usePluginHealth';

const PluginPlacementItem: FunctionComponent<{plugin: ExtensionPointPluginMetadata}> = ({plugin}) => {
    const metadata = plugin.PluginComponent?.metadata;

    const {statusIcon} = usePluginHealth(plugin);

    return <PanelSection title={metadata.name ?? 'Plugin'} description={metadata?.description} icon={statusIcon} >
        <plugin.PluginComponent />
    </PanelSection>;
};

export const ExtensionPoint: FunctionComponent<{name: ExtensionPointName, withFirstDivider?: boolean}> = ({name, withFirstDivider = true}) => {
    const plugins = useExtensionPoint(name);

    return <>
        {plugins.map((plugin, i) => {
            return (
                <React.Fragment key={plugin.name}>
                    {(i !== 0 || withFirstDivider) && <Divider orientation={'horizontal'} className={styles.divider}/>}
                    <PluginPlacementItem plugin={plugin} />
                </React.Fragment>
            );
        })}
    </>;
};
