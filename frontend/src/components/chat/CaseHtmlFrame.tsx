'use client';

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';

/**
 * Shows a judgment's original (Word-generated) HTML with its own formatting,
 * as in the law report it came from.
 *
 * It runs in a sandboxed frame: the page's styles cannot leak in or out, and a
 * strict Content-Security-Policy stops the document loading anything external.
 * The only script is the small one added here, which reports the document's
 * height so the frame can grow to fit instead of scrolling inside itself.
 */

const CSP = "default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:; script-src 'unsafe-inline'";

// Sits last in <head>, so it wins over the document's own body rules.
// "page: auto" cancels Word's named print pages (div.Section1 { page: Section1 }),
// which only matter when printing.
const PAGE_CSS = `
html { background: #fff; height: auto; overflow: hidden; }
body { max-width: 860px; margin: 0 auto; padding: 28px 36px 40px; color: #111; overflow-wrap: anywhere; }
img, table { max-width: 100%; }
* { page: auto !important; }
`;

function buildDocument(html: string, frameId: string): string {
    const head = `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}"><base target="_blank"><style>${PAGE_CSS}</style>`;
    // Reports the document height to the page. It re-measures after load, fonts and
    // a few short delays, and never reports 0 (some browsers measure 0 before layout).
    const script =
        `<script>(function(){var id=${JSON.stringify(frameId)};var last=0;` +
        `function measure(){var b=document.body;if(!b)return 0;` +
        `return Math.ceil(Math.max(b.scrollHeight,b.getBoundingClientRect().height));}` +
        `function send(){var h=measure();if(h>0&&h!==last){last=h;` +
        `parent.postMessage({type:'case-frame-height',frame:id,height:h},'*');}}` +
        `if(window.ResizeObserver){new ResizeObserver(send).observe(document.body);}` +
        `document.addEventListener('DOMContentLoaded',send);window.addEventListener('load',send);` +
        `if(document.fonts&&document.fonts.ready){document.fonts.ready.then(send);}` +
        `[50,300,1000].forEach(function(t){setTimeout(send,t);});send();})();</script>`;

    let doc = html;
    doc = /<\/head>/i.test(doc)
        ? doc.replace(/<\/head>/i, `${head}</head>`)
        : `<head>${head}</head>${doc}`;
    doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>/i, `${script}</body>`) : `${doc}${script}`;
    return doc;
}

export default function CaseHtmlFrame({ html, title }: { html: string; title: string }) {
    const frameId = useId();
    const frameRef = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(640);

    const srcDoc = useMemo(() => buildDocument(html, frameId), [html, frameId]);

    useEffect(() => {
        const onMessage = (event: MessageEvent) => {
            if (event.source !== frameRef.current?.contentWindow) return;
            const data = event.data as { type?: string; frame?: string; height?: number } | null;
            if (data?.type === 'case-frame-height' && data.frame === frameId && typeof data.height === 'number' && data.height > 0) {
                // A few pixels of slack so the frame never shows its own scrollbar.
                setHeight(Math.max(240, data.height + 4));
            }
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [frameId]);

    return (
        <iframe
            ref={frameRef}
            title={title}
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            style={{ height }}
            className="block w-full rounded-xl border border-[#e5e5e5] bg-white shadow-sm"
        />
    );
}
