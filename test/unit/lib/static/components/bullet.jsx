import {render} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {expect} from 'chai';
import proxyquire from 'proxyquire';
import React from 'react';

describe('<Bullet />', () => {
    const sandbox = sinon.sandbox.create();
    let Bullet, useLocalStorageStub;

    beforeEach(() => {
        useLocalStorageStub = sandbox.stub();
        Bullet = proxyquire('lib/static/components/bullet', {
            '../hooks/useLocalStorage': {default: useLocalStorageStub}
        }).default;
    });

    afterEach(() => sandbox.restore());

    it('should render simple bullet if checkboxes are disabled', () => {
        useLocalStorageStub.withArgs('showCheckboxes', false).returns([false]);

        const component = render(<Bullet bulletClassName='bullet_type-simple' />);

        expect(component.getByTestId('bullet-icon')).to.exist;
    });

    it('should render checkbox bullet if checkboxes are enabled', () => {
        useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);

        const component = render(<Bullet bulletClassName='bullet_type-simple' />);

        expect(component.getByRole('checkbox')).to.exist;
    });

    it('should call "onClick" callback', async () => {
        useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);

        const user = userEvent.setup();
        const onClickStub = sandbox.stub();
        const component = render(<Bullet onClick={onClickStub} />);

        await user.click(component.getByRole('checkbox'));

        assert.calledOnce(onClickStub);
    });
});
