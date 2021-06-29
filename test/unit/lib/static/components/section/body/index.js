import React from 'react';
import proxyquire from 'proxyquire';
import {defaults} from 'lodash';
import {mkConnectedComponent} from '../../utils';

describe('<Body />', () => {
    const sandbox = sinon.sandbox.create();
    let Body, Result, RetrySwitcher, actionsStub;

    const mkBodyComponent = (props = {}, initialState = {}) => {
        props = defaults(props, {
            browserId: 'suite test yabro',
            browserName: 'yabro',
            testName: 'suite test',
            resultIds: ['result-1']
        });

        return mkConnectedComponent(<Body {...props} />, {initialState});
    };

    beforeEach(() => {
        actionsStub = {
            retryTest: sandbox.stub().returns({type: 'some-type'}),
            changeTestRetry: sandbox.stub().returns({type: 'some-type'})
        };

        Result = sinon.stub().returns(null);
        RetrySwitcher = sinon.stub().returns(null);

        Body = proxyquire('lib/static/components/section/body', {
            '../../../modules/actions': actionsStub,
            './result': {default: Result},
            '../../retry-switcher': {default: RetrySwitcher}
        }).default;
    });

    afterEach(() => sandbox.restore());

    describe('"Retry" button', () => {
        it('should render if "gui" is running', () => {
            const component = mkBodyComponent({}, {gui: true});

            assert.equal(component.find('.button_type_suite-controls').first().text(), '↻ Retry');
        });

        it('should not render if "gui" is not running', () => {
            const component = mkBodyComponent({}, {gui: false});

            assert.lengthOf(component.find('.button_type_suite-controls'), 0);
        });

        it('should be disabled while tests running', () => {
            const component = mkBodyComponent({}, {running: true});

            assert.isTrue(component.find('[label="↻ Retry"]').prop('isDisabled'));
        });

        it('should be disabled when server is stopped', () => {
            const component = mkBodyComponent({}, {serverStopped: true});

            assert.isTrue(component.find('[label="↻ Retry"]').prop('isDisabled'));
        });

        it('should be enabled if tests are not started yet', () => {
            const component = mkBodyComponent({}, {running: false});

            assert.isFalse(component.find('[label="↻ Retry"]').prop('isDisabled'));
        });

        it('should call action "retryTest" on "handler" prop calling', () => {
            const testName = 'suite test';
            const browserName = 'yabro';
            const component = mkBodyComponent({testName, browserName}, {running: false});

            component.find('[label="↻ Retry"]').simulate('click');

            assert.calledOnceWith(actionsStub.retryTest, {testName, browserName});
        });
    });

    describe('"RetrySwitcher" component', () => {
        it('should not render if test has only one result', () => {
            mkBodyComponent({resultIds: ['result-1']});

            assert.notCalled(RetrySwitcher);
        });

        it('should render if test has more than one result', () => {
            const resultIds = ['result-1', 'result-2'];

            mkBodyComponent({resultIds});

            assert.calledOnceWith(RetrySwitcher, {resultIds, retryIndex: 1, onChange: sinon.match.func});
        });

        it('should call "changeTestRetry" action on call "onChange" prop', () => {
            const browserId = 'yabro';
            const resultIds = ['result-1', 'result-2'];

            mkBodyComponent({browserId, resultIds});
            RetrySwitcher.firstCall.args[0].onChange(0);

            assert.calledWith(actionsStub.changeTestRetry.lastCall, {browserId, retryIndex: 0, isUserClick: true});
        });
    });

    describe('"Result" component', () => {
        it('should render with current active result id and test name', () => {
            const testName = 'suite test';
            const resultIds = ['result-1', 'result-2'];

            mkBodyComponent({testName, resultIds});

            assert.calledOnceWith(Result, {resultId: 'result-2', testName});
        });
    });

    describe('"changeTestRetry" action', () => {
        it('should call on mount', () => {
            mkBodyComponent({browserId: 'some-id', resultIds: ['result-1', 'result-2']});

            assert.calledOnceWith(actionsStub.changeTestRetry, {browserId: 'some-id', retryIndex: 1, isUserClick: false});
        });
    });
});
