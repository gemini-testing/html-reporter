import makeDebug from 'debug';

import {getRecordModeEnumSafe} from '../server-utils';
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

    const RecordMode = getRecordModeEnumSafe();
    if (!RecordMode) {
        debug(`Skipping config overrides because RecordMode is not available`);
        return;
    }

    for (const browserId of config.browserIds) {
        const browserConfig = config.getBrowserConfig(browserId);

        const browserName = browserConfig.desiredCapabilities?.browserName;
        debug(`Applying config overrides for browser: ${browserName}`);

        if (browserName && /internet explorer/i.test(browserName)) {
            debug(`Skipping Internet Explorer`);
            continue;
        }

        browserConfig.record = {mode: RecordMode.On};
        browserConfig.saveHistoryMode = 'all';

        debug(`Overrides applied for browser: ${browserName}`);
    }
};
