import React from 'react';
import proxyquire from 'proxyquire';

describe('<ShowCheckboxesInput />', () => {
    const sandbox = sinon.sandbox.create();

    let ShowCheckboxesInput;
    let useLocalStorageStub;

    beforeEach(() => {
        useLocalStorageStub = sandbox.stub();

        ShowCheckboxesInput = proxyquire('lib/static/components/controls/show-checkboxes-input', {
            '../../hooks/useLocalStorage': {default: useLocalStorageStub}
        }).default;
    });

    afterEach(() => sandbox.restore());

    [true, false].forEach(checked => {
        it(`should set checkbox to ${checked ? '' : 'un'}checked if showCheckboxes is ${checked ? '' : 'not '}set`, () => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([checked, () => {}]);

            const component = mount(<ShowCheckboxesInput />);

            assert.equal(component.find('input[type="checkbox"]').prop('checked'), checked);
        });

        it(`should call hook handler on ${checked ? '' : 'un'}checked click`, () => {
            const hookHandler = sandbox.stub();
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([checked, hookHandler]);
            const component = mount(<ShowCheckboxesInput />);

            component.find('input[type="checkbox"]').simulate('change');

            assert.calledOnceWith(hookHandler, !checked);
        });
    });
});
