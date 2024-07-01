import React from 'react';
import proxyquire from 'proxyquire';
import {defaultsDeep} from 'lodash';
import {List} from 'react-virtualized';

import {mkConnectedComponent} from './utils';
import {ViewMode} from 'lib/constants/view-modes';

describe('<Suites/>', () => {
    const sandbox = sinon.sandbox.create();
    let Suites, SectionCommon, getVisibleRootSuiteIds;

    const mkSuitesComponent = (initialState = {}) => {
        initialState = defaultsDeep(initialState, {
            view: {
                viewMode: ViewMode.ALL
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

    it('should not render List component if there are no visible root suite ids', () => {
        getVisibleRootSuiteIds.returns([]);

        const component = mkSuitesComponent();

        assert.equal(component.find(List).length, 0);
    });

    it('should render few section common components', () => {
        if (!global.SVGElement) {
            global.SVGElement = HTMLElement; // Without this line test throws an error "ReferenceError: SVGElement is not defined"
        }
        getVisibleRootSuiteIds.returns(['suite-id-1', 'suite-id-2']);

        const component = mkSuitesComponent();
        const listComponent = component.find(List);

        mount(listComponent.prop('rowRenderer')({index: 0, key: 0, style: {}, parent: {}}));
        mount(listComponent.prop('rowRenderer')({index: 1, key: 1, style: {}, parent: {}}));

        assert.calledTwice(SectionCommon);
        assert.calledWith(SectionCommon.firstCall, {suiteId: 'suite-id-1', sectionRoot: true});
        assert.calledWith(SectionCommon.secondCall, {suiteId: 'suite-id-2', sectionRoot: true});
    });
});
