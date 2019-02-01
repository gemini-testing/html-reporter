import React from 'react';
import proxyquire from 'proxyquire';
import {mkConnectedComponent, mkTestResult_, mkSuite_, mkImg_} from '../utils';
import {SUCCESS, FAIL, ERROR} from 'lib/constants/test-statuses';

describe('<Body />', () => {
    const sandbox = sinon.sandbox.create();

    let Body;
    let actionsStub;
    let utilsStub;

    beforeEach(() => {
        actionsStub = {
            acceptTest: sandbox.stub().returns({type: 'some-type'}),
            retryTest: sandbox.stub().returns({type: 'some-type'}),
            toggleTestResult: sandbox.stub().returns({type: 'some-type'}),
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
        const bodyComponent = <Body result={mkTestResult_()} suite={mkSuite_()} />;
        const component = mkConnectedComponent(bodyComponent, {initialState: {gui: true}});

        assert.equal(component.find('.button_type_suite-controls').first().text(), '↻ Retry');
    });

    it('should not render retry button if "gui" is not running', () => {
        const bodyComponent = <Body result={mkTestResult_()} suite={mkSuite_()} />;
        const component = mkConnectedComponent(bodyComponent, {initialState: {gui: false}});

        assert.lengthOf(component.find('.button_type_suite-controls'), 0);
    });

    it('should call "acceptTest" action on Accept button click', () => {
        const retries = [];
        const imagesInfo = [{stateName: 'plain', status: ERROR, actualImg: mkImg_(), error: {}, image: true}];
        const testResult = mkTestResult_({name: 'bro', imagesInfo});
        const suite = mkSuite_({name: 'some-suite'});
        utilsStub.isAcceptable.withArgs(imagesInfo[0]).returns(true);

        const bodyComponent = <Body result={testResult} suite={suite} retries={retries}/>;
        const component = mkConnectedComponent(bodyComponent);

        component.find('[label="✔ Accept"]').simulate('click');

        assert.calledOnceWith(actionsStub.acceptTest, suite, 'bro', 'plain');
    });

    it('should render state for each state image', () => {
        const imagesInfo = [
            {stateName: 'plain1', status: ERROR, actualImg: mkImg_(), error: {}},
            {stateName: 'plain2', status: ERROR, actualImg: mkImg_(), error: {}}
        ];
        const testResult = mkTestResult_({name: 'bro', imagesInfo});

        const component = mkConnectedComponent(<Body result={testResult} suite={mkSuite_()}/>);

        assert.lengthOf(component.find('.tab'), 2);
    });

    it('should not render state if state images does not exist and test passed successfully', () => {
        const testResult = mkTestResult_({status: SUCCESS});

        const component = mkConnectedComponent(<Body result={testResult} suite={mkSuite_()} />);

        assert.lengthOf(component.find('.tab'), 0);
    });

    it('should render additional tab if test errored without screenshot', () => {
        const imagesInfo = [{stateName: 'plain1', status: SUCCESS, expectedImg: mkImg_()}];
        const testResult = mkTestResult_({status: ERROR, multipleTabs: true, error: {}, imagesInfo});

        const component = mkConnectedComponent(<Body result={testResult} suite={mkSuite_()} />);

        assert.lengthOf(component.find('.tab'), 2);
    });

    describe('should call "toggleTestResult" action on', () => {
        it('mount', () => {
            const testResult = mkTestResult_({name: 'bro'});
            const suite = mkSuite_({suitePath: ['some-suite']});

            mkConnectedComponent(<Body result={testResult} suite={suite} />);

            assert.calledOnceWith(actionsStub.toggleTestResult, {browserId: 'bro', suitePath: ['some-suite'], opened: true});
        });

        it('unmount', () => {
            const testResult = mkTestResult_({name: 'bro'});
            const suite = mkSuite_({suitePath: ['some-suite']});
            const component = mkConnectedComponent(<Body result={testResult} suite={suite} />);

            component.unmount();

            assert.calledTwice(actionsStub.toggleTestResult);
            assert.calledWith(actionsStub.toggleTestResult.secondCall, {browserId: 'bro', suitePath: ['some-suite'], opened: false});
        });
    });

    describe('should call "changeTestRetry" action on', () => {
        it('mount', () => {
            const testResult = mkTestResult_({name: 'bro'});
            const suite = mkSuite_({suitePath: ['some-suite']});

            mkConnectedComponent(<Body result={testResult} suite={suite} retries={[mkTestResult_()]} />);

            assert.calledOnceWith(actionsStub.changeTestRetry, {browserId: 'bro', suitePath: ['some-suite'], retryIndex: 1});
        });

        it('click in switcher retry button', () => {
            const testResult = mkTestResult_({name: 'bro'});
            const suite = mkSuite_({suitePath: ['some-suite']});
            const component = mkConnectedComponent(<Body result={testResult} suite={suite} retries={[mkTestResult_()]} />);

            component.find('.tab-switcher__button:first-child').simulate('click');

            assert.calledTwice(actionsStub.changeTestRetry);
            assert.calledWith(actionsStub.changeTestRetry.secondCall, {browserId: 'bro', suitePath: ['some-suite'], retryIndex: 0});
        });
    });

    describe('errored additional tab', () => {
        it('should render if test errored without screenshot and tool can use multi tabs', () => {
            const imagesInfo = [{stateName: 'plain1', status: SUCCESS, expectedImg: mkImg_()}];
            const testResult = mkTestResult_({status: ERROR, multipleTabs: true, error: {}, imagesInfo});

            const component = mkConnectedComponent(<Body result={testResult} suite={mkSuite_()} />);

            assert.lengthOf(component.find('.tab'), 2);
        });

        it('should not render if tool does not use multi tabs', () => {
            const imagesInfo = [{stateName: 'plain1', status: SUCCESS, expectedImg: mkImg_()}];
            const testResult = mkTestResult_({status: ERROR, multipleTabs: false, error: {}, screenshot: 'some-screen', imagesInfo});

            const component = mkConnectedComponent(<Body result={testResult} suite={mkSuite_()} />);

            assert.lengthOf(component.find('.tab'), 1);
        });

        it('should not render if test errored with screenshot', () => {
            const imagesInfo = [{stateName: 'plain1', status: SUCCESS, expectedImg: mkImg_()}];
            const testResult = mkTestResult_({status: ERROR, multipleTabs: true, error: {}, screenshot: 'some-screen', imagesInfo});

            const component = mkConnectedComponent(<Body result={testResult} suite={mkSuite_()} />);

            assert.lengthOf(component.find('.tab'), 1);
        });

        [SUCCESS, FAIL].forEach((status) => {
            it(`should not render if test ${status}ed`, () => {
                const imagesInfo = [{stateName: 'plain1', status: SUCCESS, expectedImg: mkImg_()}];
                const testResult = mkTestResult_({status, multipleTabs: true, error: {}, imagesInfo});

                const component = mkConnectedComponent(<Body result={testResult} suite={mkSuite_()} />);

                assert.lengthOf(component.find('.tab'), 1);
            });
        });
    });

    describe('"Retry" button', () => {
        it('should be disabled while tests running', () => {
            const testResult = mkTestResult_();

            const component = mkConnectedComponent(<Body result={testResult} suite={mkSuite_()} />, {initialState: {running: true}});

            assert.isTrue(component.find('[label="↻ Retry"]').prop('isDisabled'));
        });

        it('should be enabled if tests are not started yet', () => {
            const testResult = mkTestResult_();

            const component = mkConnectedComponent(<Body result={testResult} suite={mkSuite_()} />, {initialState: {running: false}});

            assert.isFalse(component.find('[label="↻ Retry"]').prop('isDisabled'));
        });

        it('should call action "retryTest" on "handler" prop calling', () => {
            const suite = mkSuite_();
            const bodyComponent = <Body
                result={mkTestResult_({name: 'bro'})}
                suite={suite}
            />;
            const component = mkConnectedComponent(bodyComponent, {initialState: {running: false}});

            component.find('[label="↻ Retry"]').simulate('click');

            assert.calledOnceWith(actionsStub.retryTest, suite, 'bro');
        });
    });
});
