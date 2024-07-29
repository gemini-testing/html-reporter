import {cleanup, configure} from '@testing-library/react';

export const mochaHooks = {
    beforeAll() {
        configure({testIdAttribute: 'data-qa'});
    },
    afterEach() {
        cleanup();
    }
};
