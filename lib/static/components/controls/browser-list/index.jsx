'use strict';

import {Button, Select, useSelectOptions} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {useState, useMemo, useEffect} from 'react';
import {compact} from 'lodash';
import PropTypes from 'prop-types';

import {mkBrowserIcon, buildComplexId} from './utils';

import 'react-checkbox-tree/lib/react-checkbox-tree.css';
import './index.styl';

const BrowserList = ({available, onChange, selected: selectedProp}) => {
    const getOptions = () => {
        const groups = {};
        const DEFAULT_GROUP = 'other';
        let hasNestedOptions = false;
        available.forEach(({id: browserId, versions}) => {
            if (!versions || versions.length < 2) {
                groups[DEFAULT_GROUP] = groups[DEFAULT_GROUP] || [];
                groups[DEFAULT_GROUP].push({value: buildComplexId(browserId),
                    content: <div className='browser-name'>{mkBrowserIcon(browserId)}{buildComplexId(browserId)}</div>});
                return;
            }
            hasNestedOptions = true;
            versions.forEach((version) => {
                groups[browserId] = groups[browserId] || [];
                groups[browserId].push({value: buildComplexId(browserId, version),
                    content: <div className='browser-name'>{mkBrowserIcon(browserId)}{buildComplexId(browserId, version)}</div>});
            });
        });
        if (!hasNestedOptions) {
            return groups[DEFAULT_GROUP] ?? [];
        } else {
            const optionsList = [];
            Object.keys(groups).forEach((name) => {
                optionsList.push({
                    label: name,
                    options: groups[name]
                });
            });
            return optionsList;
        }
    };
    const getMapping = () => {
        const mapping = {};
        available.forEach(({id: browserId, versions}) => {
            if (!versions || !versions.length) {
                mapping[buildComplexId(browserId)] = {id: browserId};
                return;
            }
            if (versions.length < 2) {
                mapping[buildComplexId(browserId)] = {id: browserId, version: versions[0]};
                return;
            }
            versions.forEach((version) => {
                mapping[buildComplexId(browserId, version)] = {id: browserId, version};
            });
        });
        return mapping;
    };
    const getSelected = () => {
        const selectedOptions = [];
        if (!selectedProp || !selectedProp.length) {
            return [];
        }
        selectedProp.forEach(({id: browserId, versions}) => {
            if (!versions || versions.length < 2) {
                selectedOptions.push(buildComplexId(browserId));
                return;
            }
            versions.forEach((version) => {
                selectedOptions.push(buildComplexId(browserId, version));
            });
        });
        return selectedOptions;
    };
    const rawOptions = useMemo(getOptions, [available]);
    const getOptionsFrom = (optionsData) => {
        const allOptionsList = [];
        optionsData.forEach((option) => {
            if (option.label) {
                getOptionsFrom(option.options).forEach((o) => allOptionsList.push(o));
            } else {
                allOptionsList.push(option.value);
            }
        });
        return allOptionsList;
    };
    const allOptions = useMemo(() => getOptionsFrom(rawOptions), [rawOptions]);
    const options = useSelectOptions({
        options: rawOptions
    });
    const mapping = useMemo(getMapping, [available]);
    const [selected, setSelected] = useState(getSelected());

    const selectAll = () => {
        setSelected(allOptions);
    };

    const formatSelectedData = () => {
        const selectedData = {};
        selected.forEach((option) => {
            if (!mapping[option] || !mapping[option].id) {
                return;
            }
            const {id: browserId, version} = mapping[option];
            selectedData[browserId] = selectedData[browserId] || [];
            selectedData[browserId].push(version);
        });
        return Object.entries(selectedData).map(([id, versions]) => ({id, versions: compact(versions)}));
    };

    const renderFilter = () => {
        return (
            <div className='browserlist__filter'>
                <Button onClick={selectAll} width='max'>
                Select All
                </Button>
            </div>
        );
    };

    const renderOption = (option) => {
        const isTheOnlySelected = selected.includes(option.value) && selected.length === 1;
        const selectOnly = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelected([option.value]);
        };
        const selectExcept = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setSelected(allOptions.filter(o => o !== option.value));
        };
        return (
            <div className='browserlist__row'>
                <div className='browserlist__row_content'>
                    {option.content}
                </div>
                <Button size='s' onClick={isTheOnlySelected ? selectExcept : selectOnly} className={classNames('regular-button', 'action-button')}>{isTheOnlySelected ? 'Except' : 'Only'}</Button>
            </div>
        );
    };

    useEffect(() => {
        onChange && onChange(formatSelectedData(selected));
    }, [selected]);

    return (
        <Select
            disablePortal
            value={selected}
            options={options}
            multiple={true}
            hasCounter
            filterable
            renderFilter={renderFilter}
            renderOption={renderOption}
            onUpdate={setSelected}
            popupClassName='browserlist__popup'
            className='browserlist'
        />
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
