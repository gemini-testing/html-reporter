/* global Handlebars, data */

'use strict';

import Controller from './controller';
import Store from './store';
import View from './view';

const store = new Store(data);
const view = new View(Handlebars.templates);
const controller = new Controller(store, view);

document.addEventListener('DOMContentLoaded', () => controller.setDefaultView());
