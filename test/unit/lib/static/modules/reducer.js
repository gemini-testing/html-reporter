'use strict';
import actionNames from 'lib/static/modules/action-names';
import defaultState from 'lib/static/modules/default-state';

const {assign} = require('lodash');
const proxyquire = require('proxyquire');
const reducer = proxyquire('lib/static/modules/reducer', {
    './local-storage-wrapper': {
        setItem: sinon.stub(),
        getItem: sinon.stub()
    }
}).default;

describe('lib/static/modules/reducer', () => {
    describe('reducer', () => {
        describe('regression', () => {
            it('shouldn\'t change "Expand" filter when "Show all" or "Show only failed" state changing', function() {
                let newState = [
                    {type: actionNames.VIEW_EXPAND_RETRIES},
                    {type: actionNames.VIEW_SHOW_ALL}
                ].reduce(reducer, defaultState);

                assert.equal(newState.view.expand, 'retries');

                newState = [
                    {type: actionNames.VIEW_EXPAND_RETRIES},
                    {type: actionNames.VIEW_SHOW_FAILED}
                ].reduce(reducer, defaultState);

                assert.equal(newState.view.expand, 'retries');
            });
        });

        describe('VIEW_SHOW_ALL', () => {
            it('should change "viewMode" field on "all" value', () => {
                const action = {type: actionNames.VIEW_SHOW_ALL};

                const newState = reducer(defaultState, action);

                assert.equal(newState.view.viewMode, 'all');
            });
        });

        describe('VIEW_SHOW_FAILED', () => {
            it('should change "viewMode" field on "failed" value', () => {
                const action = {type: actionNames.VIEW_SHOW_FAILED};

                const newState = reducer(defaultState, action);

                assert.equal(newState.view.viewMode, 'failed');
            });
        });

        describe('PROCESS_BEGIN', () => {
            it('should set processing flag', () => {
                const action = {type: actionNames.PROCESS_BEGIN};

                const newState = reducer(defaultState, action);

                assert.isTrue(newState.processing);
            });
        });

        describe('PROCESS_END', () => {
            it('should reset processing flag', () => {
                const action = {type: actionNames.PROCESS_END};

                const newState = reducer(assign(defaultState, {processing: true}), action);

                assert.isFalse(newState.processing);
            });
        });
    });
});
