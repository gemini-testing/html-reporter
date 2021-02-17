describe('Error group', function() {
    afterEach(function() {
        this.browser.localStorage('DELETE');
    });

    it('should show errors', function() {
        return this.browser
            .url('')
            .waitForVisible('.common-controls')
            .execute(() => {
                document.querySelectorAll('.common-controls .button').forEach((btn) => {
                    btn.setAttribute('title', btn.innerText);
                });
            })
            .click('.button[title="Group by error"]')
            .assertView('error group', '.error-group');
    });
});
