import './color-border.css';

const nextColors = {
    undefined: 'green',
    'red': 'green',
    'green': 'blue',
    'blue': 'red'
};

export default ['react', 'redux', 'react-redux', function(React, {bindActionCreators}, {connect}, {pluginName}) {
    class ColorBorder extends React.Component {
        // allow the component to be placed only on "result" extension point
        static point = 'result';

        onBorderClick = (e) => {
            e.stopPropagation();
            // "result" point provides resultId in props
            this.props.actions.changeBorderColor(this.props.resultId);
        }

        render() {
            const className = `${this.props.color}-border redux-border`;
            return <div className={className} onClick={this.onBorderClick}>
                {
                    // print pluginName on the border
                    pluginName
                }
                {this.props.children}
            </div>;
        }
    }

    const actions = {
        changeBorderColor: (id) => {
            return {type: 'CHANGE_BORDER_COLOR', payload: {id}};
        }
    };

    const ConnectedColorBorder = connect(
        ({borderColors}, {resultId}) => ({color: borderColors[resultId] || 'red'}),
        (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
    )(ColorBorder);

    const reducers = [
        function(state = {}, action) {
            if (!state.borderColors) {
                state = {...state, borderColors: {}};
            }

            if (action.type === 'CHANGE_BORDER_COLOR') {
                state = {
                    ...state,
                    borderColors: {
                        ...state.borderColors,
                        [action.payload.id]: nextColors[state.borderColors[action.payload.id]]
                    }
                };
            }

            return state;
        }
    ];

    return {
        ColorBorder: ConnectedColorBorder,
        reducers
    };
}];
