describe('Test header', function() {
    it('should show tests summary', function() {
        return this.browser
            .url('')
            .waitForVisible('.summary')
            .assertView('summary', '.summary', {ignoreElements: ['.summary__value']});
    });

    it('should add date to report', function() {
        return this.browser
            .url('')
            .waitForVisible('.header__date');
    });
});
