import PropTypes from 'prop-types';
import './color-border.css';

export default [
    'react',
    'redux',
    'react-redux',
    'axios',
    function(
        React,
        {bindActionCreators},
        {connect},
        axios,
        {pluginName}
    ) {
        class ColorBorder extends React.Component {
            static propTypes = {
                actions: PropTypes.object.isRequired,
                children: PropTypes.oneOfType([PropTypes.element, PropTypes.string]),
                resultId: PropTypes.string.isRequired,
                color: PropTypes.string.isRequired,
                changesCount: PropTypes.number.isRequired
            };

            onBorderClick = (e) => {
                e.stopPropagation();
                // "result" point provides resultId in props
                this.props.actions.changeBorderColor(this.props.resultId, this.props.color);
            };

            render() {
                const className = `${this.props.color}-border redux-server-border`;
                return <div className={className} onClick={this.onBorderClick}>
                    {this.props.changesCount}
                    {this.props.children}
                </div>;
            }
        }

        const actions = {
            changeBorderColor: function(id, prevColor) {
                return function(dispatch) {
                    axios.get(`/plugin-routes/${pluginName}/color?color=${prevColor}`)
                        .then(({data}) => {
                            dispatch({type: 'CHANGE_SERVER_BORDER_COLOR', payload: {id, color: data.color}});
                        });
                };
            }
        };

        const ConnectedColorBorder = connect(
            ({borderServerColors}, {resultId}) => (borderServerColors[resultId] || {color: 'red', changesCount: 0}),
            (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
        )(ColorBorder);

        const reducers = [
            function(state = {}, action) {
                if (!state.borderServerColors) {
                    state = {...state, borderServerColors: {}};
                }

                if (action.type === 'CHANGE_SERVER_BORDER_COLOR') {
                    const {id, color} = action.payload;
                    state = {
                        ...state,
                        borderServerColors: {
                            ...state.borderServerColors,
                            [id]: {
                                changesCount: (state.borderServerColors[id] || {changesCount: 0}).changesCount + 1,
                                color
                            }
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
    }
];
