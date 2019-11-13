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
* **errorPatterns** (optional) - `Array` - error message patterns for 'Group by error' mode.
Array element must be `Object` ({'*name*': `String`, '*pattern*': `String`}) or `String` (interpret as *name* and *pattern*).
Test will be associated with group if test error matches on group error pattern.
New group will be created if test cannot be associated with existing groups.
* **metaInfoBaseUrls** (optional) `Object` - base paths for making link from Meta-info values. Object option must be Meta-info's key and value must be `String`. For example, {'file': 'base/path'}.
* **saveFormat** (optional) `String` - allows to specify the format, in which the results will be saved. Available values are:
  * `js` - save results in JSON format to data.js file. Default value.
  * `sqlite` - save results to Sqlite database and to data.js file. When using this flag you have to **start a local server** in order to view the report.

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
                    pattern: 'Cannot read property .* of undefined'
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

Example of usage:
```
npx hermione merge-reports src-report-1 src-report-2 -d dest-report
```

Example of usage, when merging reports saved to databases:
```
npx hermione merge-reports path-to-database-1 path-to-database-2 -d dest-report --html-reporter-save-format sqlite
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

You can redefine native api for images saving and use your own storage (only for hermione).

Example:
```js
const MyStorage = require('my-storage');
const myStorage = new MyStorage();

module.exports = (hermione, opts) => {
    hermione.on(hermione.events.INIT, async () => {
        hermione.htmlReporter.imagesSaver = {
            /**
            * Save image to your storage. Function can be asynchronous or synchronous. It have to return path of saved image or destPath will be used by default.
            * @property {String} localFilePath – image path on your filesystem
            * @param {Object} options
            * @param {String} options.destPath – path to image in html-report
            * @param {String} options.reportDir - path to your html-report dir
            */
            saveImg: async (localFilePath, options) => {
                const {destPath, reportDir} = options;
                const res = await myStorage.save(localFilePath, destPath, reportDir)
                // ...

                return res;
            }
        }
    });
};
```
