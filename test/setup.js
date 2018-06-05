import path from 'path';
import chai from 'chai';
import Promise from 'bluebird';
import Enzyme from 'enzyme';
import EnzymeAdapter from 'enzyme-adapter-react-16';

Enzyme.configure({adapter: new EnzymeAdapter()});

Promise.config({longStackTraces: true});
Promise.promisifyAll(require('fs-extra'));

global.sinon = require('sinon');
global.assert = chai.assert;
global.mount = Enzyme.mount;

chai.use(require('chai-as-promised'));
sinon.assert.expose(chai.assert, {prefix: ''});

require('app-module-path').addPath(path.resolve(__dirname, '..'));
