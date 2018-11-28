var path = require('path');
var chai = require('chai');
var sinon = require('sinon');
var Promise = require('bluebird');
var Enzyme = require('enzyme');
var EnzymeAdapter = require('enzyme-adapter-react-16');
Enzyme.configure({ adapter: new EnzymeAdapter() });
Promise.config({ longStackTraces: true });
Promise.promisifyAll(require('fs-extra'));
global.sinon = sinon;
global.assert = chai.assert;
global.mount = Enzyme.mount;
chai.use(require('chai-as-promised'));
sinon.assert.expose(chai.assert, { prefix: '' });
require('app-module-path').addPath(path.resolve(__dirname, '..'));
//# sourceMappingURL=setup.js.map