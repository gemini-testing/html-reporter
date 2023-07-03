import React from 'react';
import CustomScripts from 'lib/static/components/custom-scripts';

describe('<CustomScripts />', () => {
    it('should render component for scripts', () => {
        const props = {
            scripts: [function() {}]
        };

        const component = mount(<CustomScripts {...props} />);
        const node = component.find('.custom-scripts');

        assert.lengthOf(node, 1);
    });

    it('should not render component if no scripts to inject', () => {
        const props = {
            scripts: []
        };

        const component = mount(<CustomScripts {...props} />);
        const node = component.find('.custom-scripts');

        assert.lengthOf(node, 0);
    });

    it('should wrap function with IIFE', () => {
        const props = {
            scripts: [function foo() {}]
        };

        const component = mount(<CustomScripts {...props} />);
        const script = component.text();

        assert.equal(script, '(function foo() {})();');
    });

    it('should split each function with ";"', () => {
        const props = {
            scripts: [
                function foo() {},
                function bar() {}
            ]
        };

        const component = mount(<CustomScripts {...props} />);
        const script = component.text();

        assert.equal(script, '(function foo() {})();(function bar() {})();');
    });
});
