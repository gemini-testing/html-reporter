'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {Dropdown} from 'semantic-ui-react';
import {isEmpty} from 'lodash';
import 'semantic-ui-css/components/dropdown.min.css';

class MenuBar extends Component {
    static propTypes = {extraItems: PropTypes.object.isRequired};

    _getItems(extraItems) {
        return Object.keys(extraItems).map((key, i) => (
            <Dropdown.Item key={i}>
                <a className="menu-item__link" href={extraItems[key]}>{key}</a>
            </Dropdown.Item>
        ));
    }

    render() {
        const {extraItems} = this.props;

        if (isEmpty(extraItems)) {
            return null;
        }

        return (
            <Dropdown item icon="bar" simple direction="left">
                <Dropdown.Menu>
                    {this._getItems(extraItems)}
                </Dropdown.Menu>
            </Dropdown>
        );
    }
}

export default connect(({apiValues: {extraItems}}) => ({extraItems}))(MenuBar);
