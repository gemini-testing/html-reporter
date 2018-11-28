'use strict';
import React from 'react';
import { render } from 'react-dom';
import { Provider } from 'react-redux';
import store from './modules/store';
import Gui from './components/gui';
var rootEl = document.querySelector('#app');
render(React.createElement(Provider, { store: store },
    React.createElement(Gui, null)), rootEl);
//# sourceMappingURL=gui.js.map