import {Disclosure, Flex} from '@gravity-ui/uikit';
import React, {ReactElement, ReactNode} from 'react';
import classNames from 'classnames';
import {ChevronUp} from '@gravity-ui/icons';

import styles from './index.module.css';
import {connect} from 'react-redux';
import {State} from '@/static/new-ui/types/store';
import {getSectionId} from '@/static/new-ui/features/suites/components/CollapsibleSection/utils';
import {bindActionCreators} from 'redux';
import * as actions from '@/static/modules/actions';

interface CollapsibleSectionProps {
    id: string;
    title: string;
    children?: ReactNode;
    className?: string;
}

interface CollapsibleSectionInternalProps extends CollapsibleSectionProps{
    sectionId: string;
    expanded: boolean;
    actions: typeof actions;
}

export function CollapsibleSectionInternal(props: CollapsibleSectionInternalProps): ReactNode {
    const onUpdateHandler = (): void => {
        props.actions.setSectionExpandedState({sectionId: props.sectionId, isExpanded: !props.expanded});
    };

    return <Disclosure expanded={props.expanded} size={'l'} arrowPosition={'end'} key={props.sectionId} className={props.className}>
        <Disclosure.Summary>
            {(): ReactElement => {
                return <Flex gap={2} alignItems={'center'} onClick={onUpdateHandler} className={styles.summary}>
                    <h3 className="text-header-1">{props.title}</h3>
                    <ChevronUp className={classNames(styles.expandArrow, {[styles['expand-arrow--expanded']]: props.expanded})}/>
                </Flex>;
            }}
        </Disclosure.Summary>
        {props.children}
    </Disclosure>;
}

export const CollapsibleSection = connect((state: State, props: CollapsibleSectionProps) => {
    const browserId = state.app.suitesPage.currentBrowserId;
    let sectionId = '';

    if (browserId && state.tree.browsers.byId[browserId]) {
        const attemptIndex = state.tree.browsers.stateById[browserId].retryIndex;
        sectionId = getSectionId(browserId, attemptIndex, props.id);
    }

    return {
        sectionId,
        expanded: state.ui.suitesPage.expandedSectionsById[sectionId] ?? true
    };
}, (dispatch) => ({actions: bindActionCreators(actions, dispatch)}))(CollapsibleSectionInternal);
