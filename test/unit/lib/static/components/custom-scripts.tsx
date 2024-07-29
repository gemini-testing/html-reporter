import {expect} from 'chai';
import React from 'react';
import CustomScripts from 'lib/static/components/custom-scripts';
import {render} from '@testing-library/react';

describe('<CustomScripts />', () => {
    it('should render component for scripts', () => {
        const props = {
            scripts: [function(): void {}]
        };

        const component = render(<CustomScripts {...props} />);
        expect(component.container.querySelector('.custom-scripts')).to.exist;
    });

    it('should not render component if no scripts to inject', () => {
        const props = {
            scripts: []
        };

        const component = render(<CustomScripts {...props} />);
        expect(component.container.querySelector('.custom-scripts')).to.not.exist;
    });

    it('should wrap function with IIFE', () => {
        const props = {
            scripts: [function foo(): void {}]
        };

        const component = render(<CustomScripts {...props} />);
        const script = component.container.textContent;

        assert.equal(script, '(function foo() {})();');
    });

    it('should split each function with ";"', () => {
        const props = {
            scripts: [
                function foo(): void {},
                function bar(): void {}
            ]
        };

        const component = render(<CustomScripts {...props} />);
        const script = component.container.textContent;

        assert.equal(script, '(function foo() {})();(function bar() {})();');
    });
});
