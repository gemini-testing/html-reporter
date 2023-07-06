const path = require('path');
const chai = require('chai');
const Promise = require('bluebird');
const Enzyme = require('enzyme');
const EnzymeAdapter = require('enzyme-adapter-react-16');

Enzyme.configure({adapter: new EnzymeAdapter()});

Promise.config({longStackTraces: true});

global.sinon = require('sinon');
global.assert = chai.assert;
global.mount = Enzyme.mount;

require.extensions['.styl'] = () => {};
require.extensions['.css'] = () => {};

chai.use(require('chai-as-promised'));
sinon.assert.expose(chai.assert, {prefix: ''});

require('app-module-path').addPath(path.resolve(__dirname, '..'));
