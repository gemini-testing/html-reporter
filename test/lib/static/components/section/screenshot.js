import React from 'react';
import LazyLoad from '@gemini-testing/react-lazyload';
import Screenshot from 'lib/static/components/state/screenshot';
import Placeholder from 'lib/static/components/state/placeholder';
import {mkConnectedComponent} from '../utils';

describe('Screenshot component', () => {
    describe('LazyLoad component', () => {
        const getLazyLoadComponent_ = ({lazyLoadOffset = 1} = {}) => {
            const screenshotComponent = mkConnectedComponent(
                <Screenshot image={{path: ''}} />,
                {initialState: {view: {lazyLoadOffset}}}
            );

            return screenshotComponent.find(LazyLoad);
        };

        it('should set "debounce" option', () => {
            const lazyLoadComponent = getLazyLoadComponent_();

            assert.equal(lazyLoadComponent.props().debounce, 50);
        });

        it('should set "once" option', () => {
            const lazyLoadComponent = getLazyLoadComponent_();

            assert.isTrue(lazyLoadComponent.props().once);
        });

        it('should pass offset from store to LazyLoad component', () => {
            const lazyLoadComponent = getLazyLoadComponent_({lazyLoadOffset: 333});

            assert.equal(lazyLoadComponent.props().offset, 333);
        });

        it('should not set placeholder by default', () => {
            const lazyLoadComponent = getLazyLoadComponent_();

            assert.lengthOf(lazyLoadComponent.find(Placeholder), 0);
        });

        it('should set placeholder to LazyLoad component if passed image has size', () => {
            const screenshotComponent = mkConnectedComponent(
                <Screenshot image={{path: '', size: {}}} />,
                {initialState: {view: {lazyLoadOffset: 1}}}
            );

            assert.lengthOf(screenshotComponent.find(Placeholder), 1);
        });
    });
});
