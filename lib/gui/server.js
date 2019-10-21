'use strict';

const path = require('path');
const express = require('express');
const onExit = require('signal-exit');
const Promise = require('bluebird');
const bodyParser = require('body-parser');
const App = require('./app');
const {MAX_REQUEST_SIZE, KEEP_ALIVE_TIMEOUT, HEADERS_TIMEOUT} = require('./constants/server');
const {IMAGES_PATH, ERROR_DETAILS_PATH} = require('../constants/paths');
const {logger} = require('../server-utils');

exports.start = ({paths, hermione, guiApi, configs}) => {
    const {options, pluginConfig} = configs;
    const app = App.create(paths, hermione, configs);
    const server = express();

    server.use(bodyParser.json({limit: MAX_REQUEST_SIZE}));

    guiApi.initServer(server);

    server.use(express.static(path.join(__dirname, '../static'), {index: 'gui.html'}));
    server.use(express.static(process.cwd()));
    server.use(`/${IMAGES_PATH}`, express.static(path.join(process.cwd(), pluginConfig.path, IMAGES_PATH)));
    server.use(`/${ERROR_DETAILS_PATH}`, express.static(path.join(process.cwd(), pluginConfig.path, ERROR_DETAILS_PATH)));

    server.get('/', (req, res) => res.sendFile(path.join(__dirname, '../static', 'gui.html')));

    server.get('/events', (req, res) => {
        res.writeHead(200, {'Content-Type': 'text/event-stream'});

        app.addClient(res);
    });

    server.set('json replacer', (key, val) => {
        return typeof val === 'function' ? val.toString() : val;
    });

    server.get('/init', (req, res) => {
        res.json(app.data);
    });

    server.post('/run', (req, res) => {
        app.run(req.body)
            .catch((e) => {
                console.error('Error while trying to run tests', e);
            });

        res.sendStatus(200);
    });

    server.post('/update-reference', (req, res) => {
        app.updateReferenceImage(req.body)
            .then((updatedTests) => res.json(updatedTests))
            .catch(({message}) => res.status(500).send({error: message}));
    });

    server.post('/find-equal-diffs', async (req, res) => {
        try {
            const result = await app.findEqualDiffs(req.body);
            res.json(result);
        } catch ({message}) {
            res.status(500).send({error: message});
        }
    });

    onExit(() => {
        app.finalize();
        logger.log('server shutting down');
    });

    return app.initialize(paths, hermione, configs)
        .then(() => {
            return Promise.fromCallback((callback) => {
                const httpServer = server.listen(options.port, options.hostname, callback);
                httpServer.keepAliveTimeout = KEEP_ALIVE_TIMEOUT;
                httpServer.headersTimeout = HEADERS_TIMEOUT;
            });
        })
        .then(() => {
            const data = {url: `http://${options.hostname}:${options.port}`};
            guiApi.serverReady(data);
            return data;
        });
};
