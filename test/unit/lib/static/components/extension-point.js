import React from 'react';
import proxyquire from 'proxyquire';

describe('<ExtensionPoint />', () => {
    const sandbox = sinon.sandbox.create();
    let ExtensionPoint;

    function BeforeComponent() {
        return 'Before';
    }

    function AfterComponent() {
        return 'After';
    }

    // eslint-disable-next-line react/prop-types
    function WrapComponent({children}) {
        return <div>{children}</div>;
    }

    beforeEach(() => {
        const pluginsGetStub = sandbox.stub().callsFake((pluginName, component) => ({
            BeforeComponent,
            AfterComponent,
            WrapComponent
        }[component]));

        const pluginsStub = {
            get: pluginsGetStub,
            getLoadedConfigs: () => [
                {name: 'plugin', component: 'WrapComponent', point: 'example', position: 'wrap'},
                {name: 'plugin', component: 'BeforeComponent', point: 'example', position: 'before'},
                {name: 'plugin', component: 'AfterComponent', point: 'example', position: 'after'},
                {name: 'plugin', component: 'WrapComponent', point: 'example', position: 'wrap'}
            ]
        };
        ExtensionPoint = proxyquire('lib/static/components/extension-point', {
            '../modules/plugins': pluginsStub
        }).default;
    });

    afterEach(() => sandbox.restore());

    it('should skip plugin components composition when extension point does not match', () => {
        const component = mount(
            <ExtensionPoint name='no match example'>
                child
            </ExtensionPoint>
        );

        assert.strictEqual(component.first().html(), 'child');
    });

    it('should render combined plugin components on matching extension point', () => {
        const component = mount(
            <ExtensionPoint name='example'>
                child
            </ExtensionPoint>
        );

        assert.strictEqual(component.first().html(), '<div>Before<div>child</div>After</div>');
    });
});
