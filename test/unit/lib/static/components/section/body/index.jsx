import React from 'react';
import proxyquire from 'proxyquire';
import {defaults} from 'lodash';
import {mkConnectedComponent} from '../../utils';
import {mkStateTree} from '../../../state-utils';

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

            assert.equal(component.find('.button_type_suite-controls').first().text(), 'Retry');
        });

        it('should not render if "gui" is not running', () => {
            const component = mkBodyComponent({}, {gui: false});

            assert.lengthOf(component.find('.button_type_suite-controls'), 0);
        });

        it('should be disabled while tests running', () => {
            const component = mkBodyComponent({}, {running: true});

            assert.isTrue(component.find('[data-qa="test-retry"]').prop('disabled'));
        });

        it('should be enabled if tests are not started yet', () => {
            const component = mkBodyComponent({}, {running: false});

            assert.isFalse(component.find('[data-qa="test-retry"]').prop('disabled'));
        });

        it('should call action "retryTest" on "handler" prop calling', () => {
            const testName = 'suite test';
            const browserName = 'yabro';
            const component = mkBodyComponent({testName, browserName}, {running: false});

            component.find('[data-qa="test-retry"]').simulate('click');

            assert.calledOnceWith(actionsStub.retryTest, {testName, browserName});
        });
    });

    describe('"RetrySwitcher" component', () => {
        it('should not render if test has only one result', () => {
            mkBodyComponent({resultIds: ['result-1']});

            assert.notCalled(RetrySwitcher);
        });

        it('should render if test has more than one result', () => {
            const browserId = 'yabro';
            const resultIds = ['result-1', 'result-2'];
            const browsersStateById = {[browserId]: {retryIndex: 1}};
            const tree = mkStateTree({browsersStateById});

            mkBodyComponent({resultIds, browserId}, {tree});

            assert.calledOnceWith(RetrySwitcher, {resultIds, retryIndex: 1, onChange: sinon.match.func});
        });

        it('should call "changeTestRetry" action on call "onChange" prop', () => {
            const browserId = 'yabro';
            const resultIds = ['result-1', 'result-2'];
            const browsersStateById = {[browserId]: {retryIndex: 1}};
            const tree = mkStateTree({browsersStateById});

            mkBodyComponent({browserId, resultIds}, {tree});
            RetrySwitcher.firstCall.args[0].onChange(0);

            assert.calledOnceWith(actionsStub.changeTestRetry, {browserId, retryIndex: 0});
        });

        it('should not call "changeTestRetry" action on call "onChange" prop with the same retry index as current', () => {
            const browserId = 'yabro';
            const resultIds = ['result-1', 'result-2'];
            const browsersStateById = {[browserId]: {retryIndex: 1}};
            const tree = mkStateTree({browsersStateById});

            mkBodyComponent({browserId, resultIds}, {tree});
            RetrySwitcher.firstCall.args[0].onChange(1);

            assert.notCalled(actionsStub.changeTestRetry);
        });
    });

    describe('"Result" component', () => {
        it('should render with current active result id and test name', () => {
            const browserId = 'yabro';
            const testName = 'suite test';
            const resultIds = ['result-1', 'result-2'];
            const browsersStateById = {[browserId]: {retryIndex: 1}};
            const tree = mkStateTree({browsersStateById});

            mkBodyComponent({browserId, testName, resultIds}, {tree});

            assert.calledOnceWith(Result, {resultId: 'result-2', testName});
        });
    });
});
