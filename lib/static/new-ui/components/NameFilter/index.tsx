import React, {ChangeEvent, ReactNode, useCallback, useMemo, useState} from 'react';
import {debounce} from 'lodash';
import {useDispatch, useSelector} from 'react-redux';
import {Icon, TextInput} from '@gravity-ui/uikit';
import {FontCase} from '@gravity-ui/icons';
import * as actions from '@/static/modules/actions';
import {getIsInitialized} from '@/static/new-ui/store/selectors';
import {NameFilterButton} from './NameFilterButton';
import styles from './index.module.css';
import {usePage} from '@/static/new-ui/hooks/usePage';
import {search} from '@/static/modules/search';

export const NameFilter = (): ReactNode => {
    const dispatch = useDispatch();
    const page = usePage();
    const nameFilter = useSelector((state) => state.app[page].nameFilter);
    const useRegexFilter = useSelector((state) => state.app[page].useRegexFilter);
    const useMatchCaseFilter = useSelector((state) => state.app[page].useMatchCaseFilter);
    const [testNameFilter, setNameFilter] = useState(nameFilter);

    const updateNameFilter = useCallback(debounce(
        (text) => {
            search(text, useMatchCaseFilter, page, false, dispatch);
        },
        500,
        {maxWait: 3000}
    ), []);

    const onChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
        setNameFilter(event.target.value);
        updateNameFilter(event.target.value);
    }, [setNameFilter, updateNameFilter]);

    const isInitialized = useSelector(getIsInitialized);

    const onCaseSensitiveClick = (): void => {
        search(nameFilter, !useMatchCaseFilter, page, true, dispatch);
    };

    const onRegexClick = (): void => {
        dispatch(
            actions.setUseRegexFilter({
                data: !useRegexFilter,
                page
            })
        );
    };

    const isRegexInvalid = useMemo(() => {
        if (!useRegexFilter) {
            return false;
        }

        try {
            // eslint-disable-next-line no-new
            new RegExp(testNameFilter);
        } catch (e) {
            return true;
        }

        return false;
    }, [useRegexFilter, testNameFilter]);

    return (
        <div className={styles.container}>
            <TextInput
                disabled={!isInitialized}
                placeholder="Search or filter"
                value={testNameFilter}
                onChange={onChange}
                className={styles['search-input']}
                error={isRegexInvalid}
                qa="filter-input"
            />
            <div className={styles['buttons-wrapper']}>
                <NameFilterButton
                    selected={useMatchCaseFilter}
                    tooltip={'Match case'}
                    onClick={onCaseSensitiveClick}
                >
                    <Icon data={FontCase}/>
                </NameFilterButton>
                <NameFilterButton
                    selected={useRegexFilter}
                    tooltip={'Regex'}
                    onClick={onRegexClick}
                    className={styles['buttons-wrapper__regex']}
                >
                    .*
                </NameFilterButton>
            </div>
        </div>
    );
};
