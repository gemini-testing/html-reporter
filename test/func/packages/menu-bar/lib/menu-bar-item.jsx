import './menu-bar-item.css';

export default ['react', 'semantic-ui-react', function(React, {Dropdown}, {pluginName}) {
    class MenuBarItem extends React.Component {
        // allow the component to be placed only on "menu-bar" extension point
        static point = 'menu-bar';

        render() {
            return (
                <Dropdown.Item>
                    <a className="menu-item__link menu-bar-item" href="#">{pluginName}</a>
                </Dropdown.Item>
            );
        }
    }

    return {
        MenuBarItem
    };
}];
