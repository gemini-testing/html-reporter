import React from 'react';
import RunButton from 'lib/static/components/controls/run-button';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from '../utils';

describe('<ControlButtons />', () => {
    const sandbox = sinon.sandbox.create();

    let ControlButtons;
    let actionsStub;

    beforeEach(() => {
        actionsStub = {
            runAllTests: sandbox.stub().returns({type: 'some-type'}),
            runFailedTests: sandbox.stub().returns({type: 'some-type'}),
            acceptAll: sandbox.stub().returns({type: 'some-type'})
        };

        ControlButtons = proxyquire('lib/static/components/controls/gui-controls', {
            '../../modules/actions': actionsStub
        }).default;
    });

    afterEach(() => sandbox.restore());

    // describe('"Run" button', () => {
    //     it('should be disabled if no suites to run', () => {
    //         const component = mkConnectedComponent(<ControlButtons />, {
    //             initialState: {suiteIds: {all: []}, running: false}
    //         });

    //         assert.isTrue(component.find(RunButton).prop('isDisabled'));
    //     });

    //     it('should be enabled if suites exist to run', () => {
    //         const component = mkConnectedComponent(<ControlButtons />, {
    //             initialState: {suiteIds: {all: ['some-suite']}, running: false}
    //         });

    //         assert.isFalse(component.find(RunButton).prop('isDisabled'));
    //     });

    //     it('should be disabled while tests running', () => {
    //         const component = mkConnectedComponent(<ControlButtons />, {
    //             initialState: {suiteIds: {all: ['some-suite']}, running: true}
    //         });

    //         assert.isTrue(component.find(RunButton).prop('isDisabled'));
    //     });

    //     it('should pass "autoRun" prop', () => {
    //         const component = mkConnectedComponent(<ControlButtons />, {
    //             initialState: {autoRun: true}
    //         });

    //         assert.isTrue(component.find(RunButton).prop('autoRun'));
    //     });

    //     it('should call "runAllTests" action on click', () => {
    //         const component = mkConnectedComponent(<ControlButtons />, {
    //             initialState: {suiteIds: {all: ['some-suite']}, running: false}
    //         });

    //         component.find(RunButton).simulate('click');

    //         assert.calledOnceWith(actionsStub.runAllTests);
    //     });
    // });

    // [
    //     {name: 'Retry failed tests', handler: 'runFailedTests'},
    //     {name: 'Accept all', handler: 'acceptAll'}
    // ].forEach((button) => {
    //     describe(`"${button.name}" button`, () => {
    //         it('should be disabled if no failed suites to run', () => {
    //             const component = mkConnectedComponent(<ControlButtons />, {
    //                 initialState: {suiteIds: {all: [], failed: []}, running: false}
    //             });

    //             assert.isTrue(component.find(`[label="${button.name}"]`).prop('isDisabled'));
    //         });

    //         it('should be enabled if failed suites exist to run', () => {
    //             const component = mkConnectedComponent(<ControlButtons />, {
    //                 initialState: {
    //                     suites: {suite1: {}},
    //                     suiteIds: {all: [], failed: ['suite1']},
    //                     running: false
    //                 }
    //             });

    //             assert.isFalse(component.find(`[label="${button.name}"]`).prop('isDisabled'));
    //         });

    //         it('should be disabled while tests running', () => {
    //             const component = mkConnectedComponent(<ControlButtons />, {
    //                 initialState: {running: true}
    //             });

    //             assert.isTrue(component.find(`[label="${button.name}"]`).prop('isDisabled'));
    //         });

    //         it(`should call "${button.handler}" action on click`, () => {
    //             const failedSuite = {name: 'suite1', status: 'fail'};
    //             const component = mkConnectedComponent(<ControlButtons />, {
    //                 initialState: {
    //                     suites: {suite1: failedSuite},
    //                     suiteIds: {all: [], failed: ['suite1']},
    //                     running: false
    //                 }
    //             });

    //             component.find(`[label="${button.name}"]`).simulate('click');

    //             assert.calledOnceWith(actionsStub[button.handler], [failedSuite]);
    //         });
    //     });
    // });
});
