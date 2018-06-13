import React from 'react';
import proxyquire from 'proxyquire';
import {mkConnectedComponent, mkTestResult_} from '../utils';

describe('<Body />', () => {
    const sandbox = sinon.sandbox.create();

    let Body;
    let actionsStub;
    let utilsStub;

    beforeEach(() => {
        actionsStub = {
            acceptTest: sandbox.stub().returns({type: 'some-type'}),
            retryTest: sandbox.stub().returns({type: 'some-type'})
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
        const bodyComponent = <Body result={mkTestResult_()} />;
        const component = mkConnectedComponent(bodyComponent, {initialState: {gui: true}});

        assert.equal(component.find('.button_type_suite-controls').first().text(), '↻ Retry');
    });

    it('should not render retry button if "gui" is not running', () => {
        const bodyComponent = <Body result={mkTestResult_()} />;
        const component = mkConnectedComponent(bodyComponent, {initialState: {gui: false}});

        assert.lengthOf(component.find('.button_type_suite-controls'), 0);
    });

    it('should call "acceptTest" action on Accept button click', () => {
        const retries = [];
        const testResult = mkTestResult_({name: 'bro'});
        utilsStub.isAcceptable.withArgs(testResult).returns(true);

        const bodyComponent = <Body result={testResult} suite={{name: 'some-suite'}} retries={retries}/>;
        const component = mkConnectedComponent(bodyComponent);

        component.find('[label="✔ Accept"]').simulate('click');

        assert.calledOnceWith(actionsStub.acceptTest, {name: 'some-suite'}, 'bro', retries.length);
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
                suite={{name: 'some-suite'}}
            />;
            const component = mkConnectedComponent(bodyComponent, {initialState: {running: false}});

            component.find('[label="↻ Retry"]').simulate('click');

            assert.calledOnceWith(actionsStub.retryTest, {name: 'some-suite'}, 'bro');
        });
    });
});
