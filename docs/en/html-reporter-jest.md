# Connecting a reporter to Jest

## Before connecting
We recommend that you read the [Jest documentation on connecting reporters](https://jestjs.io/docs/configuration#reporters-arraymodulename--modulename-options) beforehand.

In our case, there are no special differences, but for convenience, all the necessary information is provided below.

## Minimal configuration
To connect the reporter, just go to jest.config.specify in the js file:
```
const config = {
    reporters: [ 
        'html-reporter/build/jest.js ' // Connecting our reporter        
        'default' // Built-in Jest reporter, can be removed 
        // You can also connect other reporters
    ],
};
```

After such a setup, in order to receive the report, it is enough to simply run the tests. 
The command to run the tests in your project is stored in the package.json, most often it is:

```
npm run build
```

After the report is generated, it must be distributed from the local server.

This requires the serve library, a package for quick and easy maintenance of static files. It allows you to turn the current working directory into a virtual server where you can open HTML, CSS, JavaScript files and other static assets in the browser.

To install serve globally, run the following command:

```
npm i -g serve
```

After installing serve, you can start the local server using the command:

```
serve html-report
```

> The default folder with the report is called `html-report'. If you want to change the folder name, you can specify it in the reporter configuration. See below how to do this.

The finished report can be viewed at `http://localhost:3000` in the browser.

## Maximum configuration

You can configure the html reporter in the same way as it is specified in the [configuration guide](./html-reporter-setup.md ). All available settings are listed in the section "Description of configuration parameters".

To transfer the settings to the reporter, you will need to slightly change content of jest.config.js.

```
const config = {
    reporters: [
        ['html-reporter/build/jest.js', { 
            path: 'reports/html-report', // Changing the path to the report folder 
        }]
    ],
};
```

In this example, the path to the report folder is changed to `reports/html-report`.
