# html-reporter

Plugin for [hermione](https://github.com/gemini-testing/hermione) which is intended to aggregate the results of tests running into html report.

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
```
   const err = new Error('some error');
   err.details = {title: 'description, will be used as url title', data: {} | [] | 'some additional info'};
   throw err;
```
* **defaultView** (optional) `String` - default view mode. Available values are:
  * `all` - show all tests. Default value.
  * `failed` - show only failed tests.
* **baseHost** (optional) - `String` - it changes original host for view in the browser; by default original host does not change
* **scaleImages** (optional) – `Boolean` – fit images into page width; `false` by default
* **lazyLoadOffset** (optional) - `Number` - allows you to specify how far above and below the viewport you want to begin loading images. Lazy loading would be disabled if you specify 0. `800` by default.
* **errorPatterns** (optional) - `Array` - error message patterns are used:
  * to show more understandable information about matched error;
  * in 'Group by error' mode.

  Array elements must be one of the types:
  * `Object` with required fields *name*, *pattern* and optional field *hint* - {*name*: `String`, *pattern*: `String`, *hint*: `String`};
  * `String` which will be interpret as *name* and *pattern*.

  When one of error patterns are matched on error message then:
  * *name* of error pattern will be displayed as title of error message and original error message will be hidden under details;
  * *hint* of error pattern will be displayed after error *stack* field. Can be specified as html string. For example, `<div>some-useful-hint</div>`.

  In 'Group by error' mode test will be associated with group if test error matches on group error pattern. New group will be created if test cannot be associated with existing groups.
* **metaInfoBaseUrls** (optional) `Object` - base paths for making link from Meta-info values. Object option must be Meta-info's key and value must be `String`. For example, {'file': 'base/path'}.
* **saveFormat** (optional) `String` - allows to specify the format, in which the results will be saved. Available values are:
  * `js` - save tests results to data.js file as object. Default value.
  * `sqlite` - save tests results to Sqlite database.
  Files will be created:
    * `sqlite.db` - Sqlite database with tests results
    * `data.js` - report's config
    * `databaseUrls.json` - absolute or relative URLs to Sqlite databases (`sqlite.db`) or/and URLs to other `databaseUrls.json` (see [merge-reports](#merge-reports))

     You can't open local report by 'file://' protocol. Use gui mode or start a local server. For example, execute `npx http-server -p 8080` at terminal from folder where report placed and open page `http://localhost:8080` at browser.
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

    #### Example how to add radiobuttons for base url switching in gui-mode:
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

## Additional commands

Additional commands that are added to the tool for which this plugin is connected.

### gui

Command that adds ability to effective work with screenshots.

Example of usage:
```
npx hermione gui
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
```
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

## Api

Html-reporter adds to your tool object with api:

### addExtraItem

Adds item to html report as link:

```js
@param {String} text of link
@param {String} url of link

tool.htmlReporter.addExtraItem('some-text', 'some-url')
```

In this case url with link 'some-url' and text 'some-text' will be added to the menu bar.

### addMetaInfoExtender

Extend meta-info of each test using passed data:

```js
tool.htmlReporter.addMetaInfoExtender(name, value);
```

* **name** (required) `String` - name of meta info
* **value** (required) `Function` - handler to which `suite` and `extraItems` are passed

Example:
```js
tool.htmlReporter.addMetaInfoExtender('foo', (suite, extraItems) => {
    return suite.suitePath.join(' ') + extraItems.platform;
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
