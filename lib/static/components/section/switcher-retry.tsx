import React, {Component, ComponentState} from 'react';
import { Pagination } from 'semantic-ui-react';

interface ISwitcherRetryProps extends React.Props<any>{
    retries?: any[];
    onChange(index: number): void;
}

interface ISwitcherRetryStates extends ComponentState{
    retry: number;
}

export default class SwitcherRetry extends Component<ISwitcherRetryProps, ISwitcherRetryStates> {

    public static defaultProps: Partial<ISwitcherRetryProps> = {
        retries: []
    };

    constructor(props: ISwitcherRetryProps, state: ISwitcherRetryStates) {
        super(props, state);
        this.state = {retry: !this.props.retries ? 0 : this.props.retries.length};
        this._onChange.bind(this);
    }

    render() {
        const retries = this.props.retries;

        if (!retries || retries.length === 0) {
            return null;
        }

        return (
            <Pagination 
                defaultActivePage={1}
                totalPages={retries.length}
                onPageChange={(event, data: any) => data && this._onChange(data.activePage - 1)} />
        );
    }

    private _onChange(index: number) {
        this.setState({retry: index});
        this.props.onChange(index);
    }
}