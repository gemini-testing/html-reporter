'use strict';

import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ClipboardButton from 'react-clipboard.js';

class SectionTitle extends Component {
    static propTypes = {
        name: PropTypes.string.isRequired,
        suitePath: PropTypes.array,
        handler: PropTypes.func.isRequired
    }

    render() {
        const {name, suitePath, handler} = this.props;

        return (
            <div className="section__title" onClick={handler}>
                {name}
                {this._drawCopyButton(suitePath)}
            </div>
        );
    }

    _drawCopyButton(suitePath) {
        if (!suitePath) {
            return null;
        }

        return (
            <ClipboardButton
                className="button section__icon section__icon_copy-to-clipboard"
                title="copy to clipboard"
                data-clipboard-text={suitePath}>
            </ClipboardButton>
        );
    }
}

export default SectionTitle;
