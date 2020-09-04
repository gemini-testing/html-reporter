import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';
import ErrorBoundary from './error-boundary';
import plugins from '../modules/plugins';

export default class ExtensionPoint extends Component {
    static propTypes = {
        name: PropTypes.string.isRequired
    }

    render() {
        const loadedPluginConfigs = plugins.getLoadedConfigs();

        if (loadedPluginConfigs.length) {
            const {name: pointName, children: reportComponent, ...componentProps} = this.props;
            const pluginComponents = getExtensionPointComponents(loadedPluginConfigs, pointName);
            return getComponentsComposition(pluginComponents, reportComponent, componentProps);
        }

        return this.props.children;
    }
}

function getComponentsComposition(pluginComponents, reportComponent, componentProps) {
    let currentComponent = reportComponent;

    for (const {PluginComponent, position, config} of pluginComponents) {
        currentComponent = composeComponents(PluginComponent, componentProps, currentComponent, position, config);
    }

    return currentComponent;
}

function composeComponents(PluginComponent, pluginProps, currentComponent, position, config) {
    switch (position) {
        case 'wrap':
            return <ErrorBoundary fallback={currentComponent}>
                <PluginComponent {...pluginProps}>
                    {currentComponent}
                </PluginComponent>
            </ErrorBoundary>;
        case 'before':
            return <Fragment>
                <ErrorBoundary>
                    <PluginComponent {...pluginProps}/>
                </ErrorBoundary>
                {currentComponent}
            </Fragment>;
        case 'after':
            return <Fragment>
                {currentComponent}
                <ErrorBoundary>
                    <PluginComponent {...pluginProps}/>
                </ErrorBoundary>
            </Fragment>;
        default:
            console.error(`${getComponentSpec(config)} unexpected position "${position}" specified.`);
            return currentComponent;
    }
}

function getExtensionPointComponents(loadedPluginConfigs, pointName) {
    return loadedPluginConfigs
        .map(config => {
            try {
                const PluginComponent = plugins.get(config.name, config.component);
                return {
                    PluginComponent,
                    name,
                    point: getComponentPoint(PluginComponent, config),
                    position: getComponentPosition(PluginComponent, config),
                    config
                };
            } catch (err) {
                console.error(err);
                return {};
            }
        })
        .filter(({point, position}) => {
            return point && position && point === pointName;
        });
}

function getComponentPoint(component, config) {
    return getComponentConfigField(component, config, 'point');
}

function getComponentPosition(component, config) {
    return getComponentConfigField(component, config, 'position');
}

function getComponentConfigField(component, config, field) {
    if (component[field] && config[field] && component[field] !== config[field]) {
        console.error(`${getComponentSpec(config)} "${field}" field does not match the one from the config: "${Component[field]}" vs "${config[field]}".`);
        return null;
    } else if (!component[field] && !config[field]) {
        console.error(`${getComponentSpec(config)} "${field}" field is not set.`);
        return null;
    }

    return component[field] || config[field];
}

function getComponentSpec(config) {
    return `Component "${config.component}" of "${config.name}" plugin`;
}
