'use strict';

import React, {useEffect, useState} from 'react';
import {bindActionCreators} from 'redux';
import {isEmpty} from 'lodash';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import * as actions from '../../../modules/actions';
import Popup from '../../popup';
import {getFailedTests, getCheckedTests} from '../../../modules/selectors/tree';
import useLocalStorage from '../../../hooks/useLocalStorage';

import './index.styl';
import { Button, Select } from '@gravity-ui/uikit';

const RunMode = Object.freeze({
    ALL: 'All',
    FAILED: 'Failed',
    CHECKED: 'Checked'
});

const RunButton = ({actions, autoRun, isDisabled, isRunning, failedTests, checkedTests}) => {
    const [mode, setMode] = useLocalStorage('RunMode', RunMode.FAILED);
    const [showCheckboxes] = useLocalStorage('showCheckboxes', false);

    const btnClassName = classNames('btn', {'button_blink': isRunning});

    const shouldDisableFailed = isEmpty(failedTests);
    const shouldDisableChecked = !showCheckboxes || isEmpty(checkedTests);

    const selectAllTests = () => setMode(RunMode.ALL);
    const selectFailedTests = () => !shouldDisableFailed && setMode(RunMode.FAILED);
    const selectCheckedTests = () => !shouldDisableChecked && setMode(RunMode.CHECKED);

    const runAllTests = () => actions.runAllTests();
    const runFailedTests = () => actions.runFailedTests(failedTests);
    const runCheckedTests = () => actions.retrySuite(checkedTests);

    const handleRunClick = () => {
        const action = {
            [RunMode.ALL]: runAllTests,
            [RunMode.FAILED]: runFailedTests,
            [RunMode.CHECKED]: runCheckedTests
        }[mode];

        action();
    };

    const handleSelect = (values) => {
        if (values.length) {
            const action = {
                [RunMode.ALL]: selectAllTests,
                [RunMode.FAILED]: selectFailedTests,
                [RunMode.CHECKED]: selectCheckedTests
            }[values[0]];
    
            action();
        }
    }

    useEffect(() => {
        if (autoRun) {
            runAllTests();
        }
    }, []);

    useEffect(() => {
        selectCheckedTests();
    }, [shouldDisableChecked]);

    useEffect(() => {
        const shouldResetFailedMode = mode === RunMode.FAILED && shouldDisableFailed;
        const shouldResetCheckedMode = mode === RunMode.CHECKED && shouldDisableChecked;

        if (shouldResetFailedMode || shouldResetCheckedMode) {
            setMode(RunMode.ALL);
        }
    }, [shouldDisableFailed, shouldDisableChecked]);

    return (
        <div className='run-button'>
            <Button pin='round-clear' disabled={isDisabled} onClick={handleRunClick} view='action' className='run-button__button'>
                {isRunning ? 'Running' : 'Run'}
            </Button>
            <Select pin='clear-round' disabled={isDisabled} className='run-button__dropdown' value={[mode]} onUpdate={handleSelect}>
                <Select.Option value={RunMode.ALL}>
                {`${RunMode.ALL} Tests`}
                </Select.Option>
                <Select.Option value={RunMode.FAILED} disabled={shouldDisableFailed}>
                {`${RunMode.FAILED} Tests`}
                </Select.Option>
                <Select.Option value={RunMode.CHECKED} disabled={shouldDisableChecked}>
                {`${RunMode.CHECKED} Tests`}
                </Select.Option>
            </Select>
        </div>
    );
};

RunButton.propTypes = {
    // from store
    autoRun: PropTypes.bool.isRequired,
    isDisabled: PropTypes.bool,
    isRunning: PropTypes.bool,
    failedTests: PropTypes.arrayOf(PropTypes.shape({
        testName: PropTypes.string,
        browserName: PropTypes.string
    })).isRequired,
    checkedTests: PropTypes.arrayOf(PropTypes.shape({
        testName: PropTypes.string,
        browserName: PropTypes.string
    })).isRequired
};

export default connect(
    (state) => {
        const autoRun = state.autoRun;
        const allRootSuiteIds = state.tree.suites.allRootIds;
        const processing = state.processing;
        const isDisabled = !allRootSuiteIds.length || processing;
        const isRunning = state.running;
        const failedTests = getFailedTests(state);
        const checkedTests = getCheckedTests(state);

        return {autoRun, isDisabled, isRunning, failedTests, checkedTests};
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(RunButton);
