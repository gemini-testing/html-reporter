import React from 'react';
import ErrorBoundary from 'lib/static/components/error-boundary';
import {render} from '@testing-library/react';

describe('<ErrorBoundary />', () => {
    const sandbox = sinon.sandbox.create();

    beforeEach(() => {
        sandbox.stub(console, 'error');
    });

    afterEach(() => sandbox.restore());

    it('should render child component if it is ok', () => {
        const component = render(<ErrorBoundary>ok text</ErrorBoundary>);
        const textContent = component.container.textContent;

        assert.equal(textContent, 'ok text');
    });

    it('should render nothing when child component fails and no fallback provided', () => {
        const FailingComponent = function() {
            throw new Error('Failed functional component.');
        };
        const component = render(
            <ErrorBoundary>
                <FailingComponent/>
            </ErrorBoundary>
        );
        const textContent = component.container.textContent;

        assert.equal(textContent, '');
    });

    it('should render fallback component on child component fail when specified', () => {
        const FailingComponent = function() {
            throw new Error('Failed functional component.');
        };
        const component = render(
            <ErrorBoundary fallback='fallback text'>
                <FailingComponent/>
                ignored text
            </ErrorBoundary>
        );
        const textContent = component.container.textContent;

        assert.equal(textContent, 'fallback text');
    });
});
