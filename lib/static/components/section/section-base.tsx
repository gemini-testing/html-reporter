'use strict';

import React, {Component, ComponentState, ReactNode} from 'react';
import {cn, classnames } from '@bem-react/classname';
import {isFailStatus, isSkippedStatus} from '../../../common-utils';

interface IBaseState extends ComponentState {
    collapsed: boolean;
}

export interface IBaseProps extends React.Props<any>{
    expand?: string;
    viewMode?: string;
    key?: string;
}

export interface INextProps extends IBaseProps{
    dispatch?: () => any;
    expand?: string;
    suite?: any;
    suiteId?: string;
}

export class Base<IBaseProps> extends Component<IBaseProps, IBaseState> {

    constructor(props: IBaseProps) {
        super(props);
        this._toggleState = this._toggleState.bind(this);
    }

    protected _getStateFromProps() {
        const returnParams: {
            failed: any;
            retried: any;
            skipped: boolean;
            updated?: string;
            expand: string | undefined;
        } = {
            failed: '',
            retried: '',
            skipped: false,
            updated: '',
            expand:  undefined
        };
        return returnParams;
    }

    componentWillMount() {
        const {failed, retried, skipped, expand} = this._getStateFromProps();

        this.setState({
            failed,
            retried,
            skipped,
            collapsed: this._shouldBeCollapsed({failed, retried, expand})
        });
    }

    componentWillReceiveProps(nextProps: INextProps) {
        const {failed, retried, updated} = this._getStateFromProps();
        const updatedStatus = {failed, retried, updated, expand: nextProps.expand};

        this.setState({
            failed,
            retried,
            collapsed: this._shouldBeCollapsed(updatedStatus)
        });
    }

    render(): ReactNode | null {
        return null;
    }

    private _shouldBeCollapsed({failed, retried, expand}: any) {
        if (expand === 'errors' && failed) {
            return false;
        } else if (expand === 'retries' && retried) {
            return false;
        } else if (expand === 'all') {
            return false;
        }

        return true;
    }

    protected _toggleState() {
        this.setState({collapsed: !this.state.collapsed});
    }

    protected _resolveSectionStatus(status: any) {
        const {collapsed} = this.state;
        const section = cn(
            'section'
        );
        const baseClasses = section({section_collapsed: collapsed});

        if (status) {
            return classnames(baseClasses, `section_status_${status}`);
        }

        return classnames(baseClasses, section(null,
            {section_status_skip: isSkippedStatus(status), section_status_fail: isFailStatus(status),
                section_status_success: !(isSkippedStatus(status) || isFailStatus(status))}));
    }
}
