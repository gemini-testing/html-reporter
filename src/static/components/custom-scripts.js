import React, {useEffect, useRef} from 'react';
import {isEmpty} from 'lodash';

export default function CustomScripts(props) {
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
