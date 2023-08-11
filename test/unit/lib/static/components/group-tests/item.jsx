import React from 'react';
import proxyquire from 'proxyquire';
import {defaultsDeep, set} from 'lodash';
import {Checkbox} from 'semantic-ui-react';
import {CHECKED, UNCHECKED, INDETERMINATE} from 'lib/constants/checked-statuses';
import {isCheckboxChecked} from 'lib/common-utils';
import {mkConnectedComponent} from 'test/unit/lib/static/components/utils';
import {mkStateTree} from 'test/unit/lib/static/state-utils';

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
        [true, false].forEach(show => {
            it(`should ${show ? '' : 'not '}exist if "showCheckboxes" is ${show ? '' : 'not '}set`, () => {
                useLocalStorageStub.withArgs('showCheckboxes', false).returns([show]);

                const component = mkGroupTestsItemComponent();

                assert.equal(component.find(Checkbox).exists(), show);
            });
        });

        it('should not be checked when no childs checked', () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
            const browserIds = ['b1'];
            const browsersStateById = {'b1': {shouldBeChecked: UNCHECKED}};
            const component = mkGroupTestsItemComponent(browserIds, browsersStateById);

            assert.equal(component.find(Checkbox).prop('checked'), UNCHECKED);
        });

        [
            {checked: INDETERMINATE, state: 'indeterminate', childChecked: 'some'},
            {checked: CHECKED, state: 'checked', childChecked: 'all'}
        ].forEach(({checked, state, childChecked}) => {
            it(`should be ${state} when ${childChecked} child checked`, () => {
                useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
                const browserIds = ['b1', 'b2'];
                const browsersStateById = {
                    'b1': {checkStatus: CHECKED},
                    'b2': {checkStatus: checked === CHECKED ? CHECKED : UNCHECKED}
                };
                const component = mkGroupTestsItemComponent(browserIds, browsersStateById);

                assert.equal(component.find(Checkbox).prop('checked'), isCheckboxChecked(checked));
            });
        });

        [CHECKED, UNCHECKED].forEach(checked => {
            it(`should call "toggleBrowserCheckbox" action with ${checked ? 'un' : ''}checked state on click`, () => {
                useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
                const browserIds = ['b1'];
                const browsersStateById = {'b1': {checkStatus: checked}};
                const component = mkGroupTestsItemComponent(browserIds, browsersStateById);

                component.find(Checkbox).simulate('click');

                assert.calledOnceWith(actionsStub.toggleGroupCheckbox, {
                    browserIds: ['b1'],
                    checkStatus: checked ? UNCHECKED : CHECKED
                });
            });
        });
    });
});
