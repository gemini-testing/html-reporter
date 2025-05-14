import React from 'react';
import proxyquire from 'proxyquire';
import {mkConnectedComponent, mkState} from '../../utils';
import userEvent from '@testing-library/user-event';

describe('<RunButton />', () => {
    const sandbox = sinon.sandbox.create();

    let RunButton, useLocalStorageStub, actionsStub, selectorsStub, writeValueStub, mutationObserverOriginal;

    beforeEach(() => {
        writeValueStub = sandbox.stub();
        useLocalStorageStub = sandbox.stub().returns([true]);
        useLocalStorageStub.withArgs('RunMode', 'Failed').returns(['All', writeValueStub]);
        actionsStub = {
            thunkRunAllTests: sandbox.stub().returns({type: 'some-type'}),
            thunkRunFailedTests: sandbox.stub().returns({type: 'some-type'}),
            thunkRunSuite: sandbox.stub().returns({type: 'some-type'})
        };
        selectorsStub = {
            getFailedTests: sandbox.stub().returns([]),
            getCheckedTests: sandbox.stub().returns([])
        };

        RunButton = proxyquire('lib/static/components/controls/run-button', {
            '../../../hooks/useLocalStorage': {default: useLocalStorageStub},
            '../../../modules/selectors/tree': selectorsStub,
            '../../../modules/actions': actionsStub
        }).default;

        mutationObserverOriginal = global.MutationObserver;
        global.MutationObserver = class {
            constructor() {}
            disconnect() {}
            observe() {}
        };
    });

    afterEach(() => {
        sandbox.restore();
        global.MutationObserver = mutationObserverOriginal;
    });

    it('should be disabled if no suites to run', () => {
        const component = mkConnectedComponent(<RunButton />, {
            initialState: {tree: {suites: {allRootIds: []}}, processing: false}
        });

        assert.isTrue(component.getByRole('button').disabled);
    });

    it('should be enabled if suites exist to run', () => {
        const component = mkConnectedComponent(<RunButton />, {
            initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
        });

        assert.isFalse(component.getByRole('button').disabled);
    });

    it('should be disabled while processing something', () => {
        const component = mkConnectedComponent(<RunButton />, {
            initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: true}
        });

        assert.isTrue(component.getByRole('button').disabled);
    });

    it('should run all tests with "autoRun" prop', () => {
        mkConnectedComponent(<RunButton />, {
            initialState: {autoRun: true}
        });

        assert.calledOnce(actionsStub.thunkRunAllTests);
    });

    it('should call "thunkRunAllTests" action on "Run all tests" click', async () => {
        const user = userEvent.setup();
        const component = mkConnectedComponent(<RunButton />, {
            initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
        });

        await user.click(component.getByRole('button'));

        assert.calledOnce(actionsStub.thunkRunAllTests);
    });

    it('should call "runFailedTests" action on "Run failed tests" click', async () => {
        const user = userEvent.setup();
        useLocalStorageStub.withArgs('RunMode', 'Failed').returns(['Failed', () => {}]);
        const failedTests = [{testName: 'suite test', browserName: 'yabro'}];
        const state = mkState({initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}});
        selectorsStub.getFailedTests.withArgs(state).returns(failedTests);
        const component = mkConnectedComponent(<RunButton />, {state});

        await user.click(component.getByRole('combobox'));
        await user.click(component.getByText('Failed Tests', {selector: '[role=combobox] > *'}));
        await user.click(component.getByText('Run'));

        assert.calledOnceWith(actionsStub.thunkRunFailedTests, {tests: failedTests});
    });

    it('should call "retrySuite" action on "Run checked tests" click', async () => {
        const user = userEvent.setup();
        useLocalStorageStub.withArgs('RunMode', 'Failed').returns(['Checked', () => {}]);
        const checkedTests = [{testName: 'suite test', browserName: 'yabro'}];
        const state = mkState({initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}});
        selectorsStub.getCheckedTests.withArgs(state).returns(checkedTests);
        const component = mkConnectedComponent(<RunButton />, {state});

        await user.click(component.getByRole('combobox'));
        await user.click(component.getByText('Checked Tests', {selector: '[role=combobox] > *'}));
        await user.click(component.getByText('Run'));

        assert.calledOnceWith(actionsStub.thunkRunSuite, {tests: checkedTests});
    });

    describe('Label', () => {
        it('should be "Running" if is running', () => {
            const component = mkConnectedComponent(<RunButton />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false, running: true}
            });

            assert.equal(component.getByRole('button').textContent, 'Running');
        });

        it('should be "Run all tests" by default if there is no checked tests', () => {
            selectorsStub.getCheckedTests.returns([]);
            const component = mkConnectedComponent(<RunButton />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
            });

            assert.equal(component.getByRole('combobox').textContent, 'All Tests');
        });

        it('should switch to "Run checked tests" if there are checked tests', () => {
            selectorsStub.getCheckedTests.returns([{testName: 'testName', browserName: 'browserName'}]);
            mkConnectedComponent(<RunButton />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
            });

            assert.calledWith(writeValueStub, 'Checked');
        });
    });

    describe('localStorage', () => {
        it('should save "Run all tests" if picked', async () => {
            const user = userEvent.setup();
            useLocalStorageStub.withArgs('RunMode', 'Failed').returns(['Failed', writeValueStub]);
            selectorsStub.getCheckedTests.returns([{testName: 'testName', browserName: 'browserName'}]);
            selectorsStub.getFailedTests.returns([{testName: 'testName', browserName: 'browserName'}]);
            const component = mkConnectedComponent(<RunButton />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
            });

            await user.click(component.getByRole('combobox'));
            await user.click(component.getByText('All Tests', {selector: '[role=option] *'}));
            await user.click(component.getByText('Run'));

            assert.calledWith(writeValueStub, 'All');
        });

        it('should save "Run failed tests" if picked', async () => {
            const user = userEvent.setup();
            selectorsStub.getFailedTests.returns([{testName: 'testName', browserName: 'browserName'}]);
            const component = mkConnectedComponent(<RunButton />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
            });

            await user.click(component.getByRole('combobox'));
            await user.click(component.getByText('Failed Tests', {selector: '[role=option] *'}));
            await user.click(component.getByText('Run'));

            assert.calledOnceWith(writeValueStub, 'Failed');
        });

        it('should save "Run checked tests" if picked', async () => {
            const user = userEvent.setup();
            selectorsStub.getCheckedTests.returns([{testName: 'testName', browserName: 'browserName'}]);
            const component = mkConnectedComponent(<RunButton />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
            });

            await user.click(component.getByRole('combobox'));
            await user.click(component.getByText('Checked Tests', {selector: '[role=option] *'}));
            await user.click(component.getByText('Run'));

            assert.calledWith(writeValueStub, 'Checked');
        });
    });
});
