# html-reporter

Plugin for [gemini](https://github.com/gemini-testing/gemini) and [hermione](https://github.com/gemini-testing/hermione) which is intended to aggregate the results of tests running into html report.

You can read more about gemini plugins [here](https://github.com/gemini-testing/gemini/blob/master/doc/plugins.md) and about hermione plugins [here](https://github.com/gemini-testing/hermione#plugins).

## Installation

```bash
npm install html-reporter
```

## Usage

Plugin has following configuration:

* **enabled** (optional) `Boolean` – enable/disable the plugin; by default plugin is enabled
* **path** (optional) `String` - path to directory for saving html report file; by
default html report will be saved into `gemini-report/index.html` inside current work
directory.
* **defaultView** (optional) `String` - default view mode. Available values are:
  * `all` - show all tests. Default value.
  * `failed` - show only failed tests.
* **baseHost** (optional) - `String` - it changes original host for view in the browser; by default original host does not change
* **screenshotOnReject** (optional, only for hermione) - attaches a screenshot of a
current page on test fail. Can be boolean or object with httpTimeout option. If
`screenshotOnReject` is set as `true`, then will be used common `httpTimeout` value. `true` by default. See example of usage [here](#hermione-usage).

Also there is ability to override plugin parameters by CLI options or environment variables
(see [configparser](https://github.com/gemini-testing/configparser)).
Use `html_reporter_` prefix for the environment variables and `--html-reporter-` for the cli options.

For example you can override `path` option like so:
```bash
$ html_reporter_path=custom/dir gemini test
$ gemini test --html-reporter-path custom/dir
```

### Gemini Usage

Add plugin to your `gemini` config file:

```js
module.exports = {
    // ...
    system: {
        plugins: {
            'html-reporter/gemini': {
                enabled: true,
                path: 'my/gemini-reports',
                defaultView: 'all',
                baseHost: 'test.com'
            }
        }
    },
    //...
}
```

### Hermione Usage

Add plugin to your `hermione` config file:

```js
module.exports = {
    // ...
    system: {
        plugins: {
            'html-reporter/hermione': {
                enabled: true,
                path: 'my/hermione-reports',
                defaultView: 'all',
                baseHost: 'test.com',
                screenshotOnReject: {
                    httpTimeout: 10000
                }
            }
        }
    },
    //...
}
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
