'use strict';

import React, {useState, useMemo, useEffect, useCallback} from 'react';
import {flatten, isEmpty, get, chain, compact} from 'lodash';
import PropTypes from 'prop-types';
import CheckboxTree from 'react-checkbox-tree';

import Label from './label';
import {mkBrowserIcon, buildComplexId} from './utils';
import Popup from '../../popup';
import ArrayContainer from '../../../containers/array';

import 'react-checkbox-tree/lib/react-checkbox-tree.css';
import './index.styl';

const BrowserList = (props) => {
    const {available, onChange, selected: selectedProp} = props;

    const [expanded, setExpanded] = useState([]);
    const [selected, setSelected] = useState(buidSelectedItems());
    const [elements, setElements] = useState([]);
    const treeDataMap = useMemo(buildTreeDataMap, [available]);
    const nodes = useMemo(prepareTreeData, [available]);
    const selectAll = useCallback(_selectAll, [setExpanded, treeDataMap]);

    useEffect(() => {
        updateLabels();
        onChange && onChange(formatSelectedData(selected));
    }, [selected]);

    function buildTreeDataMap() {
        return available.reduce((acc, {id: browserId, versions}) => {
            const hasChildren = !isEmpty(versions) && versions.length > 1;

            acc[buildComplexId(browserId)] = {browserId, isLeaf: !hasChildren};

            if (hasChildren) {
                versions.forEach(version => {
                    acc[buildComplexId(browserId, version)] = {browserId, version, isLeaf: true};
                });
            }

            return acc;
        }, {});
    }

    function buidSelectedItems() {
        if (!selectedProp || !selectedProp.length) {
            return [];
        }

        const selectedItems = selectedProp.map(({id, versions}) => {
            if (!versions) {
                return [];
            }

            const availableNode = available.find((item) => item.id === id);
            const shouldDrawOnlyRootNode = get(availableNode, 'versions.length', 1) === 1;

            if (shouldDrawOnlyRootNode) {
                return buildComplexId(id);
            }

            return versions.length
                ? versions.map((version) => buildComplexId(id, version))
                : availableNode.versions.map(version => buildComplexId(id, version));
        });

        return flatten(selectedItems);
    }

    function prepareTreeData() {
        const mkNode = ({browserId, version, icon}) => ({
            icon,
            data: {browserId, version},
            value: buildComplexId(browserId, version),
            label: mkLabel({browserId, version, elements})
        });

        return available.map(({id: browserId, versions}) => {
            const node = mkNode({browserId, icon: mkBrowserIcon(browserId)});

            if (!isEmpty(versions) && versions.length > 1) {
                node.children = versions.map(version => mkNode({browserId, version}));
            }

            return node;
        });
    }

    function _selectAll() {
        const leaves = Object.keys(treeDataMap).filter(key => treeDataMap[key].isLeaf);
        const cb = selected => selected.length !== leaves.length
            ? leaves
            : selected;

        setSelected(cb);
    }

    function mkLabel({browserId, version, elements}) {
        return (
            <Label
                treeDataMap={treeDataMap}
                browserId={browserId}
                version={version}
                elements={elements}
                setSelected={setSelected}
            />
        );
    }

    function buildElements() {
        const availableVersionsCount = available.reduce((acc, browser) => {
            acc[browser.id] = browser.versions ? browser.versions.length : undefined;
            return acc;
        }, {});

        const selectedBrowsers = selected.reduce((acc, value) => {
            if (!treeDataMap[value]) {
                return acc;
            }

            const {browserId, version} = treeDataMap[value];

            acc[browserId] = acc[browserId] || [];

            if (version) {
                acc[browserId].push(version);
            }

            return acc;
        }, {});

        const elementsNew = [];

        for (const browserId in selectedBrowsers) {
            const versions = selectedBrowsers[browserId];
            if (!versions.length || (availableVersionsCount[browserId] === versions.length)) {
                elementsNew.push(browserId);
            } else {
                elementsNew.push(...versions.map(version => buildComplexId(browserId, version)));
            }
        }

        return elementsNew;
    }

    function updateLabels() {
        const newElements = buildElements();

        if (get(elements, 'length', 0) !== 1 && get(newElements, 'length', 0) !== 1) {
            setElements(newElements);
            return;
        }

        const updatingValues = [
            get(newElements, 'length', undefined) === 1 && newElements[0],
            get(elements, 'length', undefined) === 1 && elements[0]
        ];

        const nodesFlat = nodes.reduce((arr, node) => {
            const children = node.children || [];

            arr.push(node);
            children.forEach(child => arr.push(child));

            return arr;
        }, []);

        const updatingNodes = nodesFlat.filter(node => {
            const {browserId, version} = node.data;

            return updatingValues.includes(buildComplexId(browserId, version));
        });

        updatingNodes.forEach(node => {
            const {browserId, version} = node.data;
            node.label = mkLabel({browserId, version, elements: newElements});
        });

        setElements(newElements);
    }

    function formatSelectedData(selectedItems) {
        return chain(selectedItems)
            .reduce((acc, value) => {
                const {browserId, version} = treeDataMap[value] || {};

                if (browserId) {
                    acc[browserId] = acc[browserId] || [];
                    acc[browserId].push(version);
                }

                return acc;
            }, {})
            .map((versions, id) => ({id, versions: compact(versions)}))
            .value();
    }

    if (isEmpty(available)) {
        return (<div></div>);
    }

    return (
        <div className="browserlist">
            <Popup
                target={<ArrayContainer elements={elements} placeholder="Browsers" />}
                action="click"
            >
                <div>
                    <button className='rct-controls' onClick={selectAll}>
                        Select all
                    </button>
                    <CheckboxTree
                        nodes={nodes}
                        checked={selected}
                        expanded={expanded}
                        onCheck={setSelected}
                        onExpand={setExpanded}
                    />
                </div>
            </Popup>
        </div>
    );
};

BrowserList.propTypes = {
    available: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        versions: PropTypes.arrayOf(PropTypes.string)
    })).isRequired,
    selected: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string,
        versions: PropTypes.arrayOf(PropTypes.string)
    })),
    onChange: PropTypes.func.isRequired
};

export default BrowserList;
