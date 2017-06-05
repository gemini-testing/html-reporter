'use strict';

const Handlebars = require('handlebars');
const Promise = require('bluebird');
const fs = require('fs-extra');

const view = require('../../lib/view');
const logger = require('../../utils').logger;

describe('Veiw', () => {
    const sandbox = sinon.sandbox.create();
    const handlebarsStub = sandbox.stub();

    beforeEach(() => {
        sandbox.stub(fs, 'mkdirsAsync').returns(Promise.resolve());
        sandbox.stub(fs, 'writeFileAsync').returns(Promise.resolve());
        sandbox.stub(fs, 'copyAsync').returns(Promise.resolve());
        sandbox.stub(fs, 'readFileAsync').returns(Promise.resolve());

        sandbox.stub(Handlebars, 'registerPartial');
        sandbox.stub(Handlebars, 'compile').returns(handlebarsStub);

        sandbox.stub(logger, 'log');
    });

    afterEach(() => sandbox.restore());

    describe('createHtml', () => {
        it('should load templates', () => {
            return view.createHtml().then(() => {
                assert.calledWithMatch(fs.readFileAsync, 'suite.hbs');
                assert.calledWithMatch(fs.readFileAsync, 'state.hbs');
                assert.calledWithMatch(fs.readFileAsync, 'report.hbs');
            });
        });

        it('should register partial named suite using loaded template', () => {
            fs.readFileAsync.withArgs(sinon.match('suite.hbs')).returns(Promise.resolve({suite: 'stub'}));

            return view.createHtml().then(() => {
                assert.calledWith(Handlebars.registerPartial, 'suite', {suite: 'stub'});
            });
        });

        it('should register partial named state using loaded template', () => {
            fs.readFileAsync.withArgs(sinon.match('state.hbs')).returns(Promise.resolve({state: 'stub'}));

            return view.createHtml().then(() => {
                assert.calledWith(Handlebars.registerPartial, 'state', {state: 'stub'});
            });
        });

        it('should compile report preventing indent and using loaded templates', () => {
            fs.readFileAsync.withArgs(sinon.match('report.hbs')).returns(Promise.resolve({report: 'stub'}));

            return view.createHtml().then(() => {
                assert.calledWith(Handlebars.compile, {report: 'stub'}, {preventIndent: true});
            });
        });

        it('should create report using passed model', () => {
            return view.createHtml({model: 'stub'}).then(() => {
                assert.calledWith(handlebarsStub, {model: 'stub'});
            });
        });
    });

    describe('save', () => {
        it('should save html to passed dir', () => {
            return view.save('some-html', 'some/report/dir').then(() => {
                assert.calledWith(fs.mkdirsAsync, 'some/report/dir');
                assert.calledWith(fs.writeFileAsync, 'some/report/dir/index.html', 'some-html');
            });
        });

        it('should copy static files to report dir', () => {
            return view.save('some-html', 'some/report/dir')
                .then(() => {
                    assert.calledWithMatch(fs.copyAsync, 'report.min.js', 'some/report/dir/report.min.js');
                    assert.calledWithMatch(fs.copyAsync, 'report.css', 'some/report/dir/report.css');
                });
        });

        it('should log an error', () => {
            fs.mkdirsAsync.returns(Promise.reject('some-error'));

            return view.save().then(() => assert.calledWith(logger.log, 'some-error'));
        });
    });
});
