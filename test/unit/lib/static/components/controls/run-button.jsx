import React from 'react';
import proxyquire from 'proxyquire';
import {mkConnectedComponent, mkState} from '../utils';

describe('<RunButton />', () => {
    const sandbox = sinon.sandbox.create();

    let RunButton, useLocalStorageStub, actionsStub, selectorsStub;

    beforeEach(() => {
        useLocalStorageStub = sandbox.stub().returns([true]);
        actionsStub = {
            runAllTests: sandbox.stub().returns({type: 'some-type'}),
            runFailedTests: sandbox.stub().returns({type: 'some-type'}),
            retrySuite: sandbox.stub().returns({type: 'some-type'})
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
    });

    it('should be disabled if no suites to run', () => {
        const component = mkConnectedComponent(<RunButton />, {
            initialState: {tree: {suites: {allRootIds: []}}, processing: false}
        });

        assert.isTrue(component.find('button').prop('disabled'));
    });

    it('should be enabled if suites exist to run', () => {
        const component = mkConnectedComponent(<RunButton />, {
            initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
        });

        assert.isFalse(component.find('button').prop('disabled'));
    });

    it('should be disabled while processing something', () => {
        const component = mkConnectedComponent(<RunButton />, {
            initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: true}
        });

        assert.isTrue(component.find('button').prop('disabled'));
    });

    it('should be disabled when server is stopped', () => {
        const component = mkConnectedComponent(<RunButton />, {
            initialState: {tree: {suites: {allRootIds: ['suite']}}, serverStopped: true}
        });

        assert.isTrue(component.find('button').prop('disabled'));
    });

    it('should run all tests with "autoRun" prop', () => {
        mkConnectedComponent(<RunButton />, {
            initialState: {autoRun: true}
        });

        assert.calledOnce(actionsStub.runAllTests);
    });

    it('should call "runAllTests" action on "Run all tests" click', () => {
        const component = mkConnectedComponent(<RunButton />, {
            initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
        });

        component.find('button').simulate('click');

        assert.calledOnce(actionsStub.runAllTests);
    });

    it('should call "runFailedTests" action on "Run failed tests" click', () => {
        const failedTests = [{testName: 'suite test', browserName: 'yabro'}];
        const state = mkState({initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}});
        selectorsStub.getFailedTests.withArgs(state).returns(failedTests);
        const component = mkConnectedComponent(<RunButton />, {state});
        component.find({children: 'Failed'}).simulate('click');

        component.find('button').simulate('click');

        assert.calledOnceWith(actionsStub.runFailedTests, failedTests);
    });

    it('should call "retrySuite" action on "Run checked tests" click', () => {
        const checkedTests = [{testName: 'suite test', browserName: 'yabro'}];
        const state = mkState({initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}});
        selectorsStub.getCheckedTests.withArgs(state).returns(checkedTests);
        const component = mkConnectedComponent(<RunButton />, {state});
        component.find({children: 'Checked'}).simulate('click');

        component.find('button').simulate('click');

        assert.calledOnceWith(actionsStub.retrySuite, checkedTests);
    });

    describe('Label', () => {
        it('should be "Running" if is running', () => {
            const component = mkConnectedComponent(<RunButton />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false, running: true}
            });

            assert.equal(component.find('button').text(), 'Running');
        });

        it('should be "Run all tests" by default if there is no checked tests', () => {
            selectorsStub.getCheckedTests.returns([]);
            const component = mkConnectedComponent(<RunButton />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
            });

            assert.equal(component.find('button').text(), 'Run all tests');
        });

        it('should be "Run checked tests" if there are checked tests', () => {
            selectorsStub.getCheckedTests.returns([{testName: 'testName', browserName: 'browserName'}]);
            const component = mkConnectedComponent(<RunButton />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
            });

            assert.equal(component.find('button').text(), 'Run checked tests');
        });

        it('should be "Run failed tests" if picked', () => {
            selectorsStub.getFailedTests.returns([{testName: 'testName', browserName: 'browserName'}]);
            const component = mkConnectedComponent(<RunButton />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
            });

            component.find({children: 'Failed'}).simulate('click');
            assert.equal(component.find('button').text(), 'Run failed tests');
        });

        it('should be "Run checked tests" if picked', () => {
            selectorsStub.getCheckedTests.returns([{testName: 'testName', browserName: 'browserName'}]);
            const component = mkConnectedComponent(<RunButton />, {
                initialState: {tree: {suites: {allRootIds: ['suite']}}, processing: false}
            });

            component.find({children: 'Checked'}).simulate('click');
            assert.equal(component.find('button').text(), 'Run checked tests');
        });
    });

    describe('Popup', () => {
        describe('should be hidden', () => {
            it('if processing', () => {
                const component = mkConnectedComponent(<RunButton />, {
                    initialState: {tree: {suites: {allRootSuiteIds: ['suite']}}, processing: true}
                });

                assert.isFalse(component.find('.run-mode').exists());
            });

            it('if no suites', () => {
                const component = mkConnectedComponent(<RunButton />, {
                    initialState: {tree: {suites: {allRootSuiteIds: []}}, processing: false}
                });

                assert.isFalse(component.find('.run-mode').exists());
            });

            it('if there are no checked and failed tests', () => {
                selectorsStub.getCheckedTests.returns([]);
                selectorsStub.getFailedTests.returns([]);

                const component = mkConnectedComponent(<RunButton />, {
                    initialState: {tree: {suites: {allRootSuiteIds: ['suite']}}, processing: false}
                });

                assert.isFalse(component.find('.run-mode').exists());
            });

            it('if checkboxes are hidden and no failed tests', () => {
                useLocalStorageStub.withArgs('showCheckboxes', false).returns([false]);
                selectorsStub.getCheckedTests.returns([{testName: 'testName', browserName: 'browserName'}]);
                selectorsStub.getFailedTests.returns([]);

                const component = mkConnectedComponent(<RunButton />, {
                    initialState: {tree: {suites: {allRootSuiteIds: ['suite']}}, processing: false}
                });

                assert.isFalse(component.find('.run-mode').exists());
            });
        });

        describe('should be shown', () => {
            it('if failed suites exist', () => {
                selectorsStub.getFailedTests.returns([{testName: 'testName', browserName: 'browserName'}]);

                const component = mkConnectedComponent(<RunButton />, {
                    initialState: {tree: {suites: {allRootSuiteIds: ['suite']}}, processing: false}
                });

                assert.isFalse(component.find('.run-mode').exists());
            });

            it('if checked suites exist and checkboxes are shown', () => {
                useLocalStorageStub.withArgs('showCheckboxes', false).returns([true]);
                selectorsStub.getCheckedTests.returns([{testName: 'testName', browserName: 'browserName'}]);

                const component = mkConnectedComponent(<RunButton />, {
                    initialState: {tree: {suites: {allRootSuiteIds: ['suite']}}, processing: false}
                });

                assert.isFalse(component.find('.run-mode').exists());
            });
        });
    });
});
