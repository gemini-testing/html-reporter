'use strict';

const path = require('path');
const express = require('express');
const onExit = require('signal-exit');
const Promise = require('bluebird');
const App = require('./app');

exports.start = (paths, tool, configs) => {
    const app = new App(paths, tool, configs);
    const server = express();

    server.use(express.static(path.join(__dirname, '../static'), {index: 'gui.html'}));
    server.use('/images', express.static(path.join(process.cwd(), configs.pluginConfig.path, 'images')));

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

    onExit(() => console.log('server shutting down'));

    const {options} = configs;
    return app.initialize()
        .then(() => {
            return Promise.fromCallback((callback) => {
                server.listen(options.port, options.hostname, callback);
            });
        })
        .then(() => ({url: `http://${options.hostname}:${options.port}`}));
};
