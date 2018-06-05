import React from 'react';
import ControlButtons from 'lib/static/components/controls/gui-controls';
import RunButton from 'lib/static/components/controls/run-button';
import {mkStore, mkConnectedComponent} from '../utils';

describe('<ControlButtons />', () => {
    describe('Run button', () => {
        it('should be disabled if no suites to run', () => {
            const store = mkStore({suiteIds: {all: []}});
            const component = mkConnectedComponent(<ControlButtons />, store);

            assert.equal(component.find(RunButton).prop('isDisabled'), true);
        });
    });
});
