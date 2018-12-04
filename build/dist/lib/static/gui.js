'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importDefault(require("react"));
var react_dom_1 = require("react-dom");
var react_redux_1 = require("react-redux");
var gui_1 = tslib_1.__importDefault(require("./components/gui"));
var store_1 = tslib_1.__importDefault(require("./modules/store"));
var rootEl = document.querySelector('#app');
react_dom_1.render(react_1.default.createElement(react_redux_1.Provider, { store: store_1.default },
    react_1.default.createElement(gui_1.default, null)), rootEl);
//# sourceMappingURL=gui.js.map