import type sinon from 'sinon';
import {assert as chaiAssert} from 'chai';
import {mount as enzymeMount} from 'enzyme';

declare global {
    const assert: typeof chaiAssert & sinon.SinonAssert & {
        calledOnceWith<TArgs extends any[]>(spyOrSpyCall: sinon.SinonSpy | sinon.SinonSpyCall, ...args: TArgs): void;
    };
    const mount: typeof enzymeMount;
}
