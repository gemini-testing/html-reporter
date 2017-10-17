'use strict';

export default class Controller {
    constructor(store, view) {
        this._store = store;
        this._view = view;
    }

    setDefaultView() {
        this._view.renderHeader(this._store.getHeaderData());
        this._renderSuites(this._store.config.defaultView);
        this._view.toggleOverlay();
        this._view.bindViewModeSwitcher(this._changeViewMode.bind(this));

        // по умолчанию выводить ошибки раскрытыми
        this._view.expandErrors();
    }

    _renderSuites(mode) {
        switch (mode) {
            case 'failed': {
                this._renderFailedSuites();
                break;
            }
            default: {
                this._renderAllSuites();
                break;
            }
        }
    }

    _renderAllSuites() {
        const {suites} = this._store.getAllData();
        this._view.rerenderSuites(suites);
    }

    _renderFailedSuites() {
        const errorSuites = this._store.getErrorSuites();
        this._view.rerenderSuites(errorSuites);
    }

    _changeViewMode(mode) {
        this._view.toggleOverlay();
        // TODO: исправить этот хак для отображения оверлея с прелоадером
        setTimeout(() => {
            this._renderSuites(mode);
            this._view.toggleOverlay();
            this._view.expandErrors();
        }, 50);
    }
}
