import {PluginDescription} from '@/types';
import React from 'react';

export const enum ExtensionPointName {
    Settings = 'settings',
    Menu = 'menu'
}

export type PluginComponentMetadata = Partial<{
    allowPoints: ExtensionPointName[];
    name: string;
    description: string;
    healthCheckUrl: string,
}>

export type PluginComponentType<IsMetadataRequired = false> = React.ComponentType
    & (IsMetadataRequired extends true
    ? {metadata: PluginComponentMetadata}
    : {metadata?: PluginComponentMetadata})

export type ExtensionPointPluginMetadata = Omit<PluginDescription, 'component'> & {
    PluginComponent: PluginComponentType<true>;
}
