import React from 'react';
import {defaults} from 'lodash';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from 'test/unit/lib/static/components/utils';
import {mkBrowser, mkResult, mkStateTree} from 'test/unit/lib/static/state-utils';
import {SUCCESS} from 'lib/constants/test-statuses';
import {ViewMode} from 'lib/constants/view-modes';
import {EXPAND_ALL} from 'lib/constants/expand-modes';
import {CHECKED, UNCHECKED} from 'lib/constants/checked-statuses';

describe('<BrowserTitle/>', () => {
    const sandbox = sinon.sandbox.create();
    let BrowserTitle, actionsStub, queryParams, useLocalStorageStub, ViewInBrowserIcon;

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
            toggleBrowserCheckbox: sandbox.stub().returns({type: 'some-type'}),
            copyTestLink: sandbox.stub().returns({type: 'some-type'})
        };

        queryParams = {
            appendQuery: sandbox.stub().returns(null)
        };
        useLocalStorageStub = sandbox.stub().returns([false]);
        ViewInBrowserIcon = sandbox.stub().returns(null);

        BrowserTitle = proxyquire('lib/static/components/section/title/browser', {
            '../../../modules/actions': actionsStub,
            '../../../modules/query-params': queryParams,
            '../../icons/view-in-browser': {default: ViewInBrowserIcon},
            '../../bullet': proxyquire('lib/static/components/bullet', {
                '../hooks/useLocalStorage': {default: useLocalStorageStub}
            })
        }).default;
    });

    describe('<Checkbox/>', () => {
        [true, false].forEach(show => {
            it(`should ${show ? '' : 'not '}exist if "showCheckboxes" is ${show ? '' : 'not '}set`, () => {
                useLocalStorageStub.withArgs('showCheckboxes', false).returns([show]);
                const browsersById = mkBrowser({id: 'yabro', name: 'yabro', resultIds: ['default_res']});
                const resultsById = mkResult({id: 'default_res', status: SUCCESS, skipReason: 'some-reason'});
                const browsersStateById = {'yabro': {checkStatus: UNCHECKED}};
                const tree = mkStateTree({browsersById, resultsById, browsersStateById});

                const component = mkBrowserTitleComponent({browserId: 'yabro'}, {tree});

                assert.equal(component.find('input[type="checkbox"]').exists(), show);
            });
        });

        [CHECKED, UNCHECKED].forEach(checked => {
            it(`should call "toggleBrowserCheckbox" action with ${checked ? 'unchecked' : 'checked'} state on click`, () => {
                useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
                const browsersById = mkBrowser({id: 'yabro', name: 'yabro', resultIds: ['default_res']});
                const resultsById = mkResult({id: 'default_res', status: SUCCESS, skipReason: 'some-reason'});
                const browsersStateById = {'yabro': {checkStatus: checked}};
                const tree = mkStateTree({browsersById, resultsById, browsersStateById});
                const component = mkBrowserTitleComponent({browserId: 'yabro'}, {tree});

                component.find('input[type="checkbox"]').simulate('click');

                assert.calledOnceWith(actionsStub.toggleBrowserCheckbox, {
                    suiteBrowserId: 'yabro',
                    checkStatus: checked ? UNCHECKED : CHECKED
                });
            });
        });
    });

    describe('<ClipboardButton/>', () => {
        it('should call action "onCopyTestLink" on click', () => {
            const browsersById = mkBrowser({id: 'yabro', name: 'yabro', resultIds: ['default_res']});
            const resultsById = mkResult({id: 'default_res', status: SUCCESS, skipReason: 'some-reason'});
            const browsersStateById = {'yabro': {checkStatus: UNCHECKED}};
            const tree = mkStateTree({browsersById, resultsById, browsersStateById});

            const component = mkBrowserTitleComponent({browserId: 'yabro'}, {tree});
            component.find('ClipboardButton').simulate('click');

            assert.calledOnce(actionsStub.copyTestLink);
            assert.calledWithExactly(actionsStub.copyTestLink);
        });

        it('should call "appendQuery" with correct arguments', () => {
            const browsersById = mkBrowser({id: 'yabro', name: 'yabro', parentId: 'test'});
            const resultsById = mkResult({id: 'default_res', status: SUCCESS, skipReason: 'some-reason'});
            const browsersStateById = {'yabro': {checkStatus: UNCHECKED}};
            const tree = mkStateTree({browsersById, resultsById, browsersStateById});

            const component = mkBrowserTitleComponent({browserId: 'yabro', browserName: 'yabro'}, {tree});

            assert.calledOnce(queryParams.appendQuery);
            assert.calledWithExactly(queryParams.appendQuery, 'about:blank', {
                browser: 'yabro',
                testNameFilter: 'test',
                strictMatchFilter: true,
                retryIndex: 0,
                viewModes: ViewMode.ALL,
                expand: EXPAND_ALL
            });
        });
    });

    it('should call "toggleBrowserSection" action on click in browser title', () => {
        const handler = sandbox.stub();
        const browsersById = mkBrowser({id: 'yabro', name: 'yabro', resultIds: ['res-1'], parentId: 'test'});
        const browsersStateById = {'yabro': {shouldBeShown: true, shouldBeOpened: false}};
        const resultsById = mkResult({id: 'res-1', status: SUCCESS});
        const tree = mkStateTree({browsersById, browsersStateById, resultsById});
        const component = mkBrowserTitleComponent({browserId: 'yabro', browserName: 'yabro', handler}, {tree});

        component.find('.section__title').simulate('click');

        assert.calledOnce(handler);
    });
});
