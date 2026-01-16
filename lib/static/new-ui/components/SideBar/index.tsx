import React, {forwardRef, ReactNode, Ref, useCallback, useImperativeHandle, useRef} from 'react';
import {useSelector} from 'react-redux';
import classNames from 'classnames';
import styles from './index.module.css';
import {ErrorHandler} from '@/static/new-ui/features/error-handling/components/ErrorHandling';
import {Flex, Text} from '@gravity-ui/uikit';
import {NameFilter, NameFilterHandle} from '../NameFilter';
import {BrowsersSelect} from '../BrowsersSelect';
import {TabsSelect, TabsSelectItem} from '../TabsSelect';
import {TreeActionsToolbar} from '../TreeActionsToolbar';
import {TreeView, TreeViewProps, TreeViewHandle} from '../TreeView';
import {TreeViewSkeleton} from '@/static/new-ui/components/TreeView/TreeViewSkeleton';
import {UiCard} from '@/static/new-ui/components/Card/UiCard';

export interface SideBarHandle {
    focusSearch: () => void;
}

interface SideBarProps extends TreeViewProps {
    title: string;
    isInitialized: boolean;
    onHighlightCurrentTest?: () => void;
    treeViewRef: Ref<TreeViewHandle>;
    onSelectFirstTreeItem?: () => void;
    statusList: TabsSelectItem[];
    statusValue: string;
    onStatusChange: (value: string) => void;
}

export const SideBar = forwardRef<SideBarHandle, SideBarProps>(function SideBar({
    title,
    isInitialized,
    onHighlightCurrentTest,
    treeViewRef,
    onSelectFirstTreeItem,
    statusList,
    statusValue,
    onStatusChange,
    ...props
}, ref): ReactNode {
    const isSearchLoading = useSelector((state) => state.app.isSearchLoading);
    const nameFilterRef = useRef<NameFilterHandle>(null);

    const focusSearch = useCallback(() => {
        nameFilterRef.current?.focus();
    }, []);

    useImperativeHandle(ref, () => ({
        focusSearch
    }), [focusSearch]);

    return (
        <UiCard className={classNames(styles.card, styles.treeViewCard)} key='tree-view' qa='suites-tree-card'>
            <ErrorHandler.Boundary fallback={<ErrorHandler.FallbackCardCrash recommendedAction={'Try to reload page'}/>}>
                <Text variant="header-2" className={styles['card__title']} qa="sidebar-title">{title}</Text>
                <Flex gap={2} className={styles['filters-container']}>
                    <NameFilter ref={nameFilterRef} onNavigateDown={onSelectFirstTreeItem} />
                    <BrowsersSelect/>
                </Flex>
                <TabsSelect
                    className={styles['tabs-container']}
                    list={statusList}
                    value={statusValue}
                    onChange={onStatusChange}
                    disabled={!isInitialized}
                />
                {onHighlightCurrentTest && <TreeActionsToolbar className={styles['toolbar-container']} onHighlightCurrentTest={onHighlightCurrentTest} />}
                {isInitialized && (
                    <TreeView
                        ref={treeViewRef}
                        containerClassName={styles['tree-view-container']}
                        loading={isSearchLoading}
                        {...props}
                    />
                )}
                {!isInitialized && <div className={styles['skeleton-container']}><TreeViewSkeleton/></div>}
            </ErrorHandler.Boundary>
        </UiCard>
    );
});
