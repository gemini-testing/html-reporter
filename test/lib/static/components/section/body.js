import React from 'react';
import _ from 'lodash';
import proxyquire from 'proxyquire';
import {mkConnectedComponent} from '../utils';

describe('<Body />', () => {
    const sandbox = sinon.sandbox.create();

    let Body;
    let actionsStub;
    let utilsStub;

    const mkTestResult_ = (result) => {
        return _.defaults(result, {
            suiteUrl: '',
            metaInfo: {}
        });
    };

    beforeEach(() => {
        actionsStub = {
            acceptTest: sandbox.stub().returns({type: 'some-type'}),
            retryTest: sandbox.stub().returns({type: 'some-type'})
        };

        utilsStub = {isAcceptable: sandbox.stub()};

        Body = proxyquire('lib/static/components/section/body', {
            '../../modules/actions': actionsStub,
            '../../modules/utils': utilsStub
        }).default;
    });

    afterEach(() => sandbox.restore());

    it('should render accept and retry button if "gui" is running', () => {
        const bodyComponent = <Body result={mkTestResult_()} />;
        const component = mkConnectedComponent(bodyComponent, {initialState: {gui: true}});

        assert.lengthOf(component.find('.button_type_suite-controls'), 2);
        assert.match(component.find('.button_type_suite-controls').debug(), '✔ Accept');
        assert.match(component.find('.button_type_suite-controls').debug(), '↻ Retry');
    });

    it('should not render accept and retry button if "gui" is not running', () => {
        const bodyComponent = <Body result={mkTestResult_()} />;
        const component = mkConnectedComponent(bodyComponent, {initialState: {gui: false}});

        assert.lengthOf(component.find('.button_type_suite-controls'), 0);
    });

    describe('"Accept" button', () => {
        it('should be disabled if test result is not acceptable', () => {
            const testResult = mkTestResult_({status: 'idle'});
            utilsStub.isAcceptable.withArgs(testResult).returns(false);

            const component = mkConnectedComponent(<Body result={testResult} />);

            assert.isTrue(component.find('[label="✔ Accept"]').prop('isDisabled'));
        });

        it('should be enabled if test result is acceptable', () => {
            const testResult = mkTestResult_();
            utilsStub.isAcceptable.withArgs(testResult).returns(true);

            const component = mkConnectedComponent(<Body result={testResult} />);

            assert.isFalse(component.find('[label="✔ Accept"]').prop('isDisabled'));
        });

        it('should call "acceptTest" action on click', () => {
            const retries = [];
            const testResult = mkTestResult_({name: 'bro'});
            utilsStub.isAcceptable.withArgs(testResult).returns(true);

            const bodyComponent = <Body
                result={testResult}
                suite={'some-suite'} retries={retries}
            />;
            const component = mkConnectedComponent(bodyComponent);

            component.find('[label="✔ Accept"]').simulate('click');

            assert.calledOnceWith(actionsStub.acceptTest, 'some-suite', 'bro', retries.length);
        });
    });

    describe('"Retry" button', () => {
        it('should be disabled while tests running', () => {
            const testResult = mkTestResult_();

            const component = mkConnectedComponent(<Body result={testResult} />, {initialState: {running: true}});

            assert.isTrue(component.find('[label="↻ Retry"]').prop('isDisabled'));
        });

        it('should be enabled if tests are not started yet', () => {
            const testResult = mkTestResult_();

            const component = mkConnectedComponent(<Body result={testResult} />, {initialState: {running: false}});

            assert.isFalse(component.find('[label="↻ Retry"]').prop('isDisabled'));
        });

        it('should call action "retryTest" on "handler" prop calling', () => {
            const bodyComponent = <Body
                result={mkTestResult_({name: 'bro'})}
                suite={'some-suite'}
            />;
            const component = mkConnectedComponent(bodyComponent, {initialState: {running: false}});

            component.find('[label="↻ Retry"]').simulate('click');

            assert.calledOnceWith(actionsStub.retryTest, 'some-suite', 'bro');
        });
    });
});
