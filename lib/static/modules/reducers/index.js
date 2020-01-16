'use strict';

import {combineReducers} from 'redux';
import {POSITIONS, reducer as notificationsReducer} from 'reapop';
import reporter from './reporter';

export default combineReducers({
    notifications: notificationsReducer({
        position: POSITIONS.topCenter,
        dismissAfter: 5000,
        dismissible: true,
        closeButton: true,
        allowHTML: true
    }),
    reporter
});
