import React from 'react';
import {defaults} from 'lodash';
import SectionBrowser from 'lib/static/components/section/section-browser';
import {SKIPPED, ERROR} from 'lib/constants/test-statuses';
import {mkConnectedComponent, mkTestResult_} from '../utils';
import {mkSuite, mkBrowserResult} from '../../../../utils';

describe('<SectionBrowser/>', () => {
    const mkSectionBrowserComponent = (sectionBrowserProps = {}, initialState = {}) => {
        const browser = sectionBrowserProps.browser || mkBrowserResult();

        sectionBrowserProps = defaults(sectionBrowserProps, {
            suite: mkSuite(),
            browser
        });

        return mkConnectedComponent(<SectionBrowser {...sectionBrowserProps} />, {initialState});
    };

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
});
