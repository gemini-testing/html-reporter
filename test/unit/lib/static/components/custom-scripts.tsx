import {expect} from 'chai';
import React from 'react';
import {CustomScripts} from '@/static/new-ui/components/CustomScripts';
import {render} from '@testing-library/react';

describe('<CustomScripts />', () => {
    it('should render component for scripts', () => {
        const scripts = [function(): void {}];

        const component = render(<CustomScripts scripts={scripts} />);
        expect(component.container.querySelector('.custom-scripts')).to.exist;
    });

    it('should not render component if no scripts to inject', () => {
        const component = render(<CustomScripts scripts={[]} />);
        expect(component.container.querySelector('.custom-scripts')).to.not.exist;
    });

    it('should wrap function with IIFE', () => {
        const scripts = [function foo(): void {}];

        const component = render(<CustomScripts scripts={scripts} />);
        const script = component.container.textContent;

        assert.equal(script, '(function foo() {})();');
    });

    it('should split each function with ";"', () => {
        const scripts = [
            function foo(): void {},
            function bar(): void {}
        ];

        const component = render(<CustomScripts scripts={scripts} />);
        const script = component.container.textContent;

        assert.equal(script, '(function foo() {})();(function bar() {})();');
    });
});
