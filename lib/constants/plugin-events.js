'use strict';

const getSyncEvents = () => ({
    DATABASE_CREATED: 'databaseCreated',
    TEST_SCREENSHOTS_SAVED: 'testScreenshotsSaved'
});

const events = getSyncEvents();
Object.defineProperty(events, 'getSync', {value: getSyncEvents, enumerable: false});

module.exports = events;
