'use strict';

const proxyquire = require('proxyquire');

describe('src/gui/routes/plugins', () => {
    const sandbox = sinon.createSandbox();
    let initPluginRoutes;
    let routerStub;
    let pluginsRouterStubs;
    let getPluginMiddlewareStub;

    const mkRouter = () => {
        return {
            use: sandbox.stub(),
            get: sandbox.stub()
        };
    };

    beforeEach(() => {
        routerStub = mkRouter();
        pluginsRouterStubs = [];

        getPluginMiddlewareStub = sandbox.stub();
        initPluginRoutes = proxyquire('src/gui/routes/plugins', {
            '../../server-utils': {
                getPluginMiddleware: getPluginMiddlewareStub
            },
            'express': {
                Router: () => {
                    const router = mkRouter();
                    pluginsRouterStubs.push(router);
                    return router;
                }
            }
        });
    });

    afterEach(() => sandbox.restore());

    it('should not register any routes if plugins are disabled', () => {
        initPluginRoutes(routerStub, {plugins: [], pluginsEnabled: false});

        assert.notCalled(routerStub.get);
        assert.notCalled(routerStub.use);
    });

    it('should register several default routes when plugins config is empty', () => {
        initPluginRoutes(routerStub, {plugins: [], pluginsEnabled: true});

        assert.calledWithExactly(routerStub.use, '/plugin-routes/:pluginName', sinon.match.func);
        assert.calledWithExactly(routerStub.get, '/plugins/:pluginName/plugin.js', sinon.match.func);
    });

    it('should init and register all existing plugins', () => {
        const initMiddlewareStub = sandbox.stub();
        getPluginMiddlewareStub.callsFake((name) => name === 'test-plugin-2' ? null : initMiddlewareStub);

        initPluginRoutes(routerStub, {
            plugins: [
                {name: 'test-plugin-1'},
                {name: 'test-plugin-2'},
                {name: 'test-plugin-3'}
            ],
            pluginsEnabled: true
        });

        const [router1, router3] = pluginsRouterStubs;

        assert.calledTwice(initMiddlewareStub);
        assert.calledWithExactly(initMiddlewareStub, router1);
        assert.calledWithExactly(initMiddlewareStub, router3);

        assert.calledThrice(routerStub.use);
        assert.calledWithExactly(routerStub.use, '/plugin-routes/test-plugin-1', router1);
        assert.calledWithExactly(routerStub.use, '/plugin-routes/test-plugin-3', router3);
        assert.calledWithExactly(routerStub.use, '/plugin-routes/:pluginName', sinon.match.func);
        assert.calledWithExactly(routerStub.get, '/plugins/:pluginName/plugin.js', sinon.match.func);
    });
});
