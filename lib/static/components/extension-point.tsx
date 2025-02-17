import React, {Component, FC, ReactNode} from 'react';
import * as plugins from '../modules/plugins';
import {PLUGIN_COMPONENT_POSITIONS, PluginComponentPosition, PluginDescription} from '@/types';
import ErrorBoundary from './error-boundary';

interface ExtensionPointProps {
    name: string;
    children?: React.ReactNode;
}

interface ExtensionPointComponent {
    PluginComponent: FC;
    name: string;
    point: string;
    position: PluginComponentPosition;
    config: PluginDescription;
}

type ExtensionPointComponentUnchecked =
    Omit<ExtensionPointComponent, 'point' | 'position'>
    & Partial<Pick<ExtensionPointComponent, 'point' | 'position'>>

export default class ExtensionPoint<T extends ExtensionPointProps> extends Component<T> {
    render(): ReactNode {
        const loadedPluginConfigs = plugins.getLoadedConfigs();

        if (loadedPluginConfigs.length) {
            const {name: pointName, children: reportComponent, ...componentProps} = this.props;
            const pluginComponents = getExtensionPointComponents(loadedPluginConfigs, pointName);
            return getComponentsComposition(pluginComponents, reportComponent, componentProps);
        }

        return this.props.children;
    }
}

function getComponentsComposition(pluginComponents: ExtensionPointComponent[], reportComponent: ReactNode, componentProps: any): ReactNode {
    let currentComponent = reportComponent;

    for (const {PluginComponent, position, config} of pluginComponents) {
        currentComponent = composeComponents(PluginComponent, componentProps, currentComponent, position, config);
    }

    return currentComponent;
}

function composeComponents(PluginComponent: FC, pluginProps: any, currentComponent: ReactNode, position: PluginComponentPosition, config: PluginDescription): ReactNode {
    switch (position) {
        case 'wrap':
            return <ErrorBoundary fallback={currentComponent}>
                <PluginComponent {...pluginProps}>
                    {currentComponent}
                </PluginComponent>
            </ErrorBoundary>;
        case 'before':
            return <>
                <ErrorBoundary>
                    <PluginComponent {...pluginProps}/>
                </ErrorBoundary>
                {currentComponent}
            </>;
        case 'after':
            return <>
                {currentComponent}
                <ErrorBoundary>
                    <PluginComponent {...pluginProps}/>
                </ErrorBoundary>
            </>;
        default:
            console.error(`${getComponentSpec(config)} unexpected position "${position}" specified.`);
            return currentComponent;
    }
}

function getExtensionPointComponents(loadedPluginConfigs: PluginDescription[], pointName: string): ExtensionPointComponent[] {
    return loadedPluginConfigs
        .map<ExtensionPointComponentUnchecked>(pluginDescription => {
            try {
                const PluginComponent = plugins.getPluginField<FC>(pluginDescription.name, pluginDescription.component);

                return {
                    PluginComponent,
                    name: pluginDescription.name,
                    point: getComponentPoint(PluginComponent, pluginDescription),
                    position: getComponentPosition(PluginComponent, pluginDescription),
                    config: pluginDescription
                };
            } catch (err) {
                console.error(err);
                return {} as ExtensionPointComponentUnchecked;
            }
        })
        .filter((component: ExtensionPointComponentUnchecked): component is ExtensionPointComponent => {
            return Boolean(component.point && component.position && component.point === pointName);
        });
}

function getComponentPoint(component: FC, config: PluginDescription): string | undefined {
    const result = getComponentConfigField(component, config, 'point');

    if (typeof result !== 'string') {
        return;
    }

    return result as string;
}

function getComponentPosition(component: FC, config: PluginDescription): PluginComponentPosition | undefined {
    const result = getComponentConfigField(component, config, 'position');

    if (typeof result !== 'string') {
        return;
    }

    if (!PLUGIN_COMPONENT_POSITIONS.includes(result as PluginComponentPosition)) {
        return;
    }

    return result as PluginComponentPosition;
}

function getComponentConfigField(component: any, config: any, field: string): unknown | null {
    if (component[field] && config[field] && component[field] !== config[field]) {
        console.error(`${getComponentSpec(config)} "${field}" field does not match the one from the config: "${component[field]}" vs "${config[field]}".`);
        return null;
    } else if (!component[field] && !config[field]) {
        console.error(`${getComponentSpec(config)} "${field}" field is not set.`);
        return null;
    }

    return component[field] || config[field];
}

function getComponentSpec(pluginDescription: PluginDescription): string {
    return `Component "${pluginDescription.component}" of "${pluginDescription.name}" plugin`;
}
