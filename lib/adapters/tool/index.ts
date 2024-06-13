import {TestplaneToolAdapter} from './testplane';
import {BaseToolAdapter, type BaseToolAdapterOptions} from './base';
import {ToolName} from '../../constants';

export const makeToolAdapter = (opts: BaseToolAdapterOptions): BaseToolAdapter => {
    switch (opts.toolName) {
        case ToolName.Testplane:
            return TestplaneToolAdapter.create(opts);
        case ToolName.Playwright:
            throw new Error('Playwright is not supported yet');
    }
};
