import React from 'react';
import {defaults} from 'lodash';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from 'test/unit/lib/static/components/utils';
import {mkBrowser, mkResult, mkStateTree} from 'test/unit/lib/static/state-utils';
import {SKIPPED} from 'lib/constants/test-statuses';
import {CHECKED, UNCHECKED} from 'lib/constants/checked-statuses';

describe('<BrowserSkippedTitle/>', () => {
    const sandbox = sinon.sandbox.create();
    let BrowserSkippedTitle, useLocalStorageStub, actionsStub;

    const mkBrowserSkippedTitleComponent = (props = {}, initialState = {}) => {
        props = defaults(props, {
            title: 'default_title'
        });
        initialState = defaults(initialState, {
            tree: mkStateTree()
        });

        return mkConnectedComponent(<BrowserSkippedTitle {...props} />, {initialState});
    };

    beforeEach(() => {
        useLocalStorageStub = sandbox.stub().returns([false]);
        actionsStub = {
            toggleBrowserCheckbox: sandbox.stub().returns({type: 'some-type'})
        };

        BrowserSkippedTitle = proxyquire('lib/static/components/section/title/browser-skipped', {
            '../../../modules/actions': actionsStub,
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
                const resultsById = mkResult({id: 'default_res', status: SKIPPED, skipReason: 'some-reason'});
                const browsersStateById = {'yabro': {checkStatus: UNCHECKED}};
                const tree = mkStateTree({browsersById, resultsById, browsersStateById});

                const component = mkBrowserSkippedTitleComponent({browserId: 'yabro'}, {tree});

                assert.equal(component.find('input[type="checkbox"]').exists(), show);
            });
        });

        [CHECKED, UNCHECKED].forEach(checked => {
            it(`should call "toggleBrowserCheckbox" action with ${checked ? 'unchecked' : 'checked'} stat on click`, () => {
                useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
                const browsersById = mkBrowser({id: 'yabro', name: 'yabro', resultIds: ['default_res']});
                const resultsById = mkResult({id: 'default_res', status: SKIPPED, skipReason: 'some-reason'});
                const browsersStateById = {'yabro': {checkStatus: checked}};
                const tree = mkStateTree({browsersById, resultsById, browsersStateById});
                const component = mkBrowserSkippedTitleComponent({browserId: 'yabro'}, {tree});

                component.find('input[type="checkbox"]').simulate('click');

                assert.calledOnceWith(actionsStub.toggleBrowserCheckbox, {
                    suiteBrowserId: 'yabro',
                    checkStatus: checked ? UNCHECKED : CHECKED
                });
            });
        });
    });
});
