import React from 'react';
import proxyquire from 'proxyquire';
import {defaultsDeep} from 'lodash';

import {mkConnectedComponent} from './utils';
import {config} from 'lib/constants/defaults';
import clientEvents from 'lib/constants/client-events';
import viewModes from 'lib/constants/view-modes';

describe('<Suites/>', () => {
    const sandbox = sinon.sandbox.create();
    let Suites, SectionCommon, getVisibleRootSuiteIds;

    const mkSuitesComponent = (initialState = {}) => {
        initialState = defaultsDeep(initialState, {
            view: {
                viewMode: viewModes.ALL,
                lazyLoadOffset: config.lazyLoadOffset
            }
        });

        return mkConnectedComponent(<Suites />, {initialState});
    };

    beforeEach(() => {
        SectionCommon = sinon.stub().returns(null);
        getVisibleRootSuiteIds = sinon.stub().returns([]);

        Suites = proxyquire('lib/static/components/suites', {
            './section/section-common': {default: SectionCommon},
            '../modules/selectors/tree': {getVisibleRootSuiteIds}
        }).default;
    });

    afterEach(() => sandbox.restore());

    it('should not render section common component if there are not visible root suite ids', () => {
        getVisibleRootSuiteIds.returns([]);

        mkSuitesComponent();

        assert.notCalled(SectionCommon);
    });

    it('should render section common without "eventToUpdate" and "eventToReset" if "lazyLoadOffset" disabled', () => {
        getVisibleRootSuiteIds.returns(['suite-id']);

        mkSuitesComponent({view: {lazyLoadOffset: 0}});

        assert.calledOnceWith(
            SectionCommon,
            {suiteId: 'suite-id', sectionRoot: true}
        );
    });

    it('should render section common without "eventToUpdate" and "eventToReset" if "lazyLoadOffset" enabled', () => {
        getVisibleRootSuiteIds.returns(['suite-id']);

        mkSuitesComponent({view: {lazyLoadOffset: 100500}});

        assert.calledOnceWith(
            SectionCommon,
            {
                suiteId: 'suite-id',
                sectionRoot: true,
                eventToUpdate: clientEvents.VIEW_CHANGED,
                eventToReset: clientEvents.SUITES_VISIBILITY_CHANGED
            }
        );
    });

    it('should render few section commons components', () => {
        getVisibleRootSuiteIds.returns(['suite-id-1', 'suite-id-2']);

        mkSuitesComponent();

        assert.calledTwice(SectionCommon);
    });
});
