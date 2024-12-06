import reduceReducers from 'reduce-reducers';
import {isEmpty} from 'lodash';
import defaultState from '../default-state';

import notifications from './notifications';
import running from './running';
import processing from './processing';
import loading from './loading';
import gui from './gui';
import timestamp from './timestamp';
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
import groupedTests from './grouped-tests';
import stopping from './stopping';
import progressBar from './bottom-progress-bar';
import staticImageAccepter from './static-image-accepter';
import suitesPage from './suites-page';
import visualChecksPage from './visual-checks-page';
import isInitialized from './is-initialized';
import newUiGroupedTests from './new-ui-grouped-tests';
import sortTests from './sort-tests';
import guiServerConnection from './gui-server-connection';

// The order of specifying reducers is important.
// At the top specify reducers that does not depend on other state fields.
// At the bottom specify reducers that depend on state from other reducers listed above.
export default reduceReducers(
    (state) => isEmpty(state) ? defaultState : state,
    notifications,
    running,
    processing,
    stopping,
    loading,
    gui,
    timestamp,
    date, // TODO: remove in next major (should use timestamp instead)
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
    staticImageAccepter,
    tree,
    groupedTests,
    newUiGroupedTests,
    sortTests,
    plugins,
    progressBar,
    suitesPage,
    visualChecksPage,
    isInitialized,
    guiServerConnection
);
