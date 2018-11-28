'use strict';
var path = require('path');
var express = require('express');
var onExit = require('signal-exit');
var Promise = require('bluebird');
var bodyParser = require('body-parser');
var App = require('./app');
var MAX_REQUEST_SIZE = require('./constants/server').MAX_REQUEST_SIZE;
var logger = require('../server-utils').logger;
exports.start = function (_a) {
    var paths = _a.paths, tool = _a.tool, guiApi = _a.guiApi, configs = _a.configs;
    var options = configs.options, pluginConfig = configs.pluginConfig;
    var app = App.create(paths, tool, configs);
    var server = express();
    server.use(bodyParser.json({ limit: MAX_REQUEST_SIZE }));
    guiApi.initServer(server);
    server.use(express.static(path.join(__dirname, '../static'), { index: 'gui.html' }));
    server.use(express.static(process.cwd()));
    server.use('/images', express.static(path.join(process.cwd(), pluginConfig.path, 'images')));
    server.get('/', function (req, res) { return res.sendFile(path.join(__dirname, '../static', 'gui.html')); });
    server.get('/events', function (req, res) {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' });
        app.addClient(res);
    });
    server.get('/init', function (req, res) {
        res.json(app.data);
    });
    server.post('/run', function (req, res) {
        app.run(req.body)
            .catch(function (e) {
            console.error('Error while trying to run tests', e);
        });
        res.sendStatus(200);
    });
    server.post('/update-reference', function (req, res) {
        app.updateReferenceImage(req.body)
            .then(function (updatedTests) { return res.json(updatedTests); })
            .catch(function (_a) {
            var message = _a.message;
            return res.status(500).send({ error: message });
        });
    });
    onExit(function () {
        app.finalize();
        logger.log('server shutting down');
    });
    return app.initialize()
        .then(function () {
        return Promise.fromCallback(function (callback) {
            server.listen(options.port, options.hostname, callback);
        });
    })
        .then(function () { return ({ url: "http://" + options.hostname + ":" + options.port }); });
};
//# sourceMappingURL=server.js.map