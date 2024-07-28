import React, {Component} from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import {Button} from '@gravity-ui/uikit';

interface ControlButtonProps {
    label: React.ReactNode;
    title?: string;
    handler: () => void;
    isActive?: boolean;
    isAction?: boolean;
    isSuiteControl?: boolean;
    isControlGroup?: boolean;
    isDisabled?: boolean;
    isRunning?: boolean;
    extendClassNames?: string | string[];
    dataTestId?: string | number;
}

export default class ControlButton extends Component<ControlButtonProps> {
    static propTypes = {
        label: PropTypes.oneOfType([PropTypes.string, PropTypes.object]).isRequired,
        title: PropTypes.string,
        handler: PropTypes.func.isRequired,
        isActive: PropTypes.bool,
        isAction: PropTypes.bool,
        isDisabled: PropTypes.bool,
        isSuiteControl: PropTypes.bool,
        isControlGroup: PropTypes.bool,
        isRunning: PropTypes.bool,
        extendClassNames: PropTypes.oneOfType([PropTypes.array, PropTypes.string]),
        dataTestId: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
    };

    render(): JSX.Element {
        const {
            label,
            title,
            handler,
            isActive,
            isAction,
            isSuiteControl,
            isDisabled = false,
            isRunning = false,
            extendClassNames,
            dataTestId
        } = this.props;

        const className = classNames(
            {'button_type_suite-controls': isSuiteControl},
            extendClassNames
        );

        return <Button
            title={title}
            view={isActive ? 'outlined-action' : (isAction ? 'action' : 'outlined')}
            loading={isRunning}
            onClick={handler}
            className={className}
            disabled={isDisabled}
            qa={dataTestId?.toString()}
        >
            {label}
        </Button>;
    }
}
