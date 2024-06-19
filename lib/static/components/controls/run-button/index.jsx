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
            <button disabled={isDisabled} onClick={handleRunClick} className={btnClassName}>
                {isRunning ? 'Running' : `Run ${mode.toLowerCase()} tests`}
            </button>
            {!isDisabled && <Popup
                action='hover'
                hideOnClick={true}
                target={<div className='run-button__dropdown' />}
            >
                <ul className='run-mode'>
                    <li
                        className='run-mode__item'
                        onClick={selectAllTests}
                    >
                        {RunMode.ALL}
                    </li>
                    <li
                        className={classNames('run-mode__item', {'run-mode__item_disabled': shouldDisableFailed})}
                        onClick={selectFailedTests}>{RunMode.FAILED}
                    </li>
                    <li
                        className={classNames('run-mode__item', {'run-mode__item_disabled': shouldDisableChecked})}
                        onClick={selectCheckedTests}
                    >
                        {RunMode.CHECKED}
                    </li>
                </ul>
            </Popup>}
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
