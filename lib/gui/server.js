'use strict';

const path = require('path');
const express = require('express');
const onExit = require('signal-exit');
const Promise = require('bluebird');
const bodyParser = require('body-parser');
const App = require('./app');
const {MAX_REQUEST_SIZE} = require('./constants/server');
const {logger} = require('../server-utils');

exports.start = ({paths, tool, guiApi, configs}) => {
    const {options, pluginConfig} = configs;
    const app = App.create(paths, tool, configs);
    const server = express();

    server.use(bodyParser.json({limit: MAX_REQUEST_SIZE}));

    guiApi.initServer(server);

    server.use(express.static(path.join(__dirname, '../static'), {index: 'gui.html'}));
    server.use(express.static(process.cwd()));
    server.use('/images', express.static(path.join(process.cwd(), pluginConfig.path, 'images')));

    server.get('/', (req, res) => res.sendFile(path.join(__dirname, '../static', 'gui.html')));

    server.get('/events', (req, res) => {
        res.writeHead(200, {'Content-Type': 'text/event-stream'});

        app.addClient(res);
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

    onExit(() => {
        app.finalize();
        logger.log('server shutting down');
    });

    return app.initialize()
        .then(() => {
            return Promise.fromCallback((callback) => {
                server.listen(options.port, options.hostname, callback);
            });
        })
        .then(() => ({url: `http://${options.hostname}:${options.port}`}));
};
