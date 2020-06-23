describe('success describe', function() {
    it('succesfully passed test', function() {
        return this.browser
            .url('')
            .then(() => assert.isTrue(true));
    });

    it('test with screenshot', function() {
        return this.browser
            .url('')
            .assertView('header', 'header');
    });
});
