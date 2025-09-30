# API

## Overview

Html-reporter adds an `htmlReporter` object to the `testplane` object with its own API.

| **Name** | **Type** | **Descriptiion** |
| -------- | -------- | ---------------- |
| [events](#events) | Object | A list of events to subscribe to. |
| [extraItems](#extraitems) | Object | Additional elements to be added to the burger menu of the report. |
| [imagesSaver](#imagessaver) | Object | Interface for saving images to the user's storage. |
| [reportsSaver](#reportssaver) | Object | Interface for saving sqlite databases to the user's storage. |
| [snapshotsSaver](#snapshotssaver) | Object | Interface for saving snapshots to the user's storage. |
| [addExtraItem](#addextraitem) | Method | Adds an additional item to the burger menu of the report. |
| [downloadDatabases](#downloaddatabases) | Method | Downloads all databases from the given files of the type _databaseUrls.json_. |
| [mergeDatabases](#mergedatabases) | Method | Merges all given databases and saves the final report on the specified path. |
| [getTestsTreeFromDatabase](#getteststreefromdatabase) | Method | Resolves the test tree from the passed database. |

## events

A list of events to subscribe to.

For more information, see the section "[Events](./html-reporter-events.md)".

## extraItems

Additional elements to be added to the burger menu of the report.

To add elements, use the [addExtraItem](#addextraitem) method.

## imagesSaver

Interface for saving images to the user's storage.

### Usage example

```javascript
const MyStorage = require('my-storage');
const myStorage = new MyStorage();

module.exports = (testplane, opts) => {
    testplane.on(testplane.events.INIT, async () => {
        testplane.htmlReporter.imagesSaver = {
            /**
            * Save the image to a custom storage.
            * The function can be either asynchronous or synchronous.
            * The function should return the path or URL to the saved image.
            * @property {String} localFilePath – the path to the image on the file system
            * @param {Object} options
            * @param {String} options.destPath – the path to the image in the html-report
            * @param {String} options.reportDir - path to the html-report folder
            * @returns {String} the path or URL to the image
            */
            saveImg: async (localFilePath, options) => {
                const { destPath, reportDir } = options;
                const imageUrl = await myStorage.save(localFilePath, destPath, reportDir);

                // ...

                return imageUrl;
            }
        }
    });
};
```

## reportsSaver

Interface for saving sqlite databases to the user's storage.

### Usage example

```javascript
const MyStorage = require('my-storage');
const myStorage = new MyStorage();

module.exports = (testplane, opts) => {
    testplane.on(testplane.events.INIT, async () => {
        testplane.htmlReporter.reportsSaver = {
            /**
            * Save sqlite database to user storage.
            * The function can be either asynchronous or synchronous.
            * The function should return the path or URL to the saved sqlite database.
            * @property {String} localFilePath – the path to the sqlite database on the file system
            * @param {Object} options
            * @param {String} options.destPath – the path to the sqlite database in the html-report
            * @param {String} options.reportDir - path to the html-report folder
            * @returns {String} the path or URL to the sqlite database
            */
            saveReportData: async (localFilePath, options) => {
                const { destPath, reportDir } = options;
                const dbUrl = await myStorage.save(localFilePath, destPath, reportDir);

                // ...

                return dbUrl;
            }
        }
    });
};
```

## snapshotsSaver

Interface for saving DOM-snapshots to the user's storage.

### Usage example

```javascript
const MyStorage = require('my-storage');
const myStorage = new MyStorage();

module.exports = (testplane, opts) => {
    testplane.on(testplane.events.INIT, async () => {
        testplane.htmlReporter.snapshotsSaver = {
            /**
            * Save snapshot to user storage.
            * The function can be either asynchronous or synchronous.
            * The function should return the path or URL to the saved snapshot.
            * @property {String} localFilePath – the path to the snapshot on the file system
            * @param {Object} options
            * @param {String} options.destPath – the path to the snapshot in the html-report
            * @param {String} options.reportDir - path to the html-report folder
            * @returns {String} the path or URL to the snapshot
            */
            saveSnapshot: async (localFilePath, options) => {
                const { destPath, reportDir } = options;
                const snapshotUrl = await myStorage.save(localFilePath, destPath, reportDir);

                // ...

                return snapshotUrl;
            }
        }
    });
};
```

## addExtraItem

Adds an additional item to the burger menu of the report.

### Example of a call

```javascript
testplane.htmlReporter.addExtraItem(caption, url);
```

### Call parameters

All parameters are required.

| **Parameter&nbsp;name** | **Type** | **Description** |
| ----------------------- | -------- | --------------- |
| caption | String | The name of the item to add to the burger menu. |
| url | String | The URL to which the menu item to be added will link. |

## downloadDatabases

Downloads all databases from the given files of the type `databaseUrls.json`.

### Example of a call

```javascript
const dbPaths = await testplane.htmlReporter.downloadDatabases(
    ['.\databaseUrls.json'], { pluginConfig }
);
```

### Call parameters

The function takes 2 arguments&mdash;a list of paths to the files `databaseUrls.json` in the form of an array of strings and an object with the key `pluginConfig`, in the value of which the plugin config is stored.

The function returns a list of paths to saved databases.

## mergeDatabases

Merges all given databases and saves the final report on the specified path.

### Example of a call

```javascript
await testplane.htmlReporter.mergeDatabases(srcDbPaths, path);
```

### Call parameters

| **Parameter&nbsp;name** | **Type** | **Description** |
| ----------------------- | -------- | --------------- |
| srcDbPaths | String[] | Paths to databases. |
| path | String | The path where the resulting database will be saved. |

## getTestsTreeFromDatabase

Resolves the test tree from the passed database.

### Example of a call

```javascript
const dbTree = await testplane.htmlReporter.getTestsTreeFromDatabase(mergedDbPath);
```

### Call parameters

The function takes one argument&mdash;the path to the database with the result of the tests run.

### Usage example

```javascript
async function getSuccessTestRunIds({ testplane, mergedDbPath }) {
    const dbTree = await testplane.htmlReporter.getTestsTreeFromDatabase(mergedDbPath);

    const successTestRunIds = [];

    for (const browserId of dbTree.browsers.allIds) {
        const browser = dbTree.browsers.byId[browserId];
        const lastResultId = _.last(browser.resultIds);
        const lastResult = lastResultId && dbTree.results.byId[lastResultId];

        if (!lastResult || lastResult.status !== SUCCESS) {
            continue;
        }

        const testRunId = new URL(lastResult.suiteUrl).searchParams.get("testRunId");

        if (!testRunId) {
            continue;
        }

        successTestRunIds.push(testRunId);
    }

    return successTestRunIds;
}
```
