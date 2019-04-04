import React from 'react';
import proxyquire from 'proxyquire';
import {defaults} from 'lodash';
import MetaInfo from 'lib/static/components/section/body/meta-info';
import {mkConnectedComponent, mkTestResult_, mkSuite_, mkImg_} from '../../utils';
import {mkBrowserResult} from '../../../../../utils';
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
            changeTestRetry: sandbox.stub().returns({type: 'some-type'}),
            findSameDiffs: sandbox.stub().returns({type: 'some-type'})
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

    it('should render tab with error item if test errored without images', () => {
        const testResult = mkTestResult_({status: ERROR, error: {foo: 'bar'}, imagesInfo: []});

        const component = mkBodyComponent({result: testResult});

        assert.lengthOf(component.find('.error__item'), 1);
    });

    describe('"acceptTest" action', () => {
        it('should call on "Accept" button click', () => {
            const imagesInfo = [{stateName: 'plain', status: ERROR, actualImg: mkImg_(), error: {}, image: true, opened: true}];
            const testResult = mkTestResult_({name: 'bro', imagesInfo});
            const suite = mkSuite_({name: 'some-suite'});
            utilsStub.isAcceptable.withArgs(imagesInfo[0]).returns(true);

            const component = mkBodyComponent({result: testResult, suite}, {view: {expand: 'all'}});
            component.find('[label="✔ Accept"]').simulate('click');

            assert.calledOnceWith(actionsStub.acceptTest, suite, 'bro', 'plain');
        });
    });

    describe('"findSameDiffs" action', () => {
        it('should call on "Find same diffs" button click', () => {
            const imagesInfo = [{stateName: 'plain', status: FAIL, actualImg: mkImg_(), error: {}, image: true, opened: true}];
            const testResult = mkTestResult_({name: 'bro', imagesInfo});
            const browser = mkBrowserResult();
            const suite = mkSuite_({name: 'some-suite', suitePath: ['some-suite']});
            const initialState = {view: {expand: 'all'}, suiteIds: {failed: ['some-suite']}, suites: {[suite.name]: suite}};

            const component = mkBodyComponent({result: testResult, browser, suite}, initialState);
            component.find('[label="🔍 Find same diffs"]').simulate('click');

            assert.calledOnceWith(actionsStub.findSameDiffs, {
                suitePath: suite.suitePath, browser, stateName: 'plain', fails: [suite]
            });
        });
    });

    describe('"toggleTestResult" action', () => {
        it('should call on mount', () => {
            const testResult = mkTestResult_({name: 'bro'});
            const suite = mkSuite_({suitePath: ['some-suite']});

            mkBodyComponent({result: testResult, suite});

            assert.calledOnceWith(actionsStub.toggleTestResult, {
                browserId: 'bro', suitePath: ['some-suite'], opened: true
            });
        });

        it('should call on unmount', () => {
            const testResult = mkTestResult_({name: 'bro'});
            const suite = mkSuite_({suitePath: ['some-suite']});

            const component = mkBodyComponent({result: testResult, suite});
            component.unmount();

            assert.calledTwice(actionsStub.toggleTestResult);
            assert.calledWith(actionsStub.toggleTestResult.secondCall, {
                browserId: 'bro', suitePath: ['some-suite'], opened: false
            });
        });
    });

    describe('"toggleStateResult" action', () => {
        it('should call on click to state', () => {
            const imagesInfo = [{stateName: 'plain', status: SUCCESS, opened: false, expectedImg: mkImg_()}];
            const testResult = mkTestResult_({name: 'bro', imagesInfo});
            const suite = mkSuite_({name: 'some-suite', suitePath: ['some-suite']});

            const component = mkBodyComponent({result: testResult, suite}, {view: {expand: 'errors'}});
            component.find('.state-title').simulate('click');

            assert.calledWith(
                actionsStub.toggleStateResult,
                {stateName: 'plain', browserId: 'bro', suitePath: ['some-suite'], retryIndex: 0, opened: true}
            );
        });
    });

    describe('"changeTestRetry" action', () => {
        it('should call on mount', () => {
            const testResult = mkTestResult_({name: 'bro'});
            const suite = mkSuite_({suitePath: ['some-suite']});

            mkBodyComponent({result: testResult, suite, retries: [mkTestResult_()]});

            assert.calledOnceWith(actionsStub.changeTestRetry, {browserId: 'bro', suitePath: ['some-suite'], retryIndex: 1});
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

    describe('meta-info', () => {
        it('should pass "getExtraMetaInfo" props to meta info component', () => {
            const component = mkBodyComponent();
            const metaInfoProps = component.find(MetaInfo).props();

            assert.isFunction(metaInfoProps.getExtraMetaInfo);
        });

        it('should return result of calling stringified function from "metaInfoExtenders"', () => {
            const suite = mkSuite_();
            const extraItems = {item1: 1};
            const extender = () => 'foo-bar-baz';
            const metaInfoExtenders = {extender1: extender.toString()};

            const component = mkBodyComponent({suite}, {
                apiValues: {extraItems, metaInfoExtenders}
            });

            const metaInfoProps = component.find(MetaInfo).props();
            const result = metaInfoProps.getExtraMetaInfo();

            assert.deepEqual(result, {extender1: 'foo-bar-baz'});
        });
    });
});
