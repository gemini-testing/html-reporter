import React from 'react';
import proxyquire from 'proxyquire';
import {defaults} from 'lodash';
import {mkConnectedComponent, mkTestResult_, mkSuite_, mkImg_} from '../utils';
import {mkBrowserResult} from '../../../../utils';
import {SUCCESS, FAIL, ERROR} from 'lib/constants/test-statuses';

describe('<Body />', () => {
    const sandbox = sinon.sandbox.create();

    let Body;
    let actionsStub;
    let utilsStub;

    const mkBodyComponent = (bodyProps = {}, initialState = {}) => {
        const browser = bodyProps.browser || mkBrowserResult();

        bodyProps = defaults(bodyProps, {
            result: mkTestResult_(),
            retries: [],
            suite: mkSuite_(),
            browser
        });

        actionsStub.changeTestRetry.callsFake(({retryIndex}) => {
            browser.retryIndex = retryIndex;
            return {type: 'some-type'};
        });

        return mkConnectedComponent(<Body {...bodyProps} />, {initialState});
    };

    beforeEach(() => {
        actionsStub = {
            acceptTest: sandbox.stub().returns({type: 'some-type'}),
            retryTest: sandbox.stub().returns({type: 'some-type'}),
            toggleTestResult: sandbox.stub().returns({type: 'some-type'}),
            toggleStateResult: sandbox.stub().returns({type: 'some-type'}),
            changeTestRetry: sandbox.stub().returns({type: 'some-type'})
        };

        utilsStub = {isAcceptable: sandbox.stub()};

        const State = proxyquire('lib/static/components/state', {
            '../../modules/utils': utilsStub
        });

        Body = proxyquire('lib/static/components/section/body', {
            '../../../modules/actions': actionsStub,
            '../../state': State
        }).default;
    });

    afterEach(() => sandbox.restore());

    it('should render retry button if "gui" is running', () => {
        const component = mkBodyComponent({}, {gui: true});

        assert.equal(component.find('.button_type_suite-controls').first().text(), '↻ Retry');
    });

    it('should not render retry button if "gui" is not running', () => {
        const component = mkBodyComponent({}, {gui: false});

        assert.lengthOf(component.find('.button_type_suite-controls'), 0);
    });

    it('should call "acceptTest" action on Accept button click', () => {
        const imagesInfo = [{stateName: 'plain', status: ERROR, actualImg: mkImg_(), error: {}, image: true, opened: true}];
        const testResult = mkTestResult_({name: 'bro', imagesInfo});
        const suite = mkSuite_({name: 'some-suite'});
        utilsStub.isAcceptable.withArgs(imagesInfo[0]).returns(true);

        const component = mkBodyComponent({result: testResult, suite}, {view: {expand: 'all'}});

        component.find('[label="✔ Accept"]').simulate('click');

        assert.calledOnceWith(actionsStub.acceptTest, suite, 'bro', 'plain');
    });

    it('should render state for each state image', () => {
        const imagesInfo = [
            {stateName: 'plain1', status: ERROR, actualImg: mkImg_(), error: {}},
            {stateName: 'plain2', status: ERROR, actualImg: mkImg_(), error: {}}
        ];
        const testResult = mkTestResult_({name: 'bro', imagesInfo});

        const component = mkBodyComponent({result: testResult});

        assert.lengthOf(component.find('.tab'), 2);
    });

    it('should not render state if state images does not exist and test passed successfully', () => {
        const testResult = mkTestResult_({status: SUCCESS});

        const component = mkBodyComponent({result: testResult});

        assert.lengthOf(component.find('.tab'), 0);
    });

    it('should render additional tab if test errored without screenshot', () => {
        const imagesInfo = [{stateName: 'plain1', status: SUCCESS, expectedImg: mkImg_()}];
        const testResult = mkTestResult_({status: ERROR, multipleTabs: true, error: {}, imagesInfo});

        const component = mkBodyComponent({result: testResult});

        assert.lengthOf(component.find('.tab'), 2);
    });

    describe('should call "toggleTestResult" action on', () => {
        it('mount', () => {
            const testResult = mkTestResult_({name: 'bro'});
            const suite = mkSuite_({suitePath: ['some-suite']});

            mkBodyComponent({result: testResult, suite});

            assert.calledOnceWith(actionsStub.toggleTestResult, {
                browserId: 'bro', suitePath: ['some-suite'], opened: true, retryIndex: 0
            });
        });

        it('unmount', () => {
            const testResult = mkTestResult_({name: 'bro'});
            const suite = mkSuite_({suitePath: ['some-suite']});

            const component = mkBodyComponent({result: testResult, suite});
            component.unmount();

            assert.calledTwice(actionsStub.toggleTestResult);
            assert.calledWith(actionsStub.toggleTestResult.secondCall, {
                browserId: 'bro', suitePath: ['some-suite'], opened: false, retryIndex: 0
            });
        });
    });

    it('should call "toggleStateResult" action on click to state', () => {
        const imagesInfo = [{stateName: 'plain', status: SUCCESS, opened: false}];
        const testResult = mkTestResult_({name: 'bro', imagesInfo});
        const suite = mkSuite_({name: 'some-suite', suitePath: ['some-suite']});

        const component = mkBodyComponent({result: testResult, suite}, {view: {expand: 'errors'}});
        component.find('.state-title').simulate('click');

        assert.calledWith(
            actionsStub.toggleStateResult,
            {stateName: 'plain', browserId: 'bro', suitePath: ['some-suite'], retryIndex: 0, opened: true}
        );
    });

    describe('"changeTestRetry" action', () => {
        it('should not call action if browser already has "retryIndex" prop', () => {
            const testResult = mkTestResult_({name: 'bro'});
            const suite = mkSuite_({suitePath: ['some-suite']});
            const browser = mkBrowserResult({retryIndex: 0});

            mkBodyComponent({result: testResult, suite, browser});

            assert.notCalled(actionsStub.changeTestRetry);
        });

        it('should call action on mount if browser does not have "retryIndex" prop', () => {
            const testResult = mkTestResult_({name: 'bro'});
            const suite = mkSuite_({suitePath: ['some-suite']});

            mkBodyComponent({result: testResult, suite});

            assert.calledOnceWith(actionsStub.changeTestRetry, {browserId: 'bro', suitePath: ['some-suite'], retryIndex: 0});
        });

        it('should call action on click in switcher retry button', () => {
            const testResult = mkTestResult_({name: 'bro'});
            const suite = mkSuite_({suitePath: ['some-suite']});

            const component = mkBodyComponent({result: testResult, retries: [mkTestResult_()], suite});
            component.find('.tab-switcher__button:first-child').simulate('click');

            assert.calledTwice(actionsStub.changeTestRetry);
            assert.calledWith(
                actionsStub.changeTestRetry.firstCall,
                {browserId: 'bro', suitePath: ['some-suite'], retryIndex: 1}
            );
            assert.calledWith(
                actionsStub.changeTestRetry.secondCall,
                {browserId: 'bro', suitePath: ['some-suite'], retryIndex: 0}
            );
        });
    });

    describe('errored additional tab', () => {
        it('should render if test errored without screenshot and tool can use multi tabs', () => {
            const imagesInfo = [{stateName: 'plain1', status: SUCCESS, expectedImg: mkImg_()}];
            const testResult = mkTestResult_({status: ERROR, multipleTabs: true, error: {}, imagesInfo});

            const component = mkBodyComponent({result: testResult});

            assert.lengthOf(component.find('.tab'), 2);
        });

        it('should not render if tool does not use multi tabs', () => {
            const imagesInfo = [{stateName: 'plain1', status: SUCCESS, expectedImg: mkImg_()}];
            const testResult = mkTestResult_({status: ERROR, multipleTabs: false, error: {}, screenshot: 'some-screen', imagesInfo});

            const component = mkBodyComponent({result: testResult});

            assert.lengthOf(component.find('.tab'), 1);
        });

        it('should not render if test errored with screenshot', () => {
            const imagesInfo = [{stateName: 'plain1', status: SUCCESS, expectedImg: mkImg_()}];
            const testResult = mkTestResult_({status: ERROR, multipleTabs: true, error: {}, screenshot: 'some-screen', imagesInfo});

            const component = mkBodyComponent({result: testResult});

            assert.lengthOf(component.find('.tab'), 1);
        });

        [SUCCESS, FAIL].forEach((status) => {
            it(`should not render if test ${status}ed`, () => {
                const imagesInfo = [{stateName: 'plain1', status: SUCCESS, expectedImg: mkImg_()}];
                const testResult = mkTestResult_({status, multipleTabs: true, error: {}, imagesInfo});

                const component = mkBodyComponent({result: testResult});

                assert.lengthOf(component.find('.tab'), 1);
            });
        });
    });

    describe('"Retry" button', () => {
        it('should be disabled while tests running', () => {
            const component = mkBodyComponent({}, {running: true});

            assert.isTrue(component.find('[label="↻ Retry"]').prop('isDisabled'));
        });

        it('should be enabled if tests are not started yet', () => {
            const component = mkBodyComponent({}, {running: false});

            assert.isFalse(component.find('[label="↻ Retry"]').prop('isDisabled'));
        });

        it('should call action "retryTest" on "handler" prop calling', () => {
            const testResult = mkTestResult_({name: 'bro'});
            const suite = mkSuite_();

            const component = mkBodyComponent({result: testResult, suite}, {running: false});
            component.find('[label="↻ Retry"]').simulate('click');

            assert.calledOnceWith(actionsStub.retryTest, suite, 'bro');
        });
    });
});
