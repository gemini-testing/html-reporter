'use strict';

import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {Dropdown} from 'semantic-ui-react';
import {isEmpty} from 'lodash';
import 'semantic-ui-css/components/dropdown.css';
import 'semantic-ui-css/components/icon.css';

class MenuBar extends Component {
    static propTypes = {extraItems: PropTypes.object.isRequired};

    _getItems(extraItems) {
        return Object.keys(extraItems).map((key, i) => (
            <Dropdown.Item key={i}>
                <a href={extraItems[key]}>{key}</a>
            </Dropdown.Item>
        ));
    }

    render() {
        const {extraItems} = this.props;

        if (isEmpty(extraItems)) {
            return (<Fragment/>);
        }

        return (
            <div className="menubar-container">
                <Dropdown item icon='bars' simple direction='left'>
                    <Dropdown.Menu>
                        {this._getItems(extraItems)}
                    </Dropdown.Menu>
                </Dropdown>
            </div>
        );
    }
}

export default connect(({extraItems}) => ({extraItems}))(MenuBar);
