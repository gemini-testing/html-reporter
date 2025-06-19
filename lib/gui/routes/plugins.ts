import {Router} from 'express';
import {INTERNAL_SERVER_ERROR, BAD_REQUEST} from 'http-codes';

import {
    isUnexpectedPlugin,
    getPluginClientScriptPath,
    getPluginMiddleware,
    forEachPlugin,
    logError
} from '../../server-utils';
import {ReporterConfig} from '../../types';
import {getPluginMiddlewareRoute} from '../../static/modules/utils/pluginMiddlewareRoute';

export const initPluginsRoutes = (router: Router, pluginConfig: ReporterConfig): Router => {
    if (!pluginConfig.pluginsEnabled) {
        return router;
    }

    router.get<{pluginName: string}>(`/plugins/:pluginName/plugin.js`, (req, res) => {
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

            router.use(getPluginMiddlewareRoute(pluginName), pluginRouter);
        } catch (err: unknown) {
            logError(err as Error);
        }
    });

    router.use<{pluginName: string}>('/plugin-routes/:pluginName', (req, res) => {
        res.status(BAD_REQUEST).send({error: `No middleware is registered for "${req.params.pluginName}".`});
    });

    return router;
};
