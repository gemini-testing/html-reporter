import {isEmpty} from 'lodash';
import reduceReducers from 'reduce-reducers';
import defaultState from '../default-state';

import notifications from './notifications';
import running from './running';
import processing from './processing';
import serverStopped from './serverStopped';
import loading from './loading';
import gui from './gui';
import date from './date';
import autoRun from './auto-run';
import apiValues from './api-values';
import modals from './modals';
import closeIds from './close-ids';
import db from './db';
import fetchDbDetails from './fetch-db-details';
import tree from './tree';
import browsers from './browsers';
import config from './config';
import stats from './stats';
import skips from './skips';
import view from './view';
import plugins from './plugins';
import groupedErrors from './grouped-errors';

// The order of specifying reducers is important.
// At the top specify reducers that does not depend on other state fields.
// At the bottom specify reducers that depend on state from other reducers listed above.
export default reduceReducers(
    (state) => isEmpty(state) ? defaultState : state,
    notifications,
    running,
    processing,
    serverStopped,
    loading,
    gui,
    date,
    autoRun,
    apiValues,
    modals,
    closeIds,
    db,
    fetchDbDetails,
    browsers,
    config,
    stats,
    skips,
    // important to specify `view` higher than `tree`
    view,
    tree,
    groupedErrors,
    plugins
);
