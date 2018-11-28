'use strict';
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import store from './modules/store';
import Report from './components/report';
var rootEl = document.querySelector('#app');
render(React.createElement(Provider, { store: store },
    React.createElement(Report, null)), rootEl);
//# sourceMappingURL=index.js.map