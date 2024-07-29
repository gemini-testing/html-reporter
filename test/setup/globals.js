const path = require('path');
const chai = require('chai');
const Promise = require('bluebird');

require('jsdom-global')(``, {
    url: 'http://localhost'
});

Promise.config({longStackTraces: true});

global.sinon = require('sinon');
global.assert = chai.assert;

require.extensions['.styl'] = () => {};
require.extensions['.css'] = () => {};
require.extensions['.less'] = () => {};

chai.use(require('chai-as-promised'));
chai.use(require('chai-dom'));
sinon.assert.expose(chai.assert, {prefix: ''});

require('app-module-path').addPath(path.resolve(__dirname, '..', '..'));
