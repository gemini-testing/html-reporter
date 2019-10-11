describe('Test details', function() {
    it('should show details', function() {
        return this.browser
            .url('')
            .waitForVisible('.details')
            .click('.details__summary')
            .assertView('details content', '.details', {ignoreElements: [
                '.meta-info__item:nth-child(1)',
                '.meta-info__item:nth-child(4)'
            ]});
    });
});
