'use strict';

export default class Controller {
    constructor(store, view) {
        this._store = store;
        this._view = view;
    }

    setDefaultView() {
        this._renderAllData();
        this._view.toggleOverlay();
        this.initRerenderHandlers();
        // TODO: по умолчанию выводить ошибки раскрытыми
        this._view.expandErrors();
    }

    initRerenderHandlers() {
        this._view.bindShowOnlyErrors(this._showOnlyErrors.bind(this));
    }

    _renderAllData() {
        const data = this._store.getAllData();
        this._view.renderAllData(data);
    }

    _renderAllSuites() {
        const {suites} = this._store.getAllData();
        this._view.rerenderSuites(suites);
    }

    _renderFailedSuites() {
        const errorSuites = this._store.getErrorSuites();
        this._view.rerenderSuites(errorSuites);
    }

    _showOnlyErrors(isOnlyErrorsMode) {
        this._view.toggleOverlay();
        // TODO: исправить этот хак для отображения оверлея с прелоадером
        setTimeout(() => {
            isOnlyErrorsMode ? this._renderFailedSuites() : this._renderAllSuites();
            this._view.toggleOverlay();
            this._view.expandErrors();
        }, 50);
    }
}
