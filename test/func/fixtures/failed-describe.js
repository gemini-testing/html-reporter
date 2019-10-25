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

    it('test with long error message', function() {
        return this.browser
            .then(() => {
                throw new Error(`long_error_message ${'0123456789'.repeat(20)}\n message content`);
            });
    });
});
