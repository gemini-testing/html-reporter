import {TestplaneToolAdapter} from './testplane';
import {PlaywrightToolAdapter} from './playwright';

import {BaseToolAdapter, type BaseToolAdapterOptions} from './base';
import {ToolName} from '../../constants';

export const makeToolAdapter = async (opts: BaseToolAdapterOptions): Promise<BaseToolAdapter> => {
    switch (opts.toolName) {
        case ToolName.Testplane:
            return TestplaneToolAdapter.create(opts);
        case ToolName.Playwright:
            return PlaywrightToolAdapter.create(opts);
            // throw new Error('Playwright is not supported yet');
    }
};
