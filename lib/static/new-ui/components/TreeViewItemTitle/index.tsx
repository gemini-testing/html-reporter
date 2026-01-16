import {ArrowRotateLeft, ChevronRight} from '@gravity-ui/icons';
import {Button, Checkbox, Icon} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {getToggledCheckboxState, isCheckboxChecked, isCheckboxIndeterminate} from '@/common-utils';
import {EntityType, TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {toggleBrowserCheckbox, toggleGroupCheckbox, toggleSuiteCheckbox, thunkRunSuite} from '@/static/modules/actions';
import {getAreCheckboxesNeeded, getBrowsers, getBrowsersState, getSuites} from '@/static/new-ui/store/selectors';
import {getItemCheckStatus} from '@/static/new-ui/components/TreeViewItemTitle/selectors';
import {ClipboardButton} from '@/static/new-ui/components/ClipboardButton';
import {RunTestsFeature} from '@/constants';
import {TestSpec} from '@/adapters/tool/types';
import styles from './index.module.css';

interface TreeViewItemTitleProps {
    className?: string;
    item: TreeViewItemData;
}

const getVisibleSuiteBrowsers = (
    suiteId: string,
    suites: Record<string, {suiteIds?: string[]; browserIds?: string[]}>,
    browsers: Record<string, {parentId: string; name: string}>,
    browsersState: Record<string, {shouldBeShown: boolean}>
): TestSpec[] => {
    const suite = suites[suiteId];
    if (!suite) {
        return [];
    }

    if (suite.browserIds) {
        return suite.browserIds
            .filter(browserId => browsersState[browserId]?.shouldBeShown)
            .map(browserId => {
                const browser = browsers[browserId];
                return {testName: browser.parentId, browserName: browser.name};
            });
    }

    if (suite.suiteIds) {
        return suite.suiteIds.flatMap(childSuiteId => getVisibleSuiteBrowsers(childSuiteId, suites, browsers, browsersState));
    }

    return [];
};

export function TreeViewItemTitle({item}: TreeViewItemTitleProps): React.JSX.Element {
    const dispatch = useDispatch();
    const areCheckboxesNeeded = useSelector(getAreCheckboxesNeeded);
    const groups = useSelector(state => state.tree.groups.byId);
    const checkStatus = useSelector(state => getItemCheckStatus(state, item));
    const isVisualChecksPage = /\/visual-checks/.test(location.hash); // @todo: remove after implement search on visual checks page

    const suites = useSelector(getSuites);
    const browsers = useSelector(getBrowsers);
    const browsersState = useSelector(getBrowsersState);
    const isRunning = useSelector(state => state.running);
    const isRunTestsAvailable = useSelector(state => state.app.availableFeatures)
        .find(feature => feature.name === RunTestsFeature.name);

    const getTestsToRun = (): TestSpec[] => {
        if (item.entityType === EntityType.Suite) {
            return getVisibleSuiteBrowsers(item.entityId, suites, browsers, browsersState);
        } else if (item.entityType === EntityType.Browser) {
            // On visual checks page, browserId is stored separately from entityId
            const browserId = item.browserId || item.entityId;
            const browser = browsers[browserId];
            if (browser) {
                return [{testName: browser.parentId, browserName: browser.name}];
            }
        } else if (item.entityType === EntityType.Group) {
            const group = groups[item.entityId];
            if (group) {
                return group.browserIds
                    .filter(browserId => browsersState[browserId]?.shouldBeShown)
                    .map(browserId => {
                        const browser = browsers[browserId];
                        return {testName: browser.parentId, browserName: browser.name};
                    });
            }
        }
        return [];
    };

    const handleCheckboxClick = (e: React.MouseEvent): void => {
        e.stopPropagation();

        if (item.entityType === EntityType.Group) {
            const group = groups[item.entityId];

            dispatch(toggleGroupCheckbox({
                browserIds: group.browserIds,
                checkStatus: getToggledCheckboxState(checkStatus)
            }));
        } else if (item.entityType === EntityType.Suite) {
            dispatch(toggleSuiteCheckbox({
                suiteId: item.entityId,
                checkStatus: getToggledCheckboxState(checkStatus)
            }));
        } else if (item.entityType === EntityType.Browser) {
            dispatch(toggleBrowserCheckbox({
                suiteBrowserId: item.entityId,
                checkStatus: getToggledCheckboxState(checkStatus)
            }));
        }
    };

    const handleRunClick = (e: React.MouseEvent): void => {
        e.stopPropagation();
        const tests = getTestsToRun();
        if (tests.length > 0) {
            dispatch(thunkRunSuite({tests}));
        }
    };

    const handleCopyClick = (e: React.MouseEvent): void => {
        e.stopPropagation();
    };

    const getFullSuitePath = (): string => {
        if (item.entityType === EntityType.Suite) {
            const suite = suites[item.entityId];
            if (suite?.suitePath) {
                return suite.suitePath.join(' ');
            }
        } else if (item.entityType === EntityType.Browser) {
            // On visual checks page, browserId is stored separately from entityId
            const browserId = item.browserId || item.entityId;
            const browser = browsers[browserId];
            if (browser) {
                const suite = suites[browser.parentId];
                if (suite?.suitePath) {
                    return suite.suitePath.join(' ');
                }
            }
        }
        return item.title.join(' ');
    };

    const headTitleParts = item.title.slice(0, -1);
    const tailTitlePart = item.title[item.title.length - 1];

    const titleContainerClassName = classNames({
        [styles['title-container--clamped']]: item.entityType === EntityType.Group,
        [styles['title-container--inline']]: item.entityType !== EntityType.Group
    });

    return <div className={styles.container}>
        <div>
            <div className={titleContainerClassName}>
                {item.prefix && <span className={styles.titlePrefix}>{item.prefix}</span>}
                <span className={styles.title}>
                    {headTitleParts.map((titlePart, index) => <React.Fragment key={index}>
                        <span className={index !== headTitleParts.length - 1 ? styles.titlePart : ''}>{titlePart}</span>
                        <ChevronRight height={12} className={styles.titleSeparator}/>
                    </React.Fragment>)}
                    <span className={headTitleParts.length > 0 ? styles.titlePart : ''}>{tailTitlePart}</span>
                </span>
            </div>
            {item.tags && item.tags.length > 0 &&
                <div className={styles.tagsContainer}>
                    {item.tags.map((tag, index) => <span key={index} className={styles.tag}>{tag}</span>)}
                </div>
            }
        </div>
        <div className={classNames(styles.actionsContainer, {
            [styles['actions-container--no-checkbox']]: !areCheckboxesNeeded || isVisualChecksPage
        })}>
            <ClipboardButton
                className={styles.actionButton}
                size='m'
                text={getFullSuitePath()}
                title="Copy title"
                onClick={handleCopyClick}
            />
            {isRunTestsAvailable && <Button
                view='flat'
                title="Run tests"
                onClick={handleRunClick}
                disabled={isRunning}
                className={classNames(styles.actionButton, {
                    [styles['action-button--disabled']]: isRunning
                })}
            >
                <Button.Icon>
                    <Icon data={ArrowRotateLeft}/>
                </Button.Icon>
            </Button>
            }
        </div>
        {(areCheckboxesNeeded && !isVisualChecksPage) &&
            <div className={styles.checkboxWrapper} onClick={handleCheckboxClick} data-qa="tree-item-checkbox">
                <Checkbox
                    checked={isCheckboxChecked(checkStatus)}
                    indeterminate={isCheckboxIndeterminate(checkStatus)}
                    className={styles.checkbox}
                    size={'m'}
                />
            </div>
        }
    </div>;
}
