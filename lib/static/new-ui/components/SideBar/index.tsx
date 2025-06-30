import React, {ReactNode, Ref} from 'react';
import classNames from 'classnames';
import styles from './index.module.css';
import {ErrorHandler} from '@/static/new-ui/features/error-handling/components/ErrorHandling';
import {Flex, Text} from '@gravity-ui/uikit';
import {TestNameFilter} from '../TestNameFilter';
import {BrowsersSelect} from '../BrowsersSelect';
import {TabsSelect, TabsSelectItem} from '../TabsSelect';
import {TreeActionsToolbar} from '../TreeActionsToolbar';
import {TreeView, TreeViewProps, TreeViewHandle} from '../TreeView';
import {TreeViewSkeleton} from '@/static/new-ui/components/TreeView/TreeViewSkeleton';
import {UiCard} from '@/static/new-ui/components/Card/UiCard';

interface SideBarProps extends TreeViewProps {
    title: string;
    isInitialized: boolean;
    onHighlightCurrentTest?: () => void;
    treeViewRef: Ref<TreeViewHandle>;
    statusList: TabsSelectItem[];
    statusValue: string;
    onStatusChange: (value: string) => void;
    hideSearch?: boolean; // @todo: remove after implement search on visual checks page
}

export function SideBar({
    title,
    isInitialized,
    onHighlightCurrentTest,
    treeViewRef,
    statusList,
    statusValue,
    onStatusChange,
    hideSearch,
    ...props
}: SideBarProps): ReactNode {
    return (
        <UiCard className={classNames(styles.card, styles.treeViewCard)} key='tree-view' qa='suites-tree-card'>
            <ErrorHandler.Boundary fallback={<ErrorHandler.FallbackCardCrash recommendedAction={'Try to reload page'}/>}>
                <Text variant="header-2" className={styles['card__title']}>{title}</Text>
                {!hideSearch && (
                    <Flex gap={2}>
                        <TestNameFilter/>
                        <BrowsersSelect/>
                    </Flex>
                )}
                <TabsSelect
                    list={statusList}
                    value={statusValue}
                    onChange={onStatusChange}
                    disabled={!isInitialized}
                />
                {onHighlightCurrentTest && <TreeActionsToolbar onHighlightCurrentTest={onHighlightCurrentTest} />}
                {isInitialized && <TreeView ref={treeViewRef} {...props}/>}
                {!isInitialized && <TreeViewSkeleton/>}
            </ErrorHandler.Boundary>
        </UiCard>
    );
}
