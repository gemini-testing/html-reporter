import React from 'react';
import _ from 'lodash';
import configureStore from 'redux-mock-store';
import {Provider} from 'react-redux';
import defaultState from 'lib/static/modules/default-state';

exports.mkStore = (state) => {
    const initialState = _.defaults(state, defaultState);
    const mockStore = configureStore();

    return mockStore(initialState);
};

exports.mkConnectedComponent = (Component, {initialState} = {}) => {
    const store = exports.mkStore(initialState);
    return mount(<Provider store={store}>{Component}</Provider>);
};

exports.mkTestResult_ = (result) => {
    return _.defaults(result, {
        suiteUrl: '',
        metaInfo: {},
        imagesInfo: [],
        expectedPath: ''
    });
};
