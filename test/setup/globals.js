const path = require('path');
const chai = require('chai');
const Promise = require('bluebird');

require('jsdom-global')(``, {
    url: 'http://localhost',
    pretendToBeVisual: true
});

Promise.config({longStackTraces: true});

global.sinon = require('sinon');
global.assert = chai.assert;

require.extensions['.styl'] = () => {};
require.extensions['.css'] = () => {};
require.extensions['.less'] = () => {};
require.extensions['.module.css'] = function(module) {
    module.exports = require('./css-modules-mock').cssModulesMock;
};

chai.use(require('chai-as-promised'));
chai.use(require('chai-deep-equal-ignore-undefined'));
chai.use(require('chai-subset'));
chai.use(require('chai-dom'));
sinon.assert.expose(chai.assert, {prefix: ''});

const projectRoot = path.resolve(__dirname, '..', '..');

// Resolving imports like lib/.../
require('app-module-path').addPath(projectRoot);

// Resolving webpack alias imports like @/.../
try {
    const fs = require('fs');
    fs.symlinkSync(path.join(projectRoot, 'lib'), path.join(projectRoot, '@'));
} catch (e) {
    if (e.code !== 'EEXIST') {
        throw e;
    }
}
