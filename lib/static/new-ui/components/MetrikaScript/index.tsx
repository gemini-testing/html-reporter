import React, {ReactNode, useEffect, useRef} from 'react';
import {useSelector} from 'react-redux';

export function MetrikaScript(): ReactNode {
    const areAnalyticsEnabled = useSelector(state => state.config.yandexMetrika.enabled);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!areAnalyticsEnabled) {
            return;
        }

        const s = document.createElement('script');
        s.type = 'text/javascript';
        s.innerHTML = `
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

   ym(99267510, "init", {
        clickmap:true,
        trackLinks:true,
        accurateTrackBounce:true
   });`;
        ref.current?.appendChild(s);
    }, [areAnalyticsEnabled]);

    if (!areAnalyticsEnabled) {
        return null;
    }

    return <div ref={ref} data-qa={'metrika-script'}></div>;
}
