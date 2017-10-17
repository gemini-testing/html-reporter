/* global _ */

'use strict';

import Clipboard from 'clipboard';
import url from 'url';
import {querySelector, querySelectorAll, $byId, $on} from './helpers';

export default class View {
    constructor(templates) {
        this._templates = templates;
    }

    renderHeader(data) {
        this._render(this._templates['report'](data));
        this._handleControlButtons();
        this._rootSection = querySelector('.sections');
        this._captureClickEventsOn(this._rootSection);
    }

    rerenderSuites(suites) {
        const html = suites.map(this._templates['suite']).join('');
        this._render(html, {target: this._rootSection, rewrite: true});
        this._prepareSections();
    }

    expandAll() {
        View._loadLazyImages(document, '.section_collapsed .tab__item_active img');
        this._sectionElems.forEach((section) => section.classList.remove('section_collapsed'));
    }

    collapseAll() {
        this._sectionElems.forEach((section) => section.classList.add('section_collapsed'));
    }

    expandErrors() {
        View._loadLazyImages(document, '.section_status_fail > .section__body > .image-box .tab__item_active img');
        this._expandSectionsWith({selector: 'section_status_fail'});
    }

    expandRetries() {
        View._loadLazyImages(document, '.has-retries > .section__body > .image-box .tab__item_active img');
        this._expandSectionsWith({selector: 'has-retries'});
    }

    bindViewModeSwitcher(handler) {
        const viewModeSelect = $byId('viewMode');
        $on(viewModeSelect, 'change', (event) => handler(event.target.value));
    }

    toggleOverlay() {
        querySelector('.overlay').classList.toggle('invisible');
    }

    static showSkippedList() {
        $byId('showSkipped').classList.toggle('pressed');
        $byId('skippedList').classList.toggle('collapsed');
    }

    _render(html, opts = {}) {
        _.defaults(opts, {
            target: document.body,
            where: 'afterBegin',
            rewrite: false
        });

        if (opts.rewrite) {
            opts.target.innerHTML = html;
        } else {
            opts.target.insertAdjacentHTML(opts.where, html);
        }
    }

    _prepareSections() {
        this._sectionElems = querySelectorAll('.section');
        this._handleSectionButtons();
        View._stopPropogationOn('.button', 'click');
    }

    _handleControlButtons() {
        $on($byId('expandAll'), 'click', this.expandAll.bind(this));
        $on($byId('collapseAll'), 'click', this.collapseAll.bind(this));
        $on($byId('expandErrors'), 'click', this.expandErrors.bind(this));
        $on($byId('showSkipped'), 'click', View.showSkippedList);
        $on($byId('showRetries'), 'click', this.expandRetries.bind(this));
        $on($byId('showOnlyDiff'), 'click', View._toggleVisibility);
    }

    _captureClickEventsOn(elem) {
        $on(elem, 'click', ({target}) => {
            if (target.classList.contains('cswitcher__item')) {
                View._handleColorSwitcher(target);
            }

            if (target.classList.contains('tab-switcher__button')) {
                View._handleRetriesSwitcher(target);
            }

            if (target.classList.contains('meta-info__switcher')) {
                View._toggleMetaInfo(target);
            }
        });
    }

    _handleSectionButtons() {
        this._sectionElems.forEach((section) => {
            $on(querySelector('.section__title', section), 'click', () => {
                View._loadLazyImages(section, ':scope > .section__body > .image-box .tab__item_active img');
                section.classList.toggle('section_collapsed');
            });
        });

        View._handleClipboard();
        View._handleHostChange();
    }

    _expandSectionsWith(opts = {}) {
        this._sectionElems.forEach((section) => {
            if (section.classList.contains(opts.selector)) {
                section.classList.remove('section_collapsed');
            } else {
                section.classList.add('section_collapsed');
            }
        });
    }

    static _handleColorSwitcher(target) {
        const sources = _.filter(target.parentNode.childNodes, (node) => {
            return node.nodeType === Node.ELEMENT_NODE;
        });

        const imageBox = target.closest('.image-box');

        sources.forEach((item) => item.classList.remove('cswitcher__item_selected'));
        imageBox.classList.forEach((cls) => {
            if (/cswitcher_color_\d+/.test(cls)) {
                imageBox.classList.remove(cls);
            }
        });

        target.classList.add('cswitcher__item_selected');
        imageBox.classList.add(`cswitcher_color_${target.dataset.id}`);
    }

    static _handleRetriesSwitcher(target) {
        const switch_ = (elem, selector, target) => {
            _.forEach(elem.children, (item) => {
                item.classList.remove(selector);

                if (target.getAttribute('data-position') === item.getAttribute('data-position')) {
                    item.classList.add(selector);
                }
            });
        };

        const imageBox = target.closest('.image-box');

        switch_(querySelector('.tab', imageBox), 'tab__item_active', target);
        switch_(querySelector('.tab-switcher', imageBox), 'tab-switcher__button_active', target);
        View._loadLazyImages(imageBox, '.tab__item_active img');
    }

    static _toggleMetaInfo(target) {
        target.closest('.meta-info').classList.toggle('meta-info_collapsed');
    }

    static _handleClipboard() {
        querySelectorAll('.section__icon_copy-to-clipboard').forEach((clipboard) => new Clipboard(clipboard));
    }

    static _handleHostChange() {
        const textInput = $byId('viewHostInput');
        const viewButtons = querySelectorAll('.section__icon_view-local');

        const setViewLinkHost = (host) => {
            viewButtons.forEach((item) => {
                let href = item.dataset.suiteViewLink;
                let parsedHost;

                if (host) {
                    parsedHost = url.parse(host, false, true);
                    // extending current url from entered host
                    href = url.format(Object.assign(
                        url.parse(href),
                        {
                            host: parsedHost.slashes ? parsedHost.host : host,
                            protocol: parsedHost.slashes ? parsedHost.protocol : null,
                            hostname: null,
                            port: null
                        }
                    ));
                }
                item.setAttribute('href', href);
            });
        };

        $on(textInput, 'change', () => {
            setViewLinkHost(textInput.value);
            // will save host to local storage
            if (window.localStorage) {
                window.localStorage.setItem('_gemini-replace-host', textInput.value);
            }
        });

        // read saved host from local storage
        if (window.localStorage) {
            const host = window.localStorage.getItem('_gemini-replace-host');
            if (host) {
                setViewLinkHost(host);
                textInput.value = host;
            }
        }
    }

    static _stopPropogationOn(selector, event) {
        querySelectorAll(selector).forEach((button) => $on(button, event, (e) => e.stopPropagation()));
    }

    static _toggleVisibility(event) {
        const target = event.target;
        target.classList.toggle('button_checked');
        document.body.classList.toggle(`report_show-only-${target.dataset.type}`);
    }

    static _loadLazyImages(elem, selector) {
        querySelectorAll(selector, elem).forEach((img) => {
            if (img.dataset.src && img.src !== img.dataset.src) {
                img.src = img.dataset.src;
            }
        });
    }
}
