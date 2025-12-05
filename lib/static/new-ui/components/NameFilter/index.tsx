import React, {ChangeEvent, ReactNode, useCallback, useMemo, useRef, useState, useEffect} from 'react';
import {debounce} from 'lodash';
import {useDispatch, useSelector} from 'react-redux';
import {Hotkey, Icon, TextInput} from '@gravity-ui/uikit';
import {FontCase, Xmark} from '@gravity-ui/icons';
import classNames from 'classnames';
import * as actions from '@/static/modules/actions';
import {getIsInitialized} from '@/static/new-ui/store/selectors';
import {NameFilterButton} from './NameFilterButton';
import styles from './index.module.css';
import {usePage} from '@/static/new-ui/hooks/usePage';
import {useHotkey} from '@/static/new-ui/hooks/useHotkey';
import {search} from '@/static/modules/search';

export const NameFilter = (): ReactNode => {
    const dispatch = useDispatch();
    const page = usePage();
    const nameFilter = useSelector((state) => state.app[page].nameFilter);
    const useRegexFilter = useSelector((state) => state.app[page].useRegexFilter);
    const useMatchCaseFilter = useSelector((state) => state.app[page].useMatchCaseFilter);
    const [testNameFilter, setNameFilter] = useState(nameFilter);
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const focusSearch = useCallback(() => inputRef.current?.focus(), []);
    useHotkey('mod+k', focusSearch, {allowInInput: true});

    const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === 'Escape') {
            event.preventDefault();
            if (testNameFilter) {
                setNameFilter('');
                search('', useMatchCaseFilter, useRegexFilter, page, false, dispatch);
            } else {
                inputRef.current?.blur();
            }
        }
    }, [testNameFilter, useMatchCaseFilter, useRegexFilter, page, dispatch]);

    const updateNameFilter = useCallback(debounce(
        (text) => {
            search(text, useMatchCaseFilter, useRegexFilter, page, false, dispatch);
        },
        500,
        {maxWait: 3000}
    ), [useMatchCaseFilter, useRegexFilter, page]);

    const onChange = useCallback((event: ChangeEvent<HTMLInputElement>): void => {
        setNameFilter(event.target.value);
        updateNameFilter(event.target.value);
    }, [setNameFilter, updateNameFilter]);

    const onClear = useCallback((): void => {
        setNameFilter('');
        search('', useMatchCaseFilter, useRegexFilter, page, false, dispatch);
    }, [setNameFilter, useMatchCaseFilter, useRegexFilter, page]);

    const isInitialized = useSelector(getIsInitialized);

    const onCaseSensitiveClick = (): void => {
        search(nameFilter, !useMatchCaseFilter, useRegexFilter, page, true, dispatch);
    };

    const onRegexClick = (): void => {
        dispatch(
            actions.setUseRegexFilter({
                data: !useRegexFilter,
                page
            })
        );
        search(nameFilter, useMatchCaseFilter, !useRegexFilter, page, true, dispatch);
    };

    useEffect(() => {
        search(nameFilter, useMatchCaseFilter, useRegexFilter, page, true, dispatch);
        setNameFilter(nameFilter);
    }, [nameFilter]);

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

    const onFocus = useCallback((): void => {
        setIsFocused(true);
    }, []);

    const onBlur = useCallback((): void => {
        setIsFocused(false);
    }, []);

    const showHotkeyHint = !isFocused && !testNameFilter;

    return (
        <div className={styles.container}>
            <TextInput
                controlRef={inputRef}
                disabled={!isInitialized}
                placeholder="Search or filter"
                value={testNameFilter}
                onChange={onChange}
                onFocus={onFocus}
                onBlur={onBlur}
                onKeyDown={onKeyDown}
                className={classNames(
                    styles['search-input'],
                    showHotkeyHint ? styles['search-input--with-hotkey'] : styles['search-input--without-hotkey']
                )}
                error={isRegexInvalid}
                qa="name-filter"
            />
            <div className={styles['buttons-wrapper']}>
                {showHotkeyHint && (
                    <Hotkey className={styles.hotkey} view="dark" value="mod+k" />
                )}
                {testNameFilter && (
                    <NameFilterButton
                        selected={false}
                        tooltip="Clear filter"
                        onClick={onClear}
                        qa="clear-name-filter"
                    >
                        <Icon data={Xmark}/>
                    </NameFilterButton>
                )}
                <NameFilterButton
                    selected={useMatchCaseFilter}
                    tooltip="Match case"
                    onClick={onCaseSensitiveClick}
                    qa="match-case"
                >
                    <Icon data={FontCase}/>
                </NameFilterButton>
                <NameFilterButton
                    selected={useRegexFilter}
                    tooltip="Regex"
                    onClick={onRegexClick}
                    className={styles['buttons-wrapper__regex']}
                    qa="regex"
                >
                    .*
                </NameFilterButton>
            </div>
        </div>
    );
};
