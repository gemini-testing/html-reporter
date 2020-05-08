'use strict';

import React, {Component} from 'react';
import {flatten, isEmpty} from 'lodash';
import PropTypes from 'prop-types';
import TreeSelect, {SHOW_PARENT} from 'rc-tree-select';

import 'rc-tree-select/assets/index.less';

export default class BrowserList extends Component {
    static propTypes = {
        available: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string
        })).isRequired,
        selected: PropTypes.arrayOf(PropTypes.string).isRequired,
        onChange: PropTypes.func.isRequired
    }

    _prepareTreeData() {
        const {available} = this.props;
        const mkNode = (value, parentId) => ({
            pId: parentId,
            label: value,
            key: value,
            value
        });

        return available.map(({id}) => mkNode(id, 0));
    }

    _shouldNotRender() {
        return isEmpty(this.props.available);
    }

    render() {
        if (this._shouldNotRender()) {
            return (<div></div>);
        }

        const {selected, onChange} = this.props;
        const tree = this._prepareTreeData();
        const treeDataSimpleMode = {id: 'key', rootPId: 0};
        const removeIcon = (<i className="fa fa-times browserlist__icon-remove" aria-hidden="true"></i>);

        return (
            <div className="browserlist">
                <TreeSelect
                    style={{
                        width: 'auto',
                        minWidth: '150px',
                        maxWidth: '400px'
                    }}
                    dropdownStyle={{
                        height: 'auto',
                        width: '300px',
                        overflow: 'hidden',
                        zIndex: 50
                    }}
                    defaultValue={selected}
                    showSearch={false}
                    treeCheckable
                    placeholder="Browsers"
                    treeData={flatten(tree)}
                    treeNodeFilterProp="title"
                    treeDataSimpleMode={treeDataSimpleMode}
                    showCheckedStrategy={SHOW_PARENT}
                    removeIcon={removeIcon}
                    treeIcon={<i></i>}
                    onChange={onChange}
                    maxTagCount={2}
                />
            </div>
        );
    }
}
