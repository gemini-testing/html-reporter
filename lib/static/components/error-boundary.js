import {Component} from 'react';
import PropTypes from 'prop-types';

export default class ErrorBoundary extends Component {
    static propTypes = {
        fallback: PropTypes.oneOfType([PropTypes.element, PropTypes.string])
    };
    state = {hasError: false};

    static getDerivedStateFromError() {
        return {hasError: true};
    }

    componentDidCatch(error, errorInfo) {
        console.error('Something failed but catched by error boundary.');
        console.error(error);
        console.error(errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback || null;
        }
        return this.props.children;
    }
}
