# html-reporter

Plugin for [gemini](https://github.com/gemini-testing/gemini) and [hermione](https://github.com/gemini-testing/hermione) which is intended to aggregate the results of tests running into html report.

You can read more about gemini plugins [here](https://github.com/gemini-testing/gemini/blob/master/doc/plugins.md) and about hermione plugins [here](https://github.com/gemini-testing/hermione#plugins).

## Installation

```bash
npm install html-reporter
```

**:warning: Requires Hermione >=2.7.0**

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
* **scaleImages** (optional) – `Boolean` – fit images into page width; `false` by default
* **lazyLoadOffset** (optional) - `Number` - allows you to specify how far above and below the viewport you want to begin loading images. Lazy loading would be disabled if you specify 0. `800` by default.
* **errorPatterns** (optional) - `Array` - error message patterns for 'Group by error' mode.
Array element must be `Object` ({'*name*': `String`, '*pattern*': `String`}) or `String` (interpret as *name* and *pattern*).
Test will be associated with group if test error matches on group error pattern.
New group will be created if test cannot be associated with existing groups.

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
                baseHost: 'test.com',
                errorPatterns: [
                    'Parameter .* must be a string',
                    {
                        name: 'Cannot read property of undefined',
                        pattern: 'Cannot read property .* of undefined'
                    }
                ]
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

Before run integration tests on local machine you should run [sauce-connect](https://wiki.saucelabs.com/display/DOCS/Basic+Sauce+Connect+Proxy+Setup)

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
