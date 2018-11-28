import React from 'react';
import _ from 'lodash';
import configureStore from 'redux-mock-store';
import { Provider } from 'react-redux';
import defaultState from 'lib/static/modules/default-state';
exports.mkStore = function (state) {
    var initialState = _.defaults(state, defaultState);
    var mockStore = configureStore();
    return mockStore(initialState);
};
exports.mkConnectedComponent = function (Component, _a) {
    var initialState = (_a === void 0 ? {} : _a).initialState;
    var store = exports.mkStore(initialState);
    return mount(React.createElement(Provider, { store: store }, Component));
};
exports.mkTestResult_ = function (result) {
    return _.defaults(result, {
        suiteUrl: '',
        metaInfo: {},
        imagesInfo: [],
        expectedPath: ''
    });
};
//# sourceMappingURL=utils.js.map