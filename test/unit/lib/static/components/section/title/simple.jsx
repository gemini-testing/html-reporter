import {expect} from 'chai';
import React from 'react';
import proxyquire from 'proxyquire';
import {defaultsDeep, set} from 'lodash';
import {mkConnectedComponent} from 'test/unit/lib/static/components/utils';
import {mkStateTree} from 'test/unit/lib/static/state-utils';
import {CHECKED, UNCHECKED, INDETERMINATE} from 'lib/constants/checked-statuses';
import {TestStatus} from 'lib/constants';
import userEvent from '@testing-library/user-event';

describe('<SuiteTitle/>', () => {
    const sandbox = sinon.sandbox.create();
    let SuiteTitle, actionsStub, useLocalStorageStub, mkGetTestsBySuiteIdStub;

    const mkSuiteTitleComponent = (checkStatus, status) => {
        const props = {
            name: 'suiteName',
            suiteId: 'suiteId',
            handler: sandbox.stub()
        };
        const initialState = defaultsDeep(
            set({}, 'tree.suites.stateById.suiteId.checkStatus', checkStatus),
            set({}, 'tree.suites.byId.suiteId.status', status),
            set({}, 'tree', mkStateTree),
            set({}, 'gui', true)
        );

        return mkConnectedComponent(<SuiteTitle {...props} />, {initialState});
    };

    beforeEach(() => {
        actionsStub = {toggleSuiteCheckbox: sandbox.stub().returns({type: 'some-type'})};
        useLocalStorageStub = sandbox.stub().returns([false]);
        mkGetTestsBySuiteIdStub = sandbox.stub().returns(sandbox.stub().returns([]));

        SuiteTitle = proxyquire('lib/static/components/section/title/simple', {
            '../../../modules/actions': actionsStub,
            '../../../modules/selectors/tree': {mkGetTestsBySuiteId: mkGetTestsBySuiteIdStub},
            '../../bullet': proxyquire('lib/static/components/bullet', {
                '../hooks/useLocalStorage': {default: useLocalStorageStub}
            })
        }).default;
    });

    describe('<Spin/>', () => {
        it('should show spinner if running', () => {
            const component = mkSuiteTitleComponent(CHECKED, TestStatus.RUNNING);

            expect(component.container.querySelector('.g-spin')).to.exist;
        });

        it('should not show spinner if not running', () => {
            const component = mkSuiteTitleComponent(CHECKED, TestStatus.IDLE);

            expect(component.container.querySelector('.g-spin')).to.not.exist;
        });
    });

    describe('<Checkbox/>', () => {
        it(`should exist if "showCheckboxes" is set`, () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);

            const component = mkSuiteTitleComponent();

            expect(component.queryByRole('checkbox')).to.exist;
        });

        it(`should not exist if "showCheckboxes" is not set`, () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([false]);

            const component = mkSuiteTitleComponent();

            expect(component.queryByRole('checkbox')).to.not.exist;
        });

        it('should not be checked', () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
            const component = mkSuiteTitleComponent(UNCHECKED);

            expect(component.queryByRole('checkbox').checked).to.equal(false);
        });

        it(`should be indeterminate`, () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
            const component = mkSuiteTitleComponent(INDETERMINATE);

            expect(component.queryByRole('checkbox').indeterminate).to.equal(true);
        });

        it(`should be checked`, () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
            const component = mkSuiteTitleComponent(CHECKED);

            expect(component.queryByRole('checkbox').checked).to.equal(true);
        });

        [CHECKED, UNCHECKED].forEach(checked => {
            it(`should call "toggleBrowserCheckbox" action with ${checked ? 'unchecked' : 'checked'} state on click`, async () => {
                const user = userEvent.setup();
                useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
                const component = mkSuiteTitleComponent(checked);

                await user.click(component.queryByRole('checkbox'));

                assert.calledOnceWith(actionsStub.toggleSuiteCheckbox, {
                    suiteId: 'suiteId',
                    checkStatus: checked ? UNCHECKED : CHECKED
                });
            });
        });
    });
});
