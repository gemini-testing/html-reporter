import React from 'react';
import Details from 'src/static/components/details';

describe('<Details />', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    it('should render details with passed title', () => {
        const props = {
            title: 'some-title',
            content: 'foo bar'
        };

        const component = mount(<Details {...props} />);
        const title = component.find('.details__summary').text();

        assert.equal(title, props.title);
    });

    it('should render only title if content is empty string', () => {
        const props = {
            title: 'some-title',
            content: ''
        };

        const component = mount(<Details {...props} />);
        const text = component.find('div.details').text();

        assert.equal(text, 'some-title');
    });

    describe('"onClick" handler', () => {
        let props;

        beforeEach(() => {
            props = {
                title: 'some-title',
                content: 'foo bar',
                onClick: sinon.stub()
            };
        });

        it('should call on click in title', () => {
            const component = mount(<Details {...props} />);

            component.find('.details__summary').simulate('click');

            assert.calledOnce(props.onClick);
        });

        it('should call with changed state on each call', () => {
            const component = mount(<Details {...props} />);

            component.find('.details__summary')
                .simulate('click')
                .simulate('click');

            assert.calledWith(props.onClick.firstCall, {isOpened: true});
            assert.calledWith(props.onClick.secondCall, {isOpened: false});
        });
    });
});
