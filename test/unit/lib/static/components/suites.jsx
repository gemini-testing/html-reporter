import {expect} from 'chai';
import React from 'react';
import proxyquire from 'proxyquire';
import {defaultsDeep} from 'lodash';

import {mkConnectedComponent} from './utils';
import {ViewMode} from 'lib/constants/view-modes';

describe('<Suites/>', () => {
    const sandbox = sinon.sandbox.create();
    let Suites, getVisibleRootSuiteIds;
    const originalOffsetHeight = Object.getOwnPropertyDescriptor(global.HTMLElement.prototype, 'offsetHeight');
    const originalOffsetWidth = Object.getOwnPropertyDescriptor(global.HTMLElement.prototype, 'offsetWidth');
    const originalResizeObserver = window.ResizeObserver;

    const mkSuitesComponent = (initialState = {}) => {
        initialState = defaultsDeep(initialState, {
            view: {
                viewMode: ViewMode.ALL
            }
        });

        return mkConnectedComponent(<Suites />, {initialState});
    };

    beforeEach(() => {
        Object.defineProperty(global.HTMLElement.prototype, 'offsetHeight', {configurable: true, value: 50});
        Object.defineProperty(global.HTMLElement.prototype, 'offsetWidth', {configurable: true, value: 50});

        window.ResizeObserver = sinon.stub();
        window.ResizeObserver.prototype.observe = sinon.stub();
        window.ResizeObserver.prototype.unobserve = sinon.stub();
        window.ResizeObserver.prototype.disconnect = sinon.stub();

        getVisibleRootSuiteIds = sinon.stub().returns([]);

        Suites = proxyquire('lib/static/components/suites', {
            '../modules/selectors/tree': {getVisibleRootSuiteIds}
        }).default;
    });

    afterEach(() => {
        Object.defineProperty(global.HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
        Object.defineProperty(global.HTMLElement.prototype, 'offsetWidth', originalOffsetWidth);

        window.ResizeObserver = originalResizeObserver;

        sandbox.restore();
    });

    it('should not render List component if there are no visible root suite ids', () => {
        getVisibleRootSuiteIds.returns([]);

        const component = mkSuitesComponent();

        expect(component.getByText('There are no tests', {exact: false})).to.exist;
    });

    it('should render few section common components', async () => {
        if (!global.SVGElement) {
            global.SVGElement = global.HTMLElement; // Without this line test throws an error "ReferenceError: SVGElement is not defined"
        }
        getVisibleRootSuiteIds.returns(['suite-id-1', 'suite-id-2']);

        const component = mkSuitesComponent({
            tree: {
                suites: {
                    byId: {
                        'suite-id-1': {name: 'Suite 1', status: 'success'},
                        'suite-id-2': {name: 'Suite 2', status: 'success'}
                    },
                    stateById: {
                        'suite-id-1': {shouldBeShown: true, shouldBeOpened: false},
                        'suite-id-2': {shouldBeShown: true, shouldBeOpened: false}
                    }
                }
            }
        });

        expect(await component.findByText('Suite 1', {exact: false})).to.exist;
        expect(await component.findByText('Suite 2', {exact: false})).to.exist;
    });
});
