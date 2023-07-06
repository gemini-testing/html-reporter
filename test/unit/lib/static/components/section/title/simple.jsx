import React from 'react';
import proxyquire from 'proxyquire';
import {defaultsDeep, set} from 'lodash';
import {Checkbox} from 'semantic-ui-react';
import {mkConnectedComponent} from 'test/unit/lib/static/components/utils';
import {mkStateTree} from 'test/unit/lib/static/state-utils';
import {CHECKED, UNCHECKED, INDETERMINATE} from 'lib/constants/checked-statuses';

describe('<SuiteTitle/>', () => {
    const sandbox = sinon.sandbox.create();
    let SuiteTitle, actionsStub, useLocalStorageStub, mkGetTestsBySuiteIdStub;

    const mkSuiteTitleComponent = (checkStatus) => {
        const props = {
            name: 'suiteName',
            suiteId: 'suiteId',
            handler: sandbox.stub()
        };
        const initialState = defaultsDeep(
            set({}, 'tree.suites.stateById.suiteId.checkStatus', checkStatus),
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

    describe('<Checkbox/>', () => {
        [CHECKED, UNCHECKED].forEach(show => {
            it(`should ${show ? '' : 'not '}exist if "showCheckboxes" is ${show ? '' : 'not '}set`, () => {
                useLocalStorageStub.withArgs('showCheckboxes', false).returns([show]);

                const component = mkSuiteTitleComponent();

                assert.equal(component.find(Checkbox).exists(), +show);
            });
        });

        it('should not be checked', () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
            const component = mkSuiteTitleComponent(UNCHECKED);

            assert.equal(component.find(Checkbox).prop('checked'), UNCHECKED);
        });

        it(`should be indeterminate`, () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
            const component = mkSuiteTitleComponent(INDETERMINATE);

            assert.isTrue(component.find(Checkbox).prop('indeterminate'));
        });

        it(`should be checked`, () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
            const component = mkSuiteTitleComponent(CHECKED);

            assert.equal(component.find(Checkbox).prop('checked'), CHECKED);
        });

        [CHECKED, UNCHECKED].forEach(checked => {
            it(`should call "toggleBrowserCheckbox" action with ${checked ? 'unchecked' : 'checked'} state on click`, () => {
                useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
                const component = mkSuiteTitleComponent(checked);

                component.find(Checkbox).simulate('click');

                assert.calledOnceWith(actionsStub.toggleSuiteCheckbox, {
                    suiteId: 'suiteId',
                    checkStatus: checked ? UNCHECKED : CHECKED
                });
            });
        });
    });
});
