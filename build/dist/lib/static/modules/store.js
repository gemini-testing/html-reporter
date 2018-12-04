"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var redux_1 = require("redux");
var redux_thunk_1 = tslib_1.__importDefault(require("redux-thunk"));
var redux_logger_1 = tslib_1.__importDefault(require("redux-logger"));
var reducer_1 = tslib_1.__importDefault(require("./reducer"));
var middlewares = [redux_thunk_1.default];
if (process.env.NODE_ENV !== 'production') {
    // @ts-ignore
    middlewares.push(redux_logger_1.default);
}
exports.default = redux_1.compose(redux_1.applyMiddleware.apply(void 0, middlewares))(redux_1.createStore)(reducer_1.default);
//# sourceMappingURL=store.js.map