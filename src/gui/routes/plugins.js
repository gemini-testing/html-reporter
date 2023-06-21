'use strict';

const {Router} = require('express');
const {INTERNAL_SERVER_ERROR, BAD_REQUEST} = require('http-codes');

const {
    isUnexpectedPlugin,
    getPluginClientScriptPath,
    getPluginMiddleware,
    forEachPlugin,
    logError
} = require('../../server-utils');

module.exports = function(router, pluginConfig) {
    if (!pluginConfig.pluginsEnabled) {
        return router;
    }

    router.get(`/plugins/:pluginName/plugin.js`, (req, res) => {
        if (isUnexpectedPlugin(pluginConfig.plugins, req.params.pluginName)) {
            res.status(BAD_REQUEST).send({error: `Unexpected plugin "${req.params.pluginName}" requested.`});
            return;
        }

        const pluginClientScriptPath = getPluginClientScriptPath(req.params.pluginName);
        if (!pluginClientScriptPath) {
            res.status(INTERNAL_SERVER_ERROR).send('Plugin client script not found.');
            return;
        }

        res.sendFile(pluginClientScriptPath);
    });

    forEachPlugin(pluginConfig.plugins, pluginName => {
        const initPluginMiddleware = getPluginMiddleware(pluginName);
        if (!initPluginMiddleware) {
            return;
        }

        try {
            const pluginRouter = Router();
            initPluginMiddleware(pluginRouter);

            router.use(`/plugin-routes/${pluginName}`, pluginRouter);
        } catch (err) {
            logError(err);
        }
    });

    router.use('/plugin-routes/:pluginName', (req, res) => {
        res.status(BAD_REQUEST).send({error: `No middleware is registered for "${req.params.pluginName}".`});
    });

    return router;
};
