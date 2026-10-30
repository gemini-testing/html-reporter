'use strict';

const http = require('http');
const {once} = require('events');
const proxyquire = require('proxyquire');
const {GuiApi} = require('lib/gui/api');
const {stubToolAdapter} = require('../../utils');

describe('GUI server HTTP integration', () => {
    const sandbox = sinon.createSandbox();
    let httpServer;
    let url;

    beforeEach(async () => {
        const toolAdapter = stubToolAdapter({reporterConfig: {
            path: 'lib/static',
            pluginsEnabled: true,
            plugins: [{name: 'test-plugin'}]
        }});
        toolAdapter.guiApi = GuiApi.create();
        toolAdapter.guiApi.gui.on(toolAdapter.guiApi.gui.events.SERVER_INIT, server => {
            server.get('/extension-query', (req, res) => res.json(req.query));
        });

        const {initPluginsRoutes} = proxyquire('lib/gui/routes/plugins', {
            '../../server-utils': {
                getPluginMiddleware: () => router => {
                    router.post('/echo/:id', (req, res) => res.json({id: req.params.id, body: req.body}));
                }
            }
        });

        const server = proxyquire('lib/gui/server', {
            './app': {App: {create: () => ({
                initialize: sandbox.stub().resolves(),
                getTestsDataToUpdateRefs: body => ({tests: body.tests})
            })}},
            './routes/plugins': {initPluginsRoutes},
            './listen-with-fallback': {listenWithFallback: async ({server}) => {
                httpServer = http.createServer(server);
                httpServer.listen(0, '127.0.0.1');
                await once(httpServer, 'listening');
                return {actualPort: httpServer.address().port, hostnameForUrl: '127.0.0.1'};
            }},
            'signal-exit': {onExit: sandbox.stub()},
            '../common-utils': {logger: {log: sandbox.stub()}}
        });

        ({url} = await server.start({toolAdapter, cli: {options: {}}}));
    });

    afterEach(async () => {
        if (httpServer) {
            await new Promise(resolve => httpServer.close(resolve));
            httpServer = null;
        }
        sandbox.restore();
    });

    it('should preserve nested query parameters in SERVER_INIT routes', async () => {
        const response = await fetch(`${url}/extension-query?filter[status]=fail`);

        assert.deepEqual(await response.json(), {filter: {status: 'fail'}});
    });

    it('should parse JSON before passing a request to plugin middleware', async () => {
        const response = await fetch(`${url}/plugin-routes/test-plugin/echo/42`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({value: 'screenshot'})
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {id: '42', body: {value: 'screenshot'}});
    });

    it('should pass JSON to the reference update API', async () => {
        const response = await fetch(`${url}/reference-data-to-update`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({tests: ['test-id']})
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), {tests: ['test-id']});
    });

    it('should serve report images', async () => {
        const response = await fetch(`${url}/icons/favicon.png`);

        assert.equal(response.status, 200);
        assert.equal(response.headers.get('content-type'), 'image/png');
    });
});
