import React from 'react';
import SectionCommon from 'lib/static/components/section/section-common';
import {FAIL, SUCCESS} from 'lib/constants/test-statuses';
import {mkConnectedComponent, mkTestResult_} from '../utils';
import {mkBrowserResult, mkSuiteTree} from '../../../../utils';

describe('<SectionCommon/>', () => {
    const mkSectionCommonComponent = (props = {}, initialState = {}) => {
        return mkConnectedComponent(<SectionCommon {...props} />, {initialState});
    };

    describe('expand retries', () => {
        it('should not render body section if suite has not failed retries', () => {
            const retries = [mkTestResult_({status: SUCCESS})];
            const result = mkTestResult_({status: SUCCESS});
            const bro = mkBrowserResult({retries, result});
            const suite = mkSuiteTree({browsers: [bro]});

            const component = mkSectionCommonComponent({suite}, {view: {expand: 'retries'}});

            assert.lengthOf(component.find('.section__body'), 0);
        });

        it('should render body section if suite has failed retries', () => {
            const retries = [mkTestResult_({status: FAIL})];
            const result = mkTestResult_({status: SUCCESS});
            const bro = mkBrowserResult({retries, result});
            const suite = mkSuiteTree({browsers: [bro]});

            const component = mkSectionCommonComponent({suite}, {view: {expand: 'retries'}});

            assert.isAtLeast(component.find('.section__body').length, 1);
        });
    });
});
