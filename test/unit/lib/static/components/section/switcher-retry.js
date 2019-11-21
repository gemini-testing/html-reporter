import React from 'react';
import SwitcherRetry from 'lib/static/components/section/switcher-retry';
import {FAIL, ERROR, UPDATED, SUCCESS} from 'lib/constants/test-statuses';
import {mkTestResult_} from '../utils';

describe('SwitcherRetry component', () => {
    const mkSwitcherRetry = (props = {}) => {
        props = {testResults: [], onChange: () => {}, ...props};

        return mount(<SwitcherRetry testResults={props.testResults} onChange={props.onChange} />);
    };

    it('should not render any tab switcher button if test did not retry', () => {
        const testResults = [mkTestResult_({status: FAIL})];

        const component = mkSwitcherRetry({testResults});

        assert.lengthOf(component.find('.tab-switcher__button'), 0);
    });

    it('should create tab switcher buttons with status of each test result', () => {
        const testResults = [
            mkTestResult_({status: FAIL}), mkTestResult_({status: ERROR}),
            mkTestResult_({status: UPDATED}), mkTestResult_({status: SUCCESS})
        ];

        const component = mkSwitcherRetry({testResults});

        assert.lengthOf(component.find('.tab-switcher__button'), 4);
        assert.lengthOf(component.find(`.tab-switcher__button_status_${FAIL}`), 1);
        assert.lengthOf(component.find(`.tab-switcher__button_status_${ERROR}`), 1);
        assert.lengthOf(component.find(`.tab-switcher__button_status_${UPDATED}`), 1);
        assert.lengthOf(component.find(`.tab-switcher__button_status_${SUCCESS}`), 1);
    });
});
