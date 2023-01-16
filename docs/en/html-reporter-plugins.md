# Plugins

## Overview

Use the `plugins` option in the `html-reporter` plugin config to extend the functionality of the report using your own plugins to the report.

To make your plugins work in the report, enable the [pluginsEnabled][plugins-enabled] option in the `html-reporter` plugin config by setting its value to `true`.

The list of plugins is set as an array with their descriptions. By default, the list is considered empty: `[]`.

Plugins allow you to add your own UI components to the report (both for a static report and for GUI mode), as well as server "handles" _(routes)_ (for GUI mode).

## Setup

The description of plugins looks like this:

```javascript
plugins: [
    {
        name: 'plugin-name',
        component: 'PluginReactComponentName',
        point: 'extension-point-name',
        position: 'wrap',
        config: { param: 'value' }
    },
    {
        name: 'plugin-name',
        component: 'AnotherPluginReactComponentName',
        point: 'extension-point-name',
        position: 'before'
    },

    // ...
]
```

### Description of configuration parameters

| **Parameter** | **Type** | **Description** |
| ------------- | -------- | --------------- |
| [name](#name) | String | Required parameter. The name of the package with the plugin for the report. It is assumed that the plugin can be connected using _require(name)_. |
| [component](#component) | String | The name of the React component from the plugin. |
| [point](#point) | String | The name of the extension point in the html-reporter plugin. |
| [position](#position) | String | Defines the method by which the component will be placed at the extension point. |
| [config](#config) | Object | Plugin configuration. |

A plugin for which only the `name` parameter is set can be used to override an existing GUI server middleware.

A plugin can define more than one component. Each component can be applied to multiple extension points and/or multiple times to the same point (with separate configuration entries). The order in which components are applied is determined by the configuration order.

### name

Required parameter. The name of the package with the plugin for the report. It is assumed that the plugin can be connected using _require(name)_.

### component

The name of the React component from the plugin.

### point

The name of the extension point in the _html-reporter_ plugin.

Defines the specific location of the specified component inside the html-reporter user interface.

For more information, see the section "Extension points".

### position

Defines the method by which the component will be placed at the extension point of the html-report user interface.

The following values are available:

| **Value** | **Description** |
| --------- | --------------- |
| wrap      | wrap the extension point in the UI |
| before    | place the component before the extension point |
| after     | place the component after the extension point |

### config

Plugin configuration.

## Plugin code for the report

Examples of plugins can be [viewed in functional tests][html-reporter-plugins].

The `html-reporter` plugin is an object with some set of React components specified as its keys, and an optional `reducers` key with an array of redux-reducers to control the state of components, which are later combined using [reduce-reducers][reduce-reducers].

The plugin for the report is expected to have the following module files in the root of its package: `plugin.js` and/or `middleware.js`.

### plugin.js

Optional module. A file that should export an object (or a set of named exports) or a function that returns such an object or array with some specific structure.

You can reuse the `html-reporter` dependencies in plugins (React, Redux, etc.). To do this, an array with a list of necessary dependencies must be exported from the module, followed by a function with the corresponding dependencies passed to it, and returning the plugin itself.

For example:

```javascript
import 'plugin-styles.css';

export default ['react', function(React, options) {
    class PluginComponent extends React.Component {
        // component implementation
    }

    return {
        PluginComponent,
        reducers: []
    };
}];
```

Styles for the plugin must be loaded together with `plugin.js`, and the resulting file should be one bundle.

Value exported from `plugin.js`, should be passed to `__hermione_html_reporter_register_plugin__`.

There are two ways to do this.

For example, configure the build by _webpack_ so that it creates the corresponding `jsonp` library:

```javascript
// ...
output: {
    filename: 'plugin.js',
    path: __dirname,
    library: '__hermione_html_reporter_register_plugin__',
    libraryTarget: 'jsonp'
},
// ...
```

Or pass the value exported from `plugin.js`, clearly:

```javascript
__hermione_html_reporter_register_plugin__(['react', function(React, options) {
    // ...
    return { PluginComponent };
}]);
```

### middleware.js

Optional module. Exports a function that accepts `Router` from [express][express]. It is expected that the "routes" of the plugin will be connected to the router. And the router then connects to the "route" `/plugin-routes/:PluginName/`.

```javascript
module.exports = function(pluginRouter) {
    pluginRouter.get('/plugin-route', function(req, res) {
        // "route" implementation
    });
};
```

Then the "routes" can be called from the React components of the plugin defined in `plugin.js`. For convenience, the plugin name is always passed with options called `pluginName` when a function or an array of functions is used for export:

```javascript
export default ['react', 'axios', function(React, axios, { pluginName, pluginConfig, actions, actionNames, selectors }) {
    class PluginComponent extends React.Component {
        // ... somewhere inside the component ...
        const result = await axios.get(`/plugin-routes/${pluginName}/plugin-route`);
    }

    return {
        PluginComponent,
        reducers: []
    };
}
```

In this example, you can also see the following properties:

| **Property** | **Description** |
| ------------ | ------------ |
| pluginName   | plugin name |
| pluginConfig | plugin configuration |
| actions      | Redux-actions |
| actionNames  | action names in _html-reporter_ that are used in Redux-actions, allow to subscribe to report events |
| selectors    | cached report selectors that were created using the [reselect][redux-reselect] library |

### Available dependencies

The following dependencies are available in plugins:

- [react][react]
- [redux][redux]
- [react-redux][react-redux]
- [lodash][lodash]
- [prop-types][prop-types]
- [classnames][classnames]
- [semantic-ui-react][semantic-ui-react]
- [react-markdown][react-markdown]
- [reduce-reducers][reduce-reducers]
- [immer][immer]
- [reselect][redux-reselect]
- [axios][axios]

### Available components

#### `<Details />`

A component with which you can switch the display of content.

Usage example:

```javascript
// ...inside your React component

render() {
    return <Details
        title='Some title'
        content='Some content' // content that will appear by clicking on the title
        extendClassNames='some_class_name' // you can add your own css classes to the component
        onClick={() => console.log('clicked')} // as well as your handler
    />
}
```

where:

| **Property** | **Type** | **Description** |
| ------------ | -------- | --------------- |
| title | String or JSX.Element | Required parameter. A header describing the information hidden under it. |
| content | Function or String or String[] or JSX.Element | Required parameter. The content that will appear when you click on the title. |
| extendClassNames | String or String[] | CSS classes to add to the component. Optional parameter. |
| onClick | Function | The handler that will be called by clicking on the header. Optional parameter. |

## Extension points

Extension points are places in the user interface of the report that are available for extension using React components exported by _plugins for the report_.

Each extension point can pass certain props to plugin components depending on the point itself. Since some plugins may rely on a specific placement and, therefore, on specific props, it is possible to restrict plugin components to certain extension points by specifying a static `point` property for such plugin components:

```javascript
class PluginComponent extends React.Component {
    static point = 'result';
    // ...
}
```

The following extension points are currently available:

| **Point** | **Description** |
| --------- | --------------- |
| result    | Allows you to extend each test result. Adds the _resultId_ and _testName_ props to the plugin component. |
| result_meta | Allows you to extend the meta information for each test result. Adds the _resultId_ and _testName_ props to the plugin component. |
| menu-bar | Allows you to extend the menu. |
| root | Allows you to add floating elements such as a modal window or a popup. |

An extension point can be extended by more than one component. In this case, the order in which components are applied is determined by the order in which plugins are configured. Each subsequent component is applied to all previously composed components at the extension point.

[plugins-enabled]: ./html-reporter-setup.md#pluginsenabled
[html-reporter-plugins]: https://github.com/gemini-testing/html-reporter/blob//master/./test/func/html-reporter-plugins
[reduce-reducers]: https://github.com/redux-utilities/reduce-reducers
[express]: https://github.com/expressjs/express
[redux-reselect]: https://github.com/reduxjs/reselect
[react]: https://github.com/facebook/react
[redux]: https://github.com/reduxjs/redux
[react-redux]: https://github.com/reduxjs/react-redux
[lodash]: https://github.com/lodash/lodash
[prop-types]: https://github.com/facebook/prop-types
[classnames]: https://github.com/JedWatson/classnames
[semantic-ui-react]: https://github.com/Semantic-Org/Semantic-UI-React
[react-markdown]: https://github.com/remarkjs/react-markdown
[immer]: https://github.com/immerjs/immer
[axios]: https://github.com/axios/axios
