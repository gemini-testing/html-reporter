import {expect} from 'chai';
import React from 'react';
import proxyquire from 'proxyquire';
import {defaultsDeep, set} from 'lodash';
import {CHECKED, UNCHECKED} from 'lib/constants/checked-statuses';
import {mkConnectedComponent} from 'test/unit/lib/static/components/utils';
import {mkStateTree} from 'test/unit/lib/static/state-utils';
import userEvent from '@testing-library/user-event';

describe('<GroupTestsItem/>', () => {
    const sandbox = sinon.sandbox.create();
    let GroupTestsItem, actionsStub, useLocalStorageStub, SuitesStub;

    const mkGroupTestsItemComponent = (browserIds = [], browsersStateById = {}) => {
        const props = {
            isActive: false,
            onClick: sandbox.stub(),
            group: {browserIds}
        };
        const initialState = defaultsDeep(
            set({}, 'tree.browsers.stateById', browsersStateById),
            set({}, 'tree', mkStateTree)
        );

        return mkConnectedComponent(<GroupTestsItem {...props} />, {initialState});
    };

    beforeEach(() => {
        actionsStub = {toggleGroupCheckbox: sandbox.stub().returns({type: 'some-type'})};
        useLocalStorageStub = sandbox.stub().returns([false]);
        SuitesStub = sandbox.stub().returns(null);

        GroupTestsItem = proxyquire('lib/static/components/group-tests/item', {
            '../../modules/actions': actionsStub,
            './suites': {default: SuitesStub},
            '../bullet': proxyquire('lib/static/components/bullet', {
                '../hooks/useLocalStorage': {default: useLocalStorageStub}
            })
        }).default;
    });

    describe('<Checkbox/>', () => {
        it(`should exist if "showCheckboxes" is set`, () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);

            const component = mkGroupTestsItemComponent();

            expect(component.queryByRole('checkbox')).to.exist;
        });

        it(`should not exist if "showCheckboxes" is not set`, () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([false]);

            const component = mkGroupTestsItemComponent();

            expect(component.queryByRole('checkbox')).to.not.exist;
        });

        it('should not be checked when no children are checked', () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
            const browserIds = ['b1'];
            const browsersStateById = {'b1': {shouldBeChecked: UNCHECKED}};
            const component = mkGroupTestsItemComponent(browserIds, browsersStateById);

            assert.isFalse(component.getByRole('checkbox').checked);
        });

        it(`should be indeterminate when some children are checked`, () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
            const browserIds = ['b1', 'b2'];
            const browsersStateById = {
                'b1': {checkStatus: CHECKED},
                'b2': {checkStatus: UNCHECKED}
            };
            const component = mkGroupTestsItemComponent(browserIds, browsersStateById);

            assert.isTrue(component.getByRole('checkbox').indeterminate);
        });

        it(`should be checked when all children are checked`, () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
            const browserIds = ['b1', 'b2'];
            const browsersStateById = {
                'b1': {checkStatus: CHECKED},
                'b2': {checkStatus: CHECKED}
            };
            const component = mkGroupTestsItemComponent(browserIds, browsersStateById);

            assert.isTrue(component.getByRole('checkbox').checked);
        });

        [CHECKED, UNCHECKED].forEach(checked => {
            it(`should call "toggleBrowserCheckbox" action with ${checked ? 'un' : ''}checked state on click`, async () => {
                const user = userEvent.setup();
                useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
                const browserIds = ['b1'];
                const browsersStateById = {'b1': {checkStatus: checked}};
                const component = mkGroupTestsItemComponent(browserIds, browsersStateById);

                await user.click(component.getByRole('checkbox'));

                assert.calledOnceWith(actionsStub.toggleGroupCheckbox, {
                    browserIds: ['b1'],
                    checkStatus: checked ? UNCHECKED : CHECKED
                });
            });
        });
    });
});
