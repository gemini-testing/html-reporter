describe('Test summary', function() {
    it('should show tests summary', function() {
        return this.browser
            .url('')
            .waitForVisible('.summary')
            .assertView('summary', '.summary', {ignoreElements: ['.summary__date', '.summary__value']});
    });

    it('should add date to report', function() {
        return this.browser
            .url('')
            .waitForVisible('.summary__date');
    });
});
