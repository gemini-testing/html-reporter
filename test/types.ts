import type sinon from 'sinon';
import {assert as chaiAssert} from 'chai';

declare global {
    const assert: typeof chaiAssert & sinon.SinonAssert & {
        calledOnceWith<TArgs extends any[]>(spyOrSpyCall: sinon.SinonSpy | sinon.SinonSpyCall, ...args: TArgs): void;
    };
}
