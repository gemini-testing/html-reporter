import React, {useEffect, useRef} from 'react';
import PropTypes from 'prop-types';
import {isEmpty} from 'lodash';

function CustomScripts(props) {
    const {scripts} = props;

    if (isEmpty(scripts)) {
        return null;
    }

    const ref = useRef(null);

    useEffect(() => {
        scripts.forEach((script) => {
            const s = document.createElement('script');
            s.type = 'text/javascript';
            s.innerHTML = `(${script})();`;
            ref.current.appendChild(s);
        });
    }, [scripts]);

    return <div className="custom-scripts" ref={ref}></div>;
}

CustomScripts.propTypes = {
    scripts: PropTypes.array.isRequired
};

export default CustomScripts;
