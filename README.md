# html-reporter

Requires **[hermione](https://github.com/gemini-testing/hermione)@4x**.

Plugin for [hermione](https://github.com/gemini-testing/hermione) which is intended to aggregate the results of tests running into html report.

Test result is saved to the [SQLite](https://www.sqlite.org/index.html) database. It means that you can't open local report by 'file://' protocol.
Use gui mode - `npx hermione gui` or start a local server - `npx http-server -p 8080` at terminal from folder where report placed and open page `http://localhost:8080` at browser.

You can read more about hermione plugins [here](https://github.com/gemini-testing/hermione#plugins).

## Installation

```bash
npm install html-reporter
```

**:warning: Requires Hermione >=2.7.0**

## Usage

Plugin has following configuration:

* **enabled** (optional) `Boolean` – enable/disable the plugin; by default plugin is enabled
* **path** (optional) `String` - path to directory for saving html report file; by
default html report will be saved into `hermione-report/index.html` inside current work
directory.
* **saveErrorDetails** (optional) `Boolean` – save/don't save error details to json-files (to error-details folder); `false` by default.

  Any plugin of hermione can add error details when throwing an error. Details can help a user to debug a problem in a test. Html-reporter saves these details to a file with name `<hash of suite path>-<browser>_<retry number>_<timestamp>.json` in the error-details folder. Below a stacktrace html-reporter adds the section `Error details` with the link `title` pointing to the json-file. A user can open it in a browser or any IDE.

  How to add error details when throwing an error from a plugin:
  ```js
   const err = new Error('some error');
   err.details = {title: 'description, will be used as url title', data: {} | [] | 'some additional info'};
   throw err;
  ```

* **defaultView** (optional) `String` - default view mode. Available values are:

  * `all` - show all tests. Default value.
  * `failed` - show only failed tests.

* **diffMode** (optional) - `String` - default diff mode. Available values are:

  * `3-up` - show all images (expected, actual, diff) in column. Default value;
  * `3-up-scaled` - show all images in row (fit into page width);
  * `only-diff` - show only diff image;
  * `switch` - mode with ability to switch between expected and actual images (use click on mouse in images field to switch);
  * `swipe` - mode with ability to move divider between expected and actual images;
  * `onion-skin` - mode with ability to change the transparency of actual image.

* **baseHost** (optional) - `String` - it changes original host for view in the browser; by default original host does not change
* **errorPatterns** (optional) - `Array` - error message patterns are used:

  * to show more understandable information about matched error;
  * in 'Group by' mode with selected 'error' key.

  Array elements must be one of the types:

  * `Object` with required fields *name*, *pattern* and optional field *hint* - {*name*: `String`, *pattern*: `String`, *hint*: `String`};
  * `String` which will be interpret as *name* and *pattern*.

  When one of error patterns are matched on error message then:

  * *name* of error pattern will be displayed as title of error message and original error message will be hidden under details;
  * *hint* of error pattern will be displayed after error *stack* field. Can be specified as html string. For example, `<div>some-useful-hint</div>`.

  In 'Group by' mode with selected 'error' key test will be associated with group if test error matches on group error pattern. New group will be created if test cannot be associated with existing groups.

* **metaInfoBaseUrls** (optional) `Object` - base paths for making link from Meta-info values. Object option must be Meta-info's key and value must be `String`. For example, {'file': 'base/path'}.
* **saveFormat** (**DEPRECATED**, optional) `String` - allows to specify the format, in which the results will be saved. Available values are:
  * `sqlite` - save tests results to Sqlite database. Default value.
* **customGui** (optional) `Object` – allows to specify custom controls for gui-mode and define actions for them. `{}` is default value. Ordinarily custom controls should be split by sections depending on the purposes of the controls. At least one section should be specified.
  The structure of the custom-gui object:
  ```js
  customGui: {
    'choose-any-name-for-the-section-1': [{an object describing a group of controls}, ...],
    'choose-any-name-for-the-section-2': [{an object describing a group of controls}, ...]
  }
  ```
  The keys of customGui-object are any strings describing sections of controls. It is upon a user to choose appropriate names for the sections.
  A value of a key should be an array that holds a set of objects describing groups of controls.

  #### customGui-group-object

  An object that describes one group of controls has the following structure:
  ```js
  {
      type: 'specify-type-of-the-controls',
      controls: [
          {
              label: 'specify-label-for-the-control',
              value: 'specify-value-of-the-control'
          },
          {
              ...
          }
      ],
      initialize: async ({hermione, ctx}) => {
          // here goes your code
          // returned value will be ignored
      },
      action: async ({hermione, ctx, control}) => {
          // here goes your code
          // returned value will be ignored
      }
  }
  ```

  * **type** (required) `String` – defines the type of controls. Available values are: `button` and `radiobutton`.

  * **controls** (required) `Array` – array of objects that describe controls. Each object should have string fields `label` and `value`. `Label` defines the caption of the control, and `value` – its value.

  * **initialize** (optional) – an async function to be executed at server-side at gui-mode start. Input parameter of this function is an object `{hermione, ctx}`, where `hermione` is an instance of hermione and `ctx` is the reference to the whole [object](#customGui-group-object) the initialize-function is being run for. A value that initialize-function returns will be ignored.

  * **action** (required) – an async function to be executed at server-side when a user clicks a control. Input parameter of this function is an object `{hermione, ctx, control}`, where `hermione` is an instance of hermione, `ctx` is the reference to the whole [object](#customGui-group-object) the action-function is being run for, and `control` points to the control the user clicked. A value that action-function returns will be ignored.

  #### Example: how to add radiobuttons for base url switching in gui-mode
  ```js
  customGui: {
      'some-meaningful-name-of-section': [
          {
              type: 'radiobutton',
              controls: [
                  {
                      label: 'Dev',
                      value: 'http://localhost/development/'
                  },
                  {
                      label: 'Prod',
                      value: 'http://localhost/production/'
                  }
              ],
              initialize: async ({hermione, ctx}) => {
                  const {config} = hermione;
                  const browserIds = config.getBrowserIds();

                  if (browserIds.length) {
                      const {baseUrl} = config.forBrowser(browserIds[0]);

                      ctx.controls.forEach((control) => {
                          control.active = (baseUrl === control.value);
                      });
                  }
              },
              action: async ({hermione, ctx, control}) => {
                  const {config} = hermione;

                  config
                      .getBrowserIds()
                      .forEach((browserId) => {
                          config.forBrowser(browserId).baseUrl = control.value;
                      });
              }
          }
      ]
  }
  ```

* **pluginsEnabled** (optional) `Boolean` - enable html-reporter plugins; `false` by default
* **plugins** (optional) `Array` of html-reporter plugin descriptions; `[]` by default. Allows to extend report with custom UI components (both static and gui-mode) and custom server routes (gui-mode only).

  The structure of the plugin descriptions config:
  ```js
  plugins: [
      {
          name: 'plugin-name',
          component: 'PluginReactComponentName',
          point: 'extension-point-name',
          position: 'wrap',
          config: { param: 'value'}
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

  , where:

  * **name** (required) `String` - a name of an html-reporter plugin _package_. It expected to be `require`-resolvable from your project.
  * **component** (optional) `String` - React component name from the plugin.
  * **point** (optional) `String` - html-reporter's extension point name. Sets specific place within the html-reporter UI where to place the specified component. [More on extension points](#extension-points).
  * **position** (optional) `String` - specifies the way the component is going to be applied to the html-reporter UI extension point. Possible values are:
      * `wrap` - to wrap the extension point UI
      * `before` - to place the component before the extension point
      * `after` - to place the component after the extension point
  * **config** (optional) `Object` - plugin configuration

  A plugin with only **name** specified may be used to redefine existing gui-server middleware.

  A plugin may define more than one component. Each component may be applied to several extension points and/or several times to the same point (with separate config entries). The order of the components application is determined by the config order.

  #### html-reporter plugins

  _[Example plugins](https://github.com/gemini-testing/html-reporter/blob//master/./test/func/html-reporter-plugins) are available in functional tests._

  An html-reporter plugin is an object with some set of React components on its keys and an optional key `reducers` with an array of redux reducers to manage the components state (which are later combined by [`reduce-reducers`](https://github.com/redux-utilities/reduce-reducers)).

  An html-reporter plugin expected to have the following module files in the root of the package: `plugin.js` and/or `middleware.js`.

  ##### plugin.js

  Optional module. The file expected to export an object (or set of named exports) or a function returning such an object or an array with some specific structure.

  It is possible to reuse dependencies of html-reporter within plugins (React, Redux, etc). To do so an array should be exported from the module with the list of needed deps followed by a function with the corresponding deps passed to it and returning the plugin itself:

  ```js
  import 'plugin-styles.css';

  export default ['react', function(React, options) {
      class PluginComponent extends React.Component {
          // Component implementation
      }

      return {
          PluginComponent,
          reducers: []
      };
  }];
  ```

  Plugin styles are expected to be loaded with the `plugin.js` and the file is expected to be a single bundle.

  Exported value of the `plugin.js` should be passed to the `__hermione_html_reporter_register_plugin__`. This could be achieved by either configuring your webpack build to produce corresponding `jsonp` library:

  ```js
  // ...
  output: {
      filename: 'plugin.js',
      path: __dirname,
      library: '__hermione_html_reporter_register_plugin__',
      libraryTarget: 'jsonp'
  },
  // ...
  ```

  or, by passing it explicitly:

  ```js
  __hermione_html_reporter_register_plugin__(['react', function(React, options) {
      /* ... */
      return {PluginComponent};
  }]);
  ```

  ##### middleware.js

  Optional module. Exports a function accepting an **express** `Router`. The plugin routes are expected to be attached to the router. The router are then attached on the `/plugin-routes/:pluginName/` path:

  ```js
  module.exports = function(pluginRouter) {
      pluginRouter.get('/plugin-route', function(req, res) {
          // route implementation
      });
  };
  ```

  The routes then can be called from the plugin React components defined in the `plugin.js`. For convenience the plugin name is always passed with options when function- or array-returning form is used to export plugin as the function options property `pluginName`:

  ```js
  export default ['react', 'axios', function(React, axios, {pluginName, pluginConfig, actions, actionNames, selectors}) {
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

  In the example you can also see another convenient properties:
  - `pluginName` - plugin name;
  - `pluginConfig` - plugin configuration;
  - `actions` - the html-reporter **Redux** actions;
  - `actionNames` - the html-reporter action names, that used in **Redux** actions. To be able to subscribe on html-reporter events;
  - `selectors` - the memoized html-reporter selectors which created using **reselect** library.


  Available dependencies:
  - `react`
  - `redux`
  - `react-redux`
  - `lodash`
  - `prop-types`
  - `classnames`
  - `semantic-ui-react`
  - `react-markdown`
  - `reduce-reducers`
  - `immer`
  - `reselect`
  - `axios`

  Available components:
  - `components`
    - `<Details />` - component which allows users to toggle the display of content.
        Example of usage:
        ```js
        // ... inside your react component
        render() {
            return <Details
                title='Some title'
                content='Some content' // content that will appear when you click on the title
                extendClassNames='some_class_name' // ability to add own css-classes to component
                onClick={() => console.log('clicked')} // ability to add handler
            />
        }
        ```

        , where:

        * **title** (required) `String|JSX.Element` - title that describes information hidden underneath.
        * **content** (required) `Function|String|Array<String>|JSX.Element` - content that will appear after click on the title.
        * **extendClassNames** (optional) `String|Array<String>` - ability to add own css classes to the component.
        * **onClick** (optional) `Function` - handler that will be called when the title is clicked.

  #### Extension points

  Extension points - places within the report UI that are available to extend with React components with the help of [html-reporter plugins](#html-reporter-plugins).

  Each extension point may pass specific props to the plugin components depending on the point. As some plugins may rely on specific placement and hence on such specific props, it is possible to restrict plugin components to specific extension points by specifing static property `point` on such plugin components:

  ```js
  class PluginComponent extends React.Component {
      static point = 'result';
      // ...
  }
  ```

  Currently, there are extension points:
  * `result` - allows to extend each test result; adds `resultId` and `testName` props to the plugin component;
  * `result_meta` - allows to extend meta information of each test result; adds `result` and `testName` props to the plugin component;
  * `menu-bar` - allows to extend menu bar.
  * `root` - allows to add floating items like modal or popup.

  An extension point may be extended by more than one component. In that case order of components application is determined by `plugins` config order. Each following component is applied to all previously composed components at the extension point.

* **customScripts** (optional) `function[]` - allows to add any scripts on the report html-page. Script will be executed immediately on page render. It can be helpful for adding some metrics or own extra functionality.

  ```js
  customScripts: [
    function() {console.log('something')},
    () => {
      const div = document.createElement('div');
      div.innerHTML = 'hello';
      document.body.prepend(div);
    }
  ]
  ```

* **yandexMetrika** (optional) `Object` - allows to add [yandex metrika](https://yandex.ru/support/metrica/index.html) to your report. The metrika can help you to get how developers interact with your report and what kind of problems they encounter at that. To start using it, you should create a counter first: see [how to create a counter](https://yandex.ru/support/metrica/general/creating-counter.html). And then in the Yandex.Metrica interface, go to the Settings section (on the Code snippet tab), click Copy and add the copied code to the **customScripts**-field.

  Nested fields:

  * **counterNumber** (optional) `Number` - uniq counter in yandex metrika, used in order to send goals achievement.

  Supported goals (js events), [more info about goals](https://yandex.ru/support/metrica/general/goals.html):

  * **ACCEPT_SCREENSHOT** - click on "Accept" button;
  * **ACCEPT_OPENED_SCREENSHOTS** - click on "Accept opened" button.

Also there is ability to override plugin parameters by CLI options or environment variables
(see [configparser](https://github.com/gemini-testing/configparser)).
Use `html_reporter_` prefix for the environment variables and `--html-reporter-` for the cli options.

For example you can override `path` option like so:
```bash
$ html_reporter_path=custom/dir hermione path/to/mytest.js
$ hermione path/to/mytest.js --html-reporter-path custom/dir
```

Add plugin to your `hermione` config file:

```js
module.exports = {
    // ...
    plugins: {
        'html-reporter/hermione': {
            enabled: true,
            path: 'my/hermione-reports',
            defaultView: 'all',
            baseHost: 'test.com',
            errorPatterns: [
                'Parameter .* must be a string',
                {
                    name: 'Cannot read property of undefined',
                    pattern: 'Cannot read property .* of undefined',
                    hint: '<div>google it, i dont know how to fix it =(</div>'
                }
            ]
        }
    },
    //...
}
```

## Data storage format

How was described at the beginning (see [html-reporter](#html-reporter)) test result is saved to the [SQLite](https://www.sqlite.org/index.html) database.

Why we use SQLite:

* serverless, simple to set up and zero configuration is required;
* cross-platform, runs on any operating system;
* single-file, easy to reuse and share report;
* faster than direct filesystem I/O;
* compact and has full-featured SQL implementation.

Files that will be created during test execution:

* `sqlite.db` - Sqlite database with tests results
* `data.js` - report's config
* `databaseUrls.json` - absolute or relative URLs to Sqlite databases (`sqlite.db`) or/and URLs to other `databaseUrls.json` (see [merge-reports](#merge-reports))

## Additional commands

Additional commands that are added to the hermione.

### gui

Command that adds ability to effective work with screenshots.

Example of usage:
```
npx hermione gui
```

### remove-unused-screens

Command that adds ability to remove all unused reference images. On first step it looks for screenshots for which there are no tests on the file system. On the second step it looks for screenshots that were not used in a successful test (the result of the tests is taken from the sqlite database). For the correct execution of the second step html-report should exist on the file system and contain the result of the tests. It means you should run tests locally or download report from CI.

```
npx hermione remove-unused-screens --help
```

shows the following:
```
  Usage: remove-unused-screens [options]

  remove screenshots which were not used when running tests

  Options:

    -p, --pattern <pattern>  pattern for searching screenshots on the file system
    --skip-questions         do not ask questions during execution (default values will be used)
    -h, --help               output usage information

  Example of usage:
    Specify the folder in which all reference screenshots are located:
    npx hermione remove-unused-screens -p hermione-screens-folder

    Specify the mask by which all reference screenshots will be found:
    npx hermione remove-unused-screens -p 'screens/**/*.png'

    Specify few masks by which all reference screenshots will be found:
    npx hermione remove-unused-screens -p 'screens/**/chrome/*.png' -p 'screens/**/firefox/*.png'

    Don't ask me about anything and just delete unused reference screenshots:
    npx hermione remove-unused-screens -p 'hermione-screens-folder' --skip-questions
```

### merge-reports

Command that adds ability to merge reports which are created after running the tests.

#### When save format is js (default)

Command takes paths to directories with reports.
It merge "data.js" files into single file and move reports files to destination directory.

Example of usage:
```
npx hermione merge-reports src-report-1 src-report-2 -d dest-report
```

#### When save format is sqlite

Command takes paths to databases files or "databaseUrls.json" files from other html reports.
It creates new html report at destination directory with common "databaseUrls.json"
which will contain link to databases files or "databaseUrls.json" files from input parameters.
Databases files will not be copied to destination directory.

Example of usage:
```bash
npx hermione merge-reports path-to-database.db path-to-databaseUrls.json -d dest-report --html-reporter-save-format sqlite
```

## Testing

Run [mocha](http://mochajs.org) tests:
```bash
npm run test-unit
```

Run [eslint](http://eslint.org) codestyle verification
```bash
npm run lint
```

Run [hermione](https://github.com/gemini-testing/hermione) (integration) tests:
```bash
npm run test-func
```

Integration tests run on Chromium in headless mode.

## API

Html-reporter adds to `hermione` object with its own API.

**Properties of the `hermione.htmlReporter` object**

Property name              | Description
-------------------------- | -------------
`events`                   | Events list for subscription.
`extraItems`               | Items list which will be added to the menu bar.
`metaInfoExtenders`        | Items list which will be added to the meta info.
`imagesSaver`              | Interface to save image into user storage.
`reportsSaver`             | Interface to save sqlite database into user storage.
`downloadDatabases`        | Method to download all databases from `databaseUrls.json` file.
`mergeDatabases`           | Method to merge passed databases to passed report path.
`getTestsTreeFromDatabase` | Method to get tests tree from passed database.

**Available events which are triggered in the main process**

Event                     | Description
------------------------- | -------------
`DATABASE_CREATED`        | Will be triggered after sqlite database is created. The handler accepts a database instance. The event is synchronous.
`TEST_SCREENSHOTS_SAVED`  | Will be triggered after test screenshots were saved. The handler accepts test id and screenshots info. The event is asynchronous, so your handler can return a promise.
`REPORT_SAVED`            | Will be triggered after all test files were saved. The event is asynchronous, so your handler can return a promise.

### events

Example of a subscription to an event `DATABASE_CREATED` from another hermione-plugin in the main process:

```js
module.exports = (hermione, opts) => {
    if (!opts.enabled || hermione.isWorker()) {
        return;
    }

    // `htmlreporter` field is guaranteed to be in the `hermione` object when `INIT` event is emitted
    hermione.on(hermione.events.INIT, () => {
        hermione.htmlReporter.on(hermione.htmlReporter.events.DATABASE_CREATED, (db) => {
            db.prepare(`CREATE TABLE IF NOT EXISTS test1 (foo TEXT, bar TEXT)`).run();
        });
    });
};
```

Example of a subscription to an event `TEST_SCREENSHOTS_SAVED`:

```js
hermione.htmlReporter.on(hermione.htmlReporter.events.TEST_SCREENSHOTS_SAVED, async ({testId, attempt, imagesInfo}) => {
    console.log(`Screenshots for test "${testId}" (attempt #${attempt}) were saved:`, imagesInfo);
    /* Expected output:
    Screenshots for test "Feature Test.chrome-desktop" (attempt #0) were saved:
    [
        {
            stateName: 'plain',
            refImg: { path: '...', size: { width: 400, height: 200 } },
            status: 'fail',
            error: undefined,
            diffClusters: [...],
            expectedImg: { path: '...', size: { width: 400, height: 200 } }
            actualImg: { path: '...', size: { width: 400, height: 200 } }
            diffImg: { path: '...', size: { width: 400, height: 200 } }
        }
    ]
    */
});
```

Example of a subscription to an event `REPORT_SAVED`:
```js
hermione.htmlReporter.on(hermione.htmlReporter.events.REPORT_SAVED, async ({reportPath}) => {
    await uploadDirToS3(reportPath);
});
```

### addExtraItem

Adds item to html report as link:

```js
@param {String} text of link
@param {String} url of link

hermione.htmlReporter.addExtraItem('some-text', 'some-url')
```

In this case url with link 'some-url' and text 'some-text' will be added to the menu bar.

### addMetaInfoExtender

Extend meta-info of each test using passed data:

```js
hermione.htmlReporter.addMetaInfoExtender(name, value);
```

* **name** (required) `String` - name of meta info
* **value** (required) `Function` - handler to which `data` (`Object` with `testName` field) and `extraItems` are passed

Example:
```js
hermione.htmlReporter.addMetaInfoExtender('foo', (data, extraItems) => {
    return data.testName + extraItems.platform;
});
```

In this case a line `suite full name: some-platform` will be added to the meta info of each test.

### externalStorage

You can redefine native api for images or sqlite dbs saving and use your own storage.

#### images

Example:
```js
const MyStorage = require('my-storage');
const myStorage = new MyStorage();

module.exports = (hermione, opts) => {
    hermione.on(hermione.events.INIT, async () => {
        hermione.htmlReporter.imagesSaver = {
            /**
            * Save image to your storage. Function can be asynchronous or synchronous. It have to return path or url of saved image.
            * @property {String} localFilePath – image path on your filesystem
            * @param {Object} options
            * @param {String} options.destPath – path to image in html-report
            * @param {String} options.reportDir - path to your html-report dir
            * @returns {String} path or url
            */
            saveImg: async (localFilePath, options) => {
                const {destPath, reportDir} = options;
                const imageUrl = await myStorage.save(localFilePath, destPath, reportDir)
                // ...

                return imageUrl;
            }
        }
    });
};
```

#### sqlite dbs

Example:
```js
const MyStorage = require('my-storage');
const myStorage = new MyStorage();

module.exports = (hermione, opts) => {
    hermione.on(hermione.events.INIT, async () => {
        hermione.htmlReporter.reportsSaver = {
            /**
            * Save sqlite db to your storage. Function can be asynchronous or synchronous. It have to return path or url of saved sqlite db.
            * @property {String} localFilePath – sqlite db path on your filesystem
            * @param {Object} options
            * @param {String} options.destPath – path to sqlite db in html-report
            * @param {String} options.reportDir - path to your html-report dir
            * @returns {String} path or url
            */
            saveReportData: async (localFilePath, options) => {
                const {destPath, reportDir} = options;
                const dbUrl = await myStorage.save(localFilePath, destPath, reportDir)
                // ...

                return dbUrl;
            }
        }
    });
};
```
