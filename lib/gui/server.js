'use strict';

const path = require('path');
const express = require('express');
const onExit = require('signal-exit');
const Promise = require('bluebird');
const bodyParser = require('body-parser');
const {INTERNAL_SERVER_ERROR, OK} = require('http-codes');

const App = require('./app');
const {MAX_REQUEST_SIZE, KEEP_ALIVE_TIMEOUT, HEADERS_TIMEOUT} = require('./constants/server');
const {initializeCustomGui, runCustomGuiAction} = require('../server-utils');
const {logger} = require('../common-utils');
const initPluginsRoutes = require('./routes/plugins');

exports.start = async ({paths, hermione, guiApi, configs}) => {
    const {options, pluginConfig} = configs;
    const app = App.create(paths, hermione, configs);
    const server = express();

    server.use(bodyParser.json({limit: MAX_REQUEST_SIZE}));

    await guiApi.initServer(server);

    // allow plugins to precede default server routes
    server.use(initPluginsRoutes(express.Router(), pluginConfig));

    server.use(express.static(path.join(__dirname, '../static'), {index: 'gui.html'}));
    server.use(express.static(path.join(process.cwd(), pluginConfig.path)));

    server.get('/', (req, res) => res.sendFile(path.join(__dirname, '../static', 'gui.html')));

    server.get('/events', (req, res) => {
        res.writeHead(OK, {'Content-Type': 'text/event-stream'});

        app.addClient(res);
    });

    server.set('json replacer', (key, val) => {
        return typeof val === 'function' ? val.toString() : val;
    });

    server.get('/init', async (req, res) => {
        try {
            await initializeCustomGui(hermione, pluginConfig);
        } catch (e) {
            app.data.customGuiError = {
                response: {
                    status: INTERNAL_SERVER_ERROR,
                    data: `Error while trying to initialize custom GUI: ${e.message}`
                }
            };
        }

        res.json(app.data);
    });

    server.post('/run', (req, res) => {
        try {
            // do not wait for completion so that response does not hang and browser does not restart it by timeout
            app.run(req.body);
            res.sendStatus(OK);
        } catch (e) {
            res.status(INTERNAL_SERVER_ERROR).send(`Error while trying to run tests: ${e.message}`);
        }
    });

    server.post('/run-custom-gui-action', async ({body: payload}, res) => {
        try {
            await runCustomGuiAction(hermione, pluginConfig, payload);
            res.sendStatus(OK);
        } catch (e) {
            res.status(INTERNAL_SERVER_ERROR).send(`Error while running custom gui action: ${e.message}`);
        }
    });

    server.post('/get-update-reference-data', (req, res) => {
        try {
            const data = app.getTestsDataToUpdateRefs(req.body);
            res.json(data);
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR).send({error: error.message});
        }
    });

    server.post('/update-reference', (req, res) => {
        app.updateReferenceImage(req.body)
            .then((updatedTests) => res.json(updatedTests))
            .catch(({message}) => res.status(INTERNAL_SERVER_ERROR).send({error: message}));
    });

    server.post('/get-find-equal-diffs-data', (req, res) => {
        try {
            const data = app.getImageDataToFindEqualDiffs(req.body);
            res.json(data);
        } catch (error) {
            res.status(INTERNAL_SERVER_ERROR).send({error: error.message});
        }
    });

    server.post('/find-equal-diffs', async (req, res) => {
        try {
            const result = await app.findEqualDiffs(req.body);
            res.json(result);
        } catch ({message}) {
            res.status(INTERNAL_SERVER_ERROR).send({error: message});
        }
    });

    onExit(() => {
        app.finalize();
        logger.log('server shutting down');
    });

    server.post('/stop', (req, res) => {
        try {
            // pass 0 to prevent terminating hermione process
            hermione.halt('Tests were stopped by the user', 0);
            res.sendStatus(OK);
        } catch (e) {
            res.status(INTERNAL_SERVER_ERROR).send(`Error while stopping tests: ${e.message}`);
        }
    });

    await app.initialize();

    const {port, hostname} = options;
    await Promise.fromCallback((callback) => {
        const httpServer = server.listen(port, hostname, callback);
        httpServer.keepAliveTimeout = KEEP_ALIVE_TIMEOUT;
        httpServer.headersTimeout = HEADERS_TIMEOUT;
    });

    const data = {url: `http://${hostname}:${port}`};

    await guiApi.serverReady(data);

    return data;
};
