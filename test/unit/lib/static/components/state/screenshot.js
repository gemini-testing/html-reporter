import React from 'react';
import LazyLoad from '@gemini-testing/react-lazyload';
import Screenshot from 'lib/static/components/state/screenshot';
import Placeholder from 'lib/static/components/state/placeholder';
import {mkConnectedComponent} from '../utils';

describe('Screenshot component', () => {
    it('should encode symbols in path', () => {
        const screenshotComponent = mkConnectedComponent(
            <Screenshot image={{path: 'images/$/path'}} />,
            {initialState: {view: {}}}
        );

        const image = screenshotComponent.find('img');

        assert.equal(image.getDOMNode().src, 'images/%24/path');
    });

    it('should replace backslashes with slashes for screenshots', () => {
        const screenshotComponent = mkConnectedComponent(
            <Screenshot image={{path: 'images\\path'}} />,
            {initialState: {view: {}}}
        );

        const image = screenshotComponent.find('img');

        assert.equal(image.getDOMNode().src, 'images/path');
    });

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

        it('should not use lazyLoad wrapper if "noLazyLoad" prop was set', () => {
            const screenshotComponent = mkConnectedComponent(
                <Screenshot image={{path: '', size: {}}} noLazyLoad={true} />,
                {initialState: {view: {lazyLoadOffset: 100}}}
            );

            assert.lengthOf(screenshotComponent.find(LazyLoad), 0);
        });
    });

    describe('should render placeholder with', () => {
        it('"width" prop equal to passed image width', () => {
            const screenshotComponent = mkConnectedComponent(
                <Screenshot image={{path: '', size: {width: 200}}} />,
                {initialState: {view: {lazyLoadOffset: 100}}}
            );

            assert.equal(screenshotComponent.find(Placeholder).prop('width'), 200);
        });

        it('"paddingTop" prop calculated depending on width and height of the image', () => {
            const screenshotComponent = mkConnectedComponent(
                <Screenshot image={{path: '', size: {width: 200, height: 100}}} />,
                {initialState: {view: {lazyLoadOffset: 10}}}
            );

            assert.equal(screenshotComponent.find(Placeholder).prop('paddingTop'), '50.00%');
        });
    });
});
