'use strict';

const commonClientEvents = require('../../constants/client-events');

module.exports = Object.assign(commonClientEvents, {
    BEGIN_SUITE: 'beginSuite',
    BEGIN_STATE: 'beginState',

    TEST_RESULT: 'testResult',

    RETRY: 'retry',
    ERROR: 'err',

    END: 'end'
});
