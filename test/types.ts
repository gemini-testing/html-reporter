import {assert as chaiAssert} from 'chai';
import {mount as enzymeMount} from 'enzyme';

declare global {
    const assert: typeof chaiAssert;
    const mount: typeof enzymeMount;
}
