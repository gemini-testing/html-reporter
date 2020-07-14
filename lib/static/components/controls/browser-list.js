'use strict';

import React, {Component} from 'react';
import {flatten, isEmpty, get, chain, compact} from 'lodash';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import TreeSelect, {SHOW_PARENT} from 'rc-tree-select';

import 'rc-tree-select/assets/index.less';

const ROOT_NODE_ID = 'ROOT_NODE_ID';

export default class BrowserList extends Component {
    static propTypes = {
        available: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string,
            versions: PropTypes.arrayOf(PropTypes.string)
        })).isRequired,
        selected: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string,
            versions: PropTypes.arrayOf(PropTypes.string)
        })),
        onChange: PropTypes.func.isRequired
    }

    _buildComplexId(browserId, version) {
        return version
            ? `${browserId} (${version})`
            : browserId;
    }

    _prepareTreeData() {
        const {available} = this.props;
        const mkNode = (parentId, browserId, version) => {
            const id = this._buildComplexId(browserId, version);

            return {
                pId: parentId,
                key: id,
                label: id,
                value: id,
                data: {id, browserId, version}
            };
        };

        const tree = available.map(({id: browserId, versions = []}) => {
            if (isEmpty(versions) || versions.length === 1) {
                return mkNode(ROOT_NODE_ID, browserId);
            }

            const rootNode = mkNode(ROOT_NODE_ID, browserId);
            const subNodes = versions.map((version) => mkNode(rootNode.key, browserId, version));

            return [].concat(rootNode, subNodes);
        });

        return flatten(tree);
    }

    _buidSelectedItems() {
        const {available, selected = []} = this.props;
        const selectedItems = selected.map(({id, versions}) => {
            const availableNode = available.find((item) => item.id === id);
            const shouldDrawOnlyRootNode = get(availableNode, 'versions', []).length === 1 || isEmpty(versions);

            if (shouldDrawOnlyRootNode) {
                return this._buildComplexId(id);
            }

            return versions.map((version) => this._buildComplexId(id, version));
        });

        return flatten(selectedItems);
    }

    _formatSelectedData(selectedItems) {
        const treeDataMap = this._simpleTree.reduce((map, item) => {
            map[item.value] = item.data;

            return map;
        }, {});

        return chain(selectedItems)
            .reduce((map, id) => {
                const {browserId, version} = treeDataMap[id] || {};
                const versions = map[browserId] || [];

                versions.push(version);

                map[browserId] = versions;

                return map;
            }, {})
            .map((versions, id) => ({id, versions: compact(versions)}))
            .value();
    }

    _shouldNotRender() {
        return isEmpty(this.props.available);
    }

    render() {
        if (this._shouldNotRender()) {
            return (<div></div>);
        }

        this._simpleTree = this._prepareTreeData();

        const treeDataSimpleMode = {id: 'key', rootPId: ROOT_NODE_ID};
        const hasNestedLevels = this._simpleTree.find(node => node.pId !== ROOT_NODE_ID);
        const removeIcon = (<i className="fa fa-times browserlist__icon-remove" aria-hidden="true"></i>);
        const switcherIcon = (item) => {
            if (item.isLeaf) {
                return;
            }

            return item.expanded
                ? <i className="fa fa-minus browserlist__icon-tree" aria-hidden="true"></i>
                : <i className="fa fa-plus browserlist__icon-tree" aria-hidden="true"></i>;
        };
        const dropdownClassName = classNames(
            {'browserlist_linear': !hasNestedLevels},
        );

        return (
            <div className="browserlist">
                <TreeSelect
                    style={{
                        width: 'auto',
                        minWidth: '220px',
                        maxWidth: '400px'
                    }}
                    dropdownStyle={{
                        height: 'auto',
                        width: '300px',
                        overflow: 'hidden',
                        zIndex: 50
                    }}
                    dropdownClassName={dropdownClassName}
                    switcherIcon={switcherIcon}
                    defaultValue={this._buidSelectedItems()}
                    showSearch={false}
                    treeCheckable
                    placeholder="Browsers"
                    treeData={this._simpleTree}
                    treeNodeFilterProp="title"
                    treeDataSimpleMode={treeDataSimpleMode}
                    showCheckedStrategy={SHOW_PARENT}
                    removeIcon={removeIcon}
                    treeIcon={<i></i>}
                    onChange={(selected) => this.props.onChange(this._formatSelectedData(selected))}
                    maxTagCount={2}
                />
            </div>
        );
    }
}
