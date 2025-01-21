# Setup

## Overview

Use the [html-reporter][html-reporter] plugin to get an html-report on the tests run.

:warning: _For the html-reporter plugin to work correctly, [hermione][hermione] version 4 and higher is required._

The plugin saves the tests run results to the [SQLite][sqlite] database. Therefore, you will not be able to open the local report as a file using the `file://` protocol.

To view the report, run Hermione in GUI mode:

```bash
npx hermione gui
```

Or run [http-server][http-server] in the report folder:

```bash
npx http-server -p 8000
```

If you are starting a local server not from the folder with the report, then specify the path to the report:

```bash
npx http-server ./hermione-report -p 8000
```

Then open the page `http://localhost:8000` in the browser.

## Install

```bash
npm install -D html-reporter
```

## Setup

Add the plugin to the `plugins` section of the `hermione` config:

**Minimum config**

```javascript
module.exports = {
    plugins: {
        'html-reporter/hermione': {
            enabled: true
        },

        // other hermione plugins...
    },

    // other hermione settings...
};
```

**Maximum config**

```javascript
module.exports = {
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
            ],
            customScripts: [
                function() {
                    // custom script
                },

                // other scripts...
            ],
            customGui: {
                // DEPRECATED
                // additional controls for GUI mode
                // use report plugins instead of customGui
            },
            pluginsEnabled: true,
            plugins: [
                // report plugins...
            ],
            yandexMetrika: {
                counter: 1234567
            }
        },

        // other hermione plugins...
    },

    // other hermione settings...
}
```

### Description of configuration parameters

| **Parameter** | **Type** | **Default&nbsp;value** | **Description** |
| ------------- | -------- | :--------------------: | --------------- |
| [enabled](#enabled) | Boolean | true | Enable / disable the plugin. |
| [path](#path) | String | "html-report" | The path to the folder for saving html-report files. |
| [saveErrorDetails](#saveerrordetails) | Boolean | false | Save / do not save error details in json files. |
| [defaultView](#defaultview) | String | "all" | The test filtering mode when displayed, which will be set by default. |
| [diffMode](#diffmode) | String | "3-up" | The mode of viewing diffs, which will be set by default. |
| [baseHost](#basehost) | String | _N/A_ | Replaces the original host address for viewing in the browser. |
| [errorPatterns](#errorpatterns) | Object[] or String[] | [ ] | Error patterns with hints to improve the UX of the report. |
| [metaInfoBaseUrls](#metainfobaseurls) | Object | `{ }` | Base URLs for generating links in the _Meta_ section based on meta information about the test run. |
| [saveFormat](#saveformat) | String | "sqlite" | DEPRECATED. Allows you to set the format in which the results of the tests run will be saved. |
| [customGui](#customgui) | Object | `{ }` | DEPRECATED. Use [plugins](#plugins) instead. Description of custom controls for GUI mode. |
| [pluginsEnabled](#pluginsenabled) | Boolean | false | Enable plugins for the report. |
| [plugins](#plugins) | Object[] | [ ] | A list of plugins with their settings. |
| [customScripts](#customscripts) | Function[] | [ ] | A list of functions that implement custom scripts. For example, Yandex.Metrika scripts or a Bug. |
| [yandexMetrika](#yandexmetrika) | Object | `{ }` | [Yandex.Metrika][yandex-metrika]. |

### enabled

Enables or disables the plugin.

### path

The path to the folder for saving html-report files. By default, the files will be saved to the `html-report` folder in the current working folder.

### saveErrorDetails

Save or not save error details in json files (to the `error-details` folder).

By default, "do not save": `false`.

Any hermione plugin can add any details to the error object when it occurs. These details can help the user in debugging problems that have occurred in the test. Html-reporter saves these details in the `error-details` folder in a file named: `<hash from the full name of the test>-<browser>_<retry number>_<timestamp>.json`.

Under the stack trace, the html-reporter adds an `Error details` section with a `<title>` link pointing to the json file. The user can open this file either in the browser or in any IDE.

Example of how to add details to an error object from a plugin:

```javascript
const err = new Error('some error');

err.details = {
    title: 'description, will be used as url title',
    data: {} // or [], or String
};

throw err;
```

### defaultView

The test filtering mode when displayed, which will be set by default. The following values are available:

| **View&nbsp;mode** | **Description** |
| --------- | ------------ |
| all | all tests |
| passed | only passed tests |
| failed | only failed tests |
| retried | only those tests in which there were retries (re-runs) |
| skipped | only disabled (skipped) tests |

By default: `all`, that is, if the parameter is not set, all tests will be displayed.

### diffMode

The mode of viewing diffs, which will be set by default. The following values are available:

| **Diff&nbsp;mode** | **Description** |
| --------- | ------------ |
| 3-up | all images _(expected, actual, diff)_ in one column, under each other |
| 3&#8209;up&#8209;scaled | all images _(expected, actual, diff)_ in one row so that they fit on the screen |
| only-diff | only diff image |
| switch | reference image with the ability to switch to the actual image by mouse click |
| swipe | the actual image on top of the reference image, with a separator opening the reference image |
| onion-skin | the actual image on top of the reference with the ability to change the transparency of the actual image |

By default: `3-up`.

### baseHost

Replaces the original host address for viewing in the browser. By default, the original host address is not changed.

### errorPatterns

Error patterns are used:

* to show more understandable error information if they correspond to patterns for which there is a detailed description;
* in the `Group by` display mode with the `error` key selected.

Error patterns can be set either as objects or as strings.

To set the error pattern as an object, use the following format:

```javascript
{
    name: '<error name>',
    pattern: '<error pattern>',
    hint: '<hint to the user>'
}
```

where:

| **Parameter** | **Type** | **Description** |
| ------------- | -------- | --------------- |
| name | String | Error name. |
| pattern | String or RegExp | A regular expression or a regular string that the error should match. |
| hint | String | Optional parameter. A hint of what can be done with this error: why it occurred, how to fix it, etc. |

If the error pattern is specified as a string, for example: `<error>`, then this string is automatically treated as an object of the form:

```javascript
{
    name: '<error>',
    pattern: '<error>'
}
```

This way of setting a pattern is convenient for those errors where `name` and `pattern` are completely the same.

When one of the error patterns matches the error message, then:

* the `name` of the error template will be displayed as the title of the error message, and the original error message will be hidden under the cut;
* the `hint` for the error will be displayed after the error field `stack`. The hint can be specified as an html string. For example, `<div>some-useful-hint</div>`.

In the `Group by` mode with the selected `error` key, the test will be associated with the group if the test error matches the group error pattern. If the test cannot be linked to existing groups, a new group will be created.

### metaInfoBaseUrls

Base URLs for generating links in the `Meta` section based on meta information about the test run.

The parameter is set as an object:

```javascript
{
    '<option-1>': 'value of option 1',
    '<option-2>': 'value of option 2',
    // etc. 
}
```

For example:

```javascript
{
    'file': 'base/path'
}
```

When value of any key is set to `auto`, the base url will be set base host specified in the UI or kept intact if there base host isn't specified.

For example, if you have the following `metaInfoBaseUrls` value:
```javascript
{ custom_url: 'auto' }
```

And set `meta.custom_url` field to `https://example.com/some/path` in your tests, you'll see in meta:
- A link to `https://example.com/some/path` when base host is not set in the UI
- A link to `https://another-host.com/some/path` when base host in the UI is set to 'https://another-host.com'

### saveFormat

**DEPRECATED**

Allows you to set the format in which the results of the tests run will be saved.

Only one value is available now, which is used by default:
* `sqlite` &mdash; save the results of the tests run in the database of SQLite format.

### customGui

**DEPRECATED**

:warning: _Instead of customGui, it is recommended to use [report plugins](#plugins)._

Description of custom controls for GUI mode.

See more in the section "[Customizing GUI](./html-reporter-custom-gui.md)".

### pluginsEnabled

Enable plugins for `html-reporter`.

### plugins

A list of plugins with their settings.

See more details in the section "[Plugins](./html-reporter-plugins.md)".

### customScripts

A list of custom scripts in the form of an array of functions. Using this parameter, you can add any script to the html-report page. For example, to collect any metrics or implement additional functionality. The scripts will be executed immediately after rendering the page.

For example:

```javascript
customScripts: [
    function() {
        console.info('some logs');
    },
    () => {
        const div = document.createElement('div');
        div.innerHTML = 'hello';
        document.body.prepend(div);
    }
]
```

### yandexMetrika

By default, anonymous html-reporter interface usage information is collected for us to analyze usage patterns and improve UX. We collect such info as html-reporter loading speed, how often certain UI features are used (e.g. sorting tests) or clicks on UI elements. NO information about your project or tests is ever tracked.

If you want to opt out, choose any of the options below:

- Edit your config:
    ```javascript
    module.exports = {
        plugins: {
            'html-reporter/testplane': {
                yandexMetrika: {
                    enabled: false
                },
                // other html-reporter settings...
            },
            // other Testplane plugins...
        },
        // other Testplane settings...
    };
    ```
- Using environment variables: `html_reporter_yandex_metrika_enabled=false` or simply `NO_ANALYTICS=true`
- Using CLI arguments: `--html-reporter-yandex_metrika_enabled=false`

### Passing parameters via the CLI

All plugin parameters that can be defined in the config can also be passed as command line options or through environment variables during Hermione startup. Use the prefix `--html-reporter-` for command line options and `html_reporter_` for environment variables.

For example, the settings parameter [path](#path) can be passed in the following ways:

```bash
hermione path/to/mytest.js --html-reporter-path custom/dir
```

```bash
html_reporter_path=custom/dir hermione path/to/mytest.js
```

## Data storage

As mentioned above, `html-reporter` saves the tests run results to the [SQLite][sqlite] database.

Why do we use SQLite? Because it is:

* serverless, easy to connect and requires no configuration
* cross-platform, runs on any operating system
* single-file, easy to reuse reports and share them
* faster than if you store the report on the file system
* compact and has full SQL.

Files that are created during the execution of tests:

* `sqlite.db`&mdash;Sqlite database with tests run results
* `data.js`&mdash;report configuration
* `databaseUrls.json`&mdash;absolute or relative URLs to SQLite databases (`sqlite.db`) and/or URLs of other `databaseUrls.json` files (see command [merge-reports][merge-reports]).

[html-reporter]: https://github.com/gemini-testing/html-reporter
[hermione]: https://github.com/gemini-testing/hermione
[sqlite]: https://www.sqlite.org/index.html
[yandex-metrika]: https://yandex.ru/support/metrica/index.html
[yandex-metrika-goals]: https://yandex.ru/support/metrica/general/goals.html
[how-to-create-counter]: https://yandex.ru/support/metrica/general/creating-counter.html
[merge-reports]: ./html-reporter-commands.md#merge-reports
[http-server]: https://github.com/http-party/http-server#http-server-a-simple-static-http-server
