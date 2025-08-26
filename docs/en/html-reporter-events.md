# Events

## Overview

The `html-reporter` plugin adds a special _htmlReporter_ object to Hermione's interface, through which, among other things, you can subscribe to report events. To do this, `hermione.htmlReporter` provides the `events` property with a list of events to subscribe to:

* [DATABASE_CREATED](#database_created)&mdash;an event that is triggered immediately after the sqlite database is created;
* [TEST_SCREENSHOTS_SAVED](#test_screenshots_saved)&mdash;the event that is triggered after saving screenshots of the test;
* [REPORT_SAVED](#report_saved)&mdash;the event that is triggered after saving all the report files.

## DATABASE_CREATED

**sync | master**

The `DATABASE_CREATED` event is triggered immediately after the sqlite database is created. The event handler is executed synchronously.

### Event subscription

```javascript
hermione.htmlReporter.on(hermione.htmlReporter.events.DATABASE_CREATED, (db) => {
    console.info(`DATABASE_CREATED event processing is in progress...`);
});
```

#### Handler parameters

A [sql.js](https://www.npmjs.com/package/sql.js) database instance is passed to the event handler.

### Usage example

```javascript
const {parseConfig} = require('./config');

module.exports = (hermione, opts) => {
    const pluginConfig = parseConfig(opts);

    if (!pluginConfig.enabled || hermione.isWorker()) {
        // either the plugin is disabled, or we are in the context of a worker – we leave
        return;
    }

    // the "htmlReporter" property is guaranteed to be in the "hermione" object
    // at the time the INIT event is triggered
    hermione.on(hermione.events.INIT, () => {
        hermione.htmlReporter.on(hermione.htmlReporter.events.DATABASE_CREATED, (db) => {
            db.prepare(`CREATE TABLE IF NOT EXISTS testTable (foo TEXT, bar TEXT)`).run();
        });
    });
};
```

## TEST_SCREENSHOTS_SAVED

**async | master**

The `TEST_SCREENSHOTS_SAVED` event is triggered after saving screenshots of the next test. The event handler can be asynchronous.

### Event subscription

```javascript
hermione.htmlReporter.on(
    hermione.htmlReporter.events.TEST_SCREENSHOTS_SAVED,
    async ({ testId, attempt, imagesInfo }) => {
        console.info(`Screenshots for test "${testId}" (attempt #${attempt}) were saved:`, imagesInfo);

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
    }
);
```

#### Handler parameters

An object with information about the test of the following type is passed to the event handler:

```javascript
{
    testId, // id of the test: "<test full title>.<browser id>"
    attempt, // test execution attempt number
    imagesInfo // information about screenshots (see above example of event subscription)
}
```

## REPORT_SAVED

**async | master**

The `REPORT_SAVED` event is triggered after saving all the report files. The event handler can be asynchronous.

### Event subscription

```javascript
hermione.htmlReporter.on(hermione.htmlReporter.events.REPORT_SAVED,
    async ({ reportPath }) => {
        console.info(`REPORT_SAVED event processing is in progress, report path = ${reportPath}...`);
    }
);
```

#### Handler parameters

An object with the key `reportPath` is passed to the handler, the value of which stores the path to the saved report.

### Usage example

```javascript
hermione.htmlReporter.on(hermione.htmlReporter.events.REPORT_SAVED,
    async ({ reportPath }) => {
        await uploadDirToS3(reportPath); // uploading the report to S3 storage
    }
);
```
