import React from 'react';
import proxyquire from 'proxyquire';
import {CHECKED, UNCHECKED, INDETERMINATE} from 'lib/constants/checked-statuses';

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

        const component = mount(<Bullet bulletClassName='bullet_type-simple' />);

        assert.isTrue(component.find('.bullet_type-simple').exists());
    });

    it('should render checkbox bullet if checkboxes are enabled', () => {
        useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);

        const component = mount(<Bullet bulletClassName='bullet_type-simple' />);

        assert.isTrue(component.find('.bullet_type-checkbox').exists());
    });

    describe('<Checkbox/>', () => {
        beforeEach(() => {
            useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
        });

        it('should be "checked" if status is CHECKED', () => {
            const component = mount(<Bullet status={CHECKED} />);

            assert.isTrue(component.find('.checkbox.checked').exists());
        });

        it('should be "indeterminate" if status is INDETERMINATE', () => {
            const component = mount(<Bullet status={INDETERMINATE} />);

            assert.isTrue(component.find('.checkbox.indeterminate').exists());
        });

        it('should be "unchecked" if status is UNCHECKED', () => {
            const component = mount(<Bullet status={UNCHECKED} />);

            assert.isTrue(component.find('.checkbox').exists());
            assert.isFalse(component.find('.checkbox').hasClass('checked'));
            assert.isFalse(component.find('.checkbox').hasClass('indeterminate'));
        });

        it('should call "onClick" callback', () => {
            const onClickStub = sandbox.stub();
            const component = mount(<Bullet onClick={onClickStub} />);

            component.find('.checkbox').simulate('click');

            assert.calledOnce(onClickStub);
        });
    });
});
