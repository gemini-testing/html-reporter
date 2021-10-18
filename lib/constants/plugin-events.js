'use strict';

const getSyncEvents = () => ({
    DATABASE_CREATED: 'databaseCreated'
});

const events = getSyncEvents();
Object.defineProperty(events, 'getSync', {value: getSyncEvents, enumerable: false});

module.exports = events;
