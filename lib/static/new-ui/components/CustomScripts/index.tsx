import React, {ReactNode, useEffect, useRef} from 'react';

interface CustomScriptProps {
    scripts: (string | ((...args: never) => unknown))[];
}

export function CustomScripts(props: CustomScriptProps): ReactNode {
    const {scripts} = props;

    if (scripts.length === 0) {
        return null;
    }

    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scripts.forEach((script) => {
            const s = document.createElement('script');
            s.type = 'text/javascript';
            s.innerHTML = `(${script})();`;
            ref.current?.appendChild(s);
        });
    }, [scripts]);

    return <div className="custom-scripts" ref={ref}></div>;
}
