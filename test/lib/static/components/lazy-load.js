import React from 'react';
import LazyLoad from 'lib/static/components/lazy-load';

describe('<LazyLoad />', () => {
    let IntersectionObserver;

    beforeEach(() => {
        IntersectionObserver = sinon.spy(function() {
            this.observe = sinon.spy();
            this.disconnect = sinon.spy();
        });
        global.IntersectionObserver = IntersectionObserver;
    });

    afterEach(() => {
        delete global.IntersectionObserver;
        IntersectionObserver = null;
    });

    it('should create IntersectionObserver', () => {
        const component = mount(<LazyLoad offsetVertical={1}><i/></LazyLoad>);

        assert.calledWithExactly(IntersectionObserver, sinon.match.func, {rootMargin: '1px 0px'});
        assert.calledWithExactly(IntersectionObserver.lastCall.returnValue.observe, component.ref('target'));
    });

    it('should be empty until appeared in view', () => {
        const component = mount(<LazyLoad offsetVertical={1}><i/></LazyLoad>);

        assert.lengthOf(component.update().find('i'), 0);
    });

    it('should have children when appeared in view', () => {
        const component = mount(<LazyLoad offsetVertical={1}><i/></LazyLoad>);

        IntersectionObserver.lastCall.args[0]([{isIntersecting: true}]);

        assert.lengthOf(component.update().find('i'), 1);
        assert.calledWithExactly(IntersectionObserver.lastCall.returnValue.disconnect);
    });

    it('should recreate IntersectionObserver when received props before appeared in view', () => {
        const component = mount(<LazyLoad offsetVertical={1}><i/></LazyLoad>);

        component.setProps({offsetVertical: 2});

        assert.calledWithExactly(IntersectionObserver, sinon.match.func, {rootMargin: '2px 0px'});
        assert.calledTwice(IntersectionObserver);
        assert.calledOnce(IntersectionObserver.firstCall.returnValue.observe);
        assert.calledOnce(IntersectionObserver.firstCall.returnValue.disconnect);
        assert.calledOnce(IntersectionObserver.lastCall.returnValue.observe);
        assert.notCalled(IntersectionObserver.lastCall.returnValue.disconnect);
    });

    it('should not recreate IntersectionObserver when received props after appeared in view', () => {
        const component = mount(<LazyLoad offsetVertical={1}><i/></LazyLoad>);

        IntersectionObserver.lastCall.args[0]([{isIntersecting: true}]);
        component.setProps({offsetVertical: 2});

        assert.calledOnce(IntersectionObserver);
        assert.calledOnce(IntersectionObserver.firstCall.returnValue.observe);
        assert.calledOnce(IntersectionObserver.firstCall.returnValue.disconnect);
    });
});
