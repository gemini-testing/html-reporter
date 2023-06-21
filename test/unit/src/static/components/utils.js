import React from 'react';
import _ from 'lodash';
import configureStore from 'redux-mock-store';
import {Provider} from 'react-redux';
import defaultState from 'src/static/modules/default-state';

exports.mkState = ({initialState} = {}) => {
    return _.defaultsDeep(initialState, defaultState);
};

exports.mkStore = ({initialState, state} = {}) => {
    const readyState = state ? state : exports.mkState({initialState});
    const mockStore = configureStore();

    return mockStore(readyState);
};

exports.mkConnectedComponent = (Component, state) => {
    const store = exports.mkStore(state);
    return mount(<Provider store={store}>{Component}</Provider>);
};

exports.mkImg_ = (opts = {}) => {
    return _.defaultsDeep(opts, {
        path: 'default/path',
        size: {width: 100500, height: 500100}
    });
};

exports.mkTestResult_ = (result) => {
    return _.defaults(result, {
        suiteUrl: '',
        metaInfo: {},
        imagesInfo: [],
        expectedImg: exports.mkImg_()
    });
};

exports.mkSuite_ = (suite) => {
    return _.defaults(suite, {
        name: 'default-suite',
        suitePath: ['default-suite']
    });
};
