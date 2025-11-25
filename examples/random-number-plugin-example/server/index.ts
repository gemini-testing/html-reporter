import type { Router, Request, Response } from "express";

/**
 * Server middleware for the random number plugin.
 * This function receives an Express router scoped to the plugin's endpoint prefix.
 *
 * Example: If the plugin is named "random-number-plugin-example",
 * requests to "/plugin-routes/random-number-plugin-example/random"
 * will be handled by the "/random" route below.
 */
export = function (pluginRouter: Router): void {
    pluginRouter.get("/random", (_req: Request, res: Response) => {
        // Generate a random number between 0 and 999
        const value = Math.floor(Math.random() * 1000);

        res.json({ value });
    });
};

