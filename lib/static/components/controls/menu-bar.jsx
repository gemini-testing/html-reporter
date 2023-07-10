'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {Dropdown} from 'semantic-ui-react';
import {isEmpty} from 'lodash';
import ExtensionPoint from '../extension-point';
import plugins from '../../modules/plugins';
import {MENU_BAR} from '../../../constants/extension-points';

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

        const hasMenuBarPlugins = plugins.getLoadedConfigs()
            .some(e => e.point === MENU_BAR);

        if (isEmpty(extraItems) && !hasMenuBarPlugins) {
            return null;
        }

        return (
            <div className="menu-bar">
                <Dropdown item icon="bars" simple direction="left">
                    <Dropdown.Menu>
                        <ExtensionPoint name={MENU_BAR}>
                            {this._getItems(extraItems)}
                        </ExtensionPoint>
                    </Dropdown.Menu>
                </Dropdown>
            </div>
        );
    }
}

export default connect(({apiValues: {extraItems}}) => ({extraItems}))(MenuBar);
