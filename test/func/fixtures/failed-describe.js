describe('failed describe', function() {
    it('succesfully passed test', function() {
        return this.browser
            .url('')
            .then(() => assert.isTrue(true));
    });

    it('test without screenshot', function() {
        return this.browser
            .url('')
            .assertView('header', 'header');
    });
});
