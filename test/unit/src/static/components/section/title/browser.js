import React from 'react';
import {defaults} from 'lodash';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from 'test/unit/src/static/components/utils';
import {mkBrowser, mkResult, mkStateTree} from 'test/unit/src/static/state-utils';
import {SKIPPED} from 'src/constants/test-statuses';
import actionNames from 'src/static/modules/action-names';
import viewModes from 'src/constants/view-modes';
import {EXPAND_ALL} from 'src/constants/expand-modes';

describe('<BrowserTitle/>', () => {
    const sandbox = sinon.sandbox.create();
    let BrowserTitle, actionsStub, queryParams;

    const mkBrowserTitleComponent = (props = {}, initialState = {}) => {
        props = defaults(props, {
            title: 'default_title',
            browserId: 'default_bro',
            browserName: 'default_name',
            lastResultId: 'default_res',
            handler: () => {}
        });
        initialState = defaults(initialState, {
            tree: mkStateTree()
        });

        return mkConnectedComponent(<BrowserTitle {...props} />, {initialState});
    };

    beforeEach(() => {
        actionsStub = {
            copyTestLink: sandbox.stub().returns({type: actionNames.COPY_TEST_LINK})
        };

        queryParams = {
            appendQuery: sandbox.stub().returns(null)
        };

        BrowserTitle = proxyquire('src/static/components/section/title/browser', {
            '../../../modules/actions': actionsStub,
            '../../../modules/query-params': queryParams
        }).default;
    });

    describe('<ClipboardButton/>', () => {
        it('should call action "onCopyTestLink" on click', () => {
            const browsersById = mkBrowser({id: 'yabro', name: 'yabro', resultIds: ['default_res']});
            const resultsById = mkResult({id: 'default_res', status: SKIPPED, skipReason: 'some-reason'});
            const tree = mkStateTree({browsersById, resultsById});

            const component = mkBrowserTitleComponent({browserId: 'yabro'}, {tree});
            component.find('ClipboardButton').simulate('click');

            assert.calledOnce(actionsStub.copyTestLink);
            assert.calledWithExactly(actionsStub.copyTestLink);
        });

        it('should call "appendQuery" with correct arguments', () => {
            const browsersById = mkBrowser({id: 'yabro', name: 'yabro', parentId: 'test'});
            const resultsById = mkResult({id: 'default_res', status: SKIPPED, skipReason: 'some-reason'});
            const tree = mkStateTree({browsersById, resultsById});

            const component = mkBrowserTitleComponent({browserId: 'yabro', browserName: 'yabro'}, {tree});

            // call prop to simulate click due to multiple requires in ClipboardButton
            component.find('ClipboardButton').prop('option-text')();

            assert.calledOnce(queryParams.appendQuery);
            assert.calledWithExactly(queryParams.appendQuery, 'about:blank', {
                browser: 'yabro',
                testNameFilter: 'test',
                strictMatchFilter: true,
                retryIndex: 0,
                viewModes: viewModes.ALL,
                expand: EXPAND_ALL
            });
        });
    });
});
