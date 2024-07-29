import React from 'react';
import proxyquire from 'proxyquire';
import {render} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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

            const component = render(<ShowCheckboxesInput />);

            assert.equal(component.getByRole('switch').checked, checked);
        });

        it(`should call hook handler on ${checked ? '' : 'un'}checked click`, async () => {
            const user = userEvent.setup();
            const hookHandler = sandbox.stub();
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([checked, hookHandler]);
            const component = render(<ShowCheckboxesInput />);

            await user.click(component.getByRole('switch'));

            assert.calledOnceWith(hookHandler, !checked);
        });
    });
});
