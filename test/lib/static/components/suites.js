import React, {Component} from 'react';
import LazilyRender from '@gemini-testing/react-lazily-render';
import proxyquire from 'proxyquire';
import {defaultsDeep} from 'lodash';

import {mkConnectedComponent} from './utils';
import {mkState} from '../../../utils';
import {config} from 'lib/constants/defaults';
import clientEvents from 'lib/constants/client-events';

describe('<Suites/>', () => {
    let Suites;
    const SectionCommonStub = class SectionCommonStub extends Component {
        render() {
            return <div></div>;
        }
    };

    const mkSuitesComponent = (initialState = {}) => {
        initialState = defaultsDeep(initialState, {
            gui: false,
            suiteIds: {all: ['suite1']},
            suites: {'suite1': mkState({
                suitePath: ['suite1']
            })},
            view: {viewMode: 'all', filteredBrowsers: [], lazyLoadOffset: config.lazyLoadOffset}
        });

        return mkConnectedComponent(<Suites />, {initialState});
    };

    beforeEach(() => {
        Suites = proxyquire('lib/static/components/suites', {
            './section/section-common': {
                default: SectionCommonStub
            }
        }).default;
    });

    it('should wrap suite with Lazy-renderer component by default', () => {
        const suitesComponent = mkSuitesComponent();

        assert.lengthOf(suitesComponent.find(LazilyRender), 1);
    });

    it('should pass to Lazy-renderer component "lazyLoadOffset" option', () => {
        const suitesComponent = mkSuitesComponent({view: {lazyLoadOffset: 100}});
        const lazyRendererProps = suitesComponent.find(LazilyRender).props();

        assert.equal(lazyRendererProps.offset, 100);
    });

    it('should pass to Lazy-renderer component event name to update suite', () => {
        const suitesComponent = mkSuitesComponent();
        const lazyRendererProps = suitesComponent.find(LazilyRender).props();

        assert.equal(lazyRendererProps.eventToUpdate, clientEvents.VIEW_CHANGED);
    });

    it('should not wrap suite with Lazy-renderer component if lazyLoadOffset was disabled', () => {
        const suitesComponent = mkSuitesComponent({view: {lazyLoadOffset: 0}});

        assert.lengthOf(suitesComponent.find(LazilyRender), 0);
    });
});
