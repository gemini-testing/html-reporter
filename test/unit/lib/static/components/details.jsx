import React from 'react';
import Details from 'lib/static/components/details';
import {render} from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('<Details />', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    it('should render details with passed title', () => {
        const props = {
            title: 'some-title',
            content: 'foo bar'
        };

        const component = render(<Details {...props} />);
        const title = component.container.querySelector('.details__summary').textContent;

        assert.equal(title, props.title);
    });

    it('should render only title if content is empty string', () => {
        const props = {
            title: 'some-title',
            content: ''
        };

        const component = render(<Details {...props} />);
        const text = component.container.querySelector('div.details').textContent;

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

        it('should call on click in title', async () => {
            const user = userEvent.setup();
            const component = render(<Details {...props} />);

            await user.click(component.container.querySelector('.details__summary'));

            assert.calledOnce(props.onClick);
        });

        it('should call with changed state on each call', async () => {
            const user = userEvent.setup();
            const component = render(<Details {...props} />);

            await user.click(component.container.querySelector('.details__summary'));
            await user.click(component.container.querySelector('.details__summary'));

            assert.calledWith(props.onClick.firstCall, {isOpened: true});
            assert.calledWith(props.onClick.secondCall, {isOpened: false});
        });
    });

    it('should render html, if specified', async () => {
        const user = userEvent.setup();
        const props = {
            title: 'some-title',
            content: '<pre><span>some content</span></pre>',
            asHtml: true
        };

        const component = render(<Details {...props} />);
        await user.click(component.container.querySelector('.details__summary'));

        const expectedHtml = '<div class="details__content">' + props.content + '</div>';
        assert.equal(component.container.querySelector('.details__content').parentNode.innerHTML, expectedHtml);
    });
});
