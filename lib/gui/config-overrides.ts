import makeDebug from 'debug';

import {getTimeTravelModeEnumSafe} from '../server-utils';
import {TestplaneConfigAdapter} from '../adapters/config/testplane';
import {ToolName} from '../constants';

const debug = makeDebug('html-reporter:testplane');

export const overrideTestplaneConfig = (toolName: ToolName, config: TestplaneConfigAdapter): void => {
    if (toolName !== ToolName.Testplane) {
        debug(`Skipping config overrides because toolName is not Testplane`);
        return;
    }

    if (process.env.HTML_REPORTER_NO_CONFIG_OVERRIDES) {
        debug(`Skipping config overrides because HTML_REPORTER_NO_CONFIG_OVERRIDES is set`);
        return;
    }

    const TimeTravelMode = getTimeTravelModeEnumSafe();
    if (!TimeTravelMode) {
        debug(`Skipping config overrides because TimeTravelMode is not available`);
        return;
    }

    const skipBrowsers = ((): Set<string> => {
        const envValue = process.env.HTML_REPORTER_NO_CONFIG_OVERRIDES_FOR_BROWSERS;
        if (!envValue) {
            return new Set<string>();
        }

        try {
            return new Set(JSON.parse(envValue).map((s: string) => s.trim().toLowerCase()));
        } catch {
            return new Set(envValue.split(',').map(s => s.trim().toLowerCase()));
        }
    })();

    for (const browserId of config.browserIds) {
        const browserConfig = config.getBrowserConfig(browserId);
        const browserName = browserConfig.desiredCapabilities?.browserName?.toLowerCase();

        debug(`Applying config overrides for browser: ${browserName}`);

        if (browserName === 'internet explorer') {
            debug(`Skipping Internet Explorer`);
            continue;
        }

        if (browserName && skipBrowsers.has(browserName) || skipBrowsers.has(browserId.toLowerCase())) {
            debug(`Skipping overrides for browser: ${browserName} (browserId: ${browserId}) as it's in skip list`);
            continue;
        }

        browserConfig.timeTravel = {mode: TimeTravelMode.On};
        browserConfig.saveHistoryMode = 'all';

        debug(`Overrides applied for browser: ${browserName}`);
    }
};
