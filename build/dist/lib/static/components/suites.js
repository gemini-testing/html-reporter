"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var react_1 = tslib_1.__importStar(require("react"));
var react_redux_1 = require("react-redux");
var section_common_1 = tslib_1.__importDefault(require("./section/section-common"));
var redux_1 = require("redux");
var actions_1 = require("../modules/actions");
var clientEvents = require('../../gui/constants/client-events');
var Suites = /** @class */ (function (_super) {
    tslib_1.__extends(Suites, _super);
    function Suites() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    Suites.prototype.componentDidMount = function () {
        this.props.gui && this._subscribeToEvents();
    };
    Suites.prototype._subscribeToEvents = function () {
        var _this = this;
        var actions = this.props.actions;
        var eventSource = new EventSource('/events');
        eventSource.addEventListener(clientEvents.BEGIN_SUITE, function (e) {
            var data = JSON.parse(e.data);
            actions.suiteBegin(data);
        });
        eventSource.addEventListener(clientEvents.BEGIN_STATE, function (e) {
            var data = JSON.parse(e.data);
            actions.testBegin(data);
        });
        [clientEvents.TEST_RESULT, clientEvents.ERROR].forEach(function (eventName) {
            eventSource.addEventListener(eventName, function (e) {
                var data = JSON.parse(e.data);
                actions.testResult(data);
            });
        });
        eventSource.addEventListener(clientEvents.END, function () {
            _this.props.actions.testsEnd();
        });
    };
    Suites.prototype.render = function () {
        var suiteIds = this.props.suiteIds;
        return (react_1.default.createElement("div", { className: 'sections' }, suiteIds && suiteIds.map(function (suiteId) {
            return react_1.default.createElement(section_common_1.default, { key: suiteId, suiteId: suiteId });
        })));
    };
    return Suites;
}(react_1.Component));
var actions = { testBegin: actions_1.testBegin, suiteBegin: actions_1.suiteBegin, testResult: actions_1.testResult, testsEnd: actions_1.testsEnd };
exports.default = react_redux_1.connect(function (state) { return ({
    suiteIds: state.suiteIds[state.view.viewMode],
    gui: state.gui
}); }, function (dispatch) { return ({ actions: redux_1.bindActionCreators(actions, dispatch) }); })(Suites);
//# sourceMappingURL=suites.js.map