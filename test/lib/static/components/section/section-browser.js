import React from 'react';
import proxyquire from 'proxyquire';
import {defaults} from 'lodash';
import {mkConnectedComponent, mkTestResult_} from '../utils';
import {mkSuite, mkBrowserResult} from '../../../../utils';
import {SKIPPED, ERROR} from 'lib/constants/test-statuses';

describe('<SectionBrowser/>', () => {
    const sandbox = sinon.sandbox.create();

    let SectionBrowser;
    let actionsStub;

    const mkSectionBrowserComponent = (sectionBrowserProps = {}, initialState = {}) => {
        const browser = sectionBrowserProps.browser || mkBrowserResult();

        sectionBrowserProps = defaults(sectionBrowserProps, {
            suite: mkSuite(),
            browser
        });

        actionsStub.toggleSection.callsFake(({opened}) => {
            browser.opened = opened;
            return {type: 'some-type'};
        });

        actionsStub.changeTestRetry.callsFake(({retryIndex}) => {
            browser.retryIndex = retryIndex;
            return {type: 'some-type'};
        });

        return mkConnectedComponent(<SectionBrowser {...sectionBrowserProps} />, {initialState});
    };

    beforeEach(() => {
        actionsStub = {
            toggleSection: sandbox.stub().returns({type: 'some-type'}),
            changeTestRetry: sandbox.stub().returns({type: 'some-type'})
        };

        const Body = proxyquire('lib/static/components/section/body', {
            '../../../modules/actions': actionsStub
        });

        SectionBrowser = proxyquire('lib/static/components/section/section-browser', {
            '../../modules/actions': actionsStub,
            './body': Body
        }).default;
    });

    afterEach(() => sandbox.restore());

    describe('skipped test', () => {
        it('should render "[skipped]" tag in title', () => {
            const testResult = mkTestResult_({status: SKIPPED});
            const browser = mkBrowserResult({name: 'yabro', result: testResult});

            const component = mkSectionBrowserComponent({browser});

            assert.equal(component.find('.section__title_skipped').first().text(), `[${SKIPPED}] yabro`);
        });

        it('should render skip reason', () => {
            const testResult = mkTestResult_({status: SKIPPED, skipReason: 'some-reason'});
            const browser = mkBrowserResult({name: 'yabro', result: testResult});

            const component = mkSectionBrowserComponent({browser});

            assert.equal(
                component.find('.section__title_skipped').first().text(),
                `[${SKIPPED}] yabro, reason: some-reason`
            );
        });

        it('should not render body even if all tests expanded', () => {
            const testResult = mkTestResult_({status: SKIPPED});
            const browser = mkBrowserResult({name: 'yabro', result: testResult});

            const component = mkSectionBrowserComponent({browser}, {view: {expand: 'all'}});

            assert.lengthOf(component.find('.section__body'), 0);
        });
    });

    describe('executed test with fails in retries and skip in result', () => {
        it('should render not skipped title', () => {
            const retries = [mkTestResult_({status: ERROR, error: {}})];
            const testResult = mkTestResult_({status: SKIPPED, skipReason: 'some-reason'});
            const browser = mkBrowserResult({name: 'yabro', result: testResult, retries});

            const component = mkSectionBrowserComponent({browser});

            assert.equal(component.find('.section__title').first().text(), `[${SKIPPED}] yabro, reason: some-reason`);
            assert.isFalse(component.find('.section__title').exists('.section__title_skipped'));
        });

        it('should not render body if only errored tests expanded', () => {
            const retries = [mkTestResult_({status: ERROR, error: {}})];
            const testResult = mkTestResult_({status: SKIPPED});
            const browser = mkBrowserResult({name: 'yabro', result: testResult, retries});

            const component = mkSectionBrowserComponent({browser}, {view: {expand: 'errors'}});

            assert.lengthOf(component.find('.section__body'), 0);
        });

        it('should render body if all tests expanded', () => {
            const retries = [mkTestResult_({status: ERROR, error: {}})];
            const testResult = mkTestResult_({status: SKIPPED});
            const browser = mkBrowserResult({name: 'yabro', result: testResult, retries});

            const component = mkSectionBrowserComponent({browser}, {view: {expand: 'all'}});

            assert.lengthOf(component.find('.section__body'), 1);
        });
    });

    describe('should render body for executed skipped test', () => {
        it('with error and without retries', () => {
            const testResult = mkTestResult_({status: SKIPPED, error: {}});
            const browser = mkBrowserResult({name: 'yabro', result: testResult});

            const component = mkSectionBrowserComponent({browser}, {view: {expand: 'all'}});

            assert.lengthOf(component.find('.section__body'), 1);
        });

        it('with existed images and without retries', () => {
            const testResult = mkTestResult_({status: SKIPPED, imagesInfo: [{}]});
            const browser = mkBrowserResult({name: 'yabro', result: testResult});

            const component = mkSectionBrowserComponent({browser}, {view: {expand: 'all'}});

            assert.lengthOf(component.find('.section__body'), 1);
        });
    });

    describe('"toggleSection" action', () => {
        it('should not call action if browser already has "opened" prop', () => {
            const browser = mkBrowserResult({opened: true});

            mkSectionBrowserComponent({browser});

            assert.notCalled(actionsStub.toggleSection);
        });

        it('should call action on mount if browser does not have "opened" prop', () => {
            const suite = mkSuite({suitePath: ['some-suite']});
            const browser = mkBrowserResult({name: 'yabro'});

            mkSectionBrowserComponent({suite, browser}, {view: {expand: 'all'}});

            assert.calledOnceWith(actionsStub.toggleSection, {suitePath: ['some-suite'], browserId: 'yabro', opened: true});
        });

        it('should call action on close opened browser result', () => {
            const suite = mkSuite({suitePath: ['some-suite']});
            const browser = mkBrowserResult({name: 'yabro'});

            const component = mkSectionBrowserComponent({suite, browser}, {view: {expand: 'all'}});
            component.find('.section__title').simulate('click');

            assert.calledTwice(actionsStub.toggleSection);
            assert.calledWith(
                actionsStub.toggleSection.firstCall, {suitePath: ['some-suite'], browserId: 'yabro', opened: true}
            );
            assert.calledWith(
                actionsStub.toggleSection.secondCall, {suitePath: ['some-suite'], browserId: 'yabro', opened: false}
            );
        });
    });
});
