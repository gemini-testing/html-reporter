'use strict';

import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {isEmpty} from 'lodash';
import ExtensionPoint from '../extension-point';
import * as plugins from '../../modules/plugins';
import {MENU_BAR} from '../../../constants/extension-points';
import {Button, DropdownMenu, Icon, Menu} from '@gravity-ui/uikit';
import {Bars} from '@gravity-ui/icons';
import classNames from 'classnames';

class MenuBar extends Component {
    static propTypes = {extraItems: PropTypes.object.isRequired};

    _getItems(extraItems) {
        return Object.keys(extraItems).map((key, i) => (
            <Menu.Item key={i} onClick={() => {}} className='menu-bar__content_item'>
                <a href={extraItems[key]}>{key}</a>
            </Menu.Item>
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
            <div className="menu-bar" data-test-id='menu-bar'>
                <DropdownMenu size='m' renderSwitcher={({className, ...props}) => (
                    <Button className={classNames('menu-bar__dropdown', className)}{...props} view="flat">
                        <Icon size={16} data={Bars} />
                    </Button>
                )}>
                    <Menu size='m' className='menu-bar__content'>
                        <ExtensionPoint name={MENU_BAR}>
                            {this._getItems(extraItems)}
                        </ExtensionPoint>
                    </Menu>
                </DropdownMenu>
            </div>
        );
    }
}

export default connect(({apiValues: {extraItems}}) => ({extraItems}))(MenuBar);
