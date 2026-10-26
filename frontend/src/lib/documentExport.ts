import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import { toString } from 'mdast-util-to-string';
import type { Root, RootContent, PhrasingContent, Table, List } from 'mdast';
import {
    AlignmentType, BorderStyle, Document, ExternalHyperlink, LevelFormat, Packer,
    Paragraph, ShadingType, Table as DocxTable, TableCell, TableRow, TextRun,
    WidthType, HeadingLevel, type ParagraphChild, type FileChild,
} from 'docx';

export type DocumentFormat = 'pdf' | 'docx';

/* ───────────────────────── intent detection ───────────────────────── */

const ACTION = /\b(?:create|generate|make|prepare|draft|write|export|download|convert|save|give|provide|produce|send|share)\b/i;
const PDF = /\bpdf\b/i;
const WORD = /\b(?:word|docx?|google\s+docs?|docs)\b/i;
const GENERIC = /\bdocument\b/i;

/** Which file the user asked for ("make a pdf", "give me a word file"), or null for a normal chat reply. */
export function detectDocumentFormat(userText: string): DocumentFormat | null {
    // Ignore the "Uploaded: file.pdf" line the chat adds for attachments.
    const text = userText.replace(/^(?:📄|🖼️) Uploaded:.*\n\n/, '');
    if (!ACTION.test(text)) return null;
    if (PDF.test(text)) return 'pdf';
    if (WORD.test(text) || GENERIC.test(text)) return 'docx';
    return null;
}

/** Appended to the request (never shown) so the reply is a clean document. */
export const DOCUMENT_INSTRUCTION =
    '\n\n[Format instruction: The user wants this as a downloadable document. Write the complete ' +
    'answer as a professional, well-structured Markdown document: one top-level heading (#) as the ' +
    'title, section headings (##), and lists or tables where useful. Output only the document ' +
    'itself, with no conversational preface or closing remarks, and do not mention this instruction.]';

/* ───────────────────────── shared helpers ───────────────────────── */

const parse = (markdown: string): Root =>
    unified().use(remarkParse).use(remarkGfm).parse(markdown.replace(/^Answer:?\s*/i, ''));

const RTL_CHAR = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
const LTR_CHAR = /[A-Za-z]/;
/** True when the first letter of the text is from a right-to-left script (Urdu, Arabic). */
const isRtl = (text: string): boolean => {
    const first = text.match(new RegExp(`${RTL_CHAR.source}|${LTR_CHAR.source}`));
    return !!first && RTL_CHAR.test(first[0]);
};

const safeUrl = (url: string): string | null => (/^(?:https?:|mailto:)/i.test(url) ? url : null);

export function documentTitle(markdown: string): string {
    const heading = parse(markdown).children.find(n => n.type === 'heading');
    const text = heading ? toString(heading) : markdown.replace(/[#*_>`|-]/g, ' ').trim();
    return text.replace(/\s+/g, ' ').split(' ').slice(0, 10).join(' ').slice(0, 80) || 'Document';
}

const fileName = (title: string, ext: string) =>
    `${title.replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'Document'}.${ext}`;

/* ───────────────────────── Word (.docx) ───────────────────────── */

const FONT = 'Times New Roman';
const COMPLEX_FONT = 'Arial';
const HEADINGS = [
    HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3,
    HeadingLevel.HEADING_4, HeadingLevel.HEADING_5, HeadingLevel.HEADING_6,
];

interface RunStyle { bold?: boolean; italics?: boolean; strike?: boolean; code?: boolean }

function runs(nodes: PhrasingContent[], style: RunStyle = {}, rtl = false): ParagraphChild[] {
    return nodes.flatMap((node): ParagraphChild[] => {
        switch (node.type) {
            case 'text':
                return [new TextRun({ text: node.value, bold: style.bold, italics: style.italics, strike: style.strike, rightToLeft: rtl })];
            case 'inlineCode':
                return [new TextRun({ text: node.value, font: 'Courier New', shading: { type: ShadingType.CLEAR, fill: 'F0F0F0' } })];
            case 'strong': return runs(node.children, { ...style, bold: true }, rtl);
            case 'emphasis': return runs(node.children, { ...style, italics: true }, rtl);
            case 'delete': return runs(node.children, { ...style, strike: true }, rtl);
            case 'break': return [new TextRun({ break: 1 })];
            case 'link': {
                const link = safeUrl(node.url);
                const children = runs(node.children, style, rtl);
                return link
                    ? [new ExternalHyperlink({ link, children: children.map(c => c as TextRun) })]
                    : children;
            }
            default: return []; // images and raw HTML are not exported
        }
    });
}

function wordTable(node: Table): DocxTable {
    return new DocxTable({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: node.children.map((row, rowIndex) => new TableRow({
            tableHeader: rowIndex === 0,
            cantSplit: true,
            children: row.children.map(cell => {
                const rtl = isRtl(toString(cell));
                return new TableCell({
                    shading: rowIndex === 0 ? { type: ShadingType.CLEAR, fill: 'E8E8E8' } : undefined,
                    margins: { top: 60, bottom: 60, left: 100, right: 100 },
                    children: [new Paragraph({
                        bidirectional: rtl,
                        children: runs(cell.children, { bold: rowIndex === 0 }, rtl),
                    })],
                });
            }),
        })),
    });
}

interface Ctx { indent: number; listRef?: string; listLevel?: number; quote?: boolean }

function blocks(nodes: RootContent[], ctx: Ctx, orderedRefs: string[]): FileChild[] {
    return nodes.flatMap((node): FileChild[] => {
        switch (node.type) {
            case 'heading': {
                const rtl = isRtl(toString(node));
                return [new Paragraph({
                    heading: HEADINGS[node.depth - 1], bidirectional: rtl, keepNext: true,
                    children: runs(node.children, {}, rtl),
                })];
            }
            case 'paragraph': {
                const rtl = isRtl(toString(node));
                return [new Paragraph({
                    bidirectional: rtl,
                    indent: ctx.indent ? { left: ctx.indent } : undefined,
                    border: ctx.quote ? { left: { style: BorderStyle.SINGLE, size: 12, color: '999999', space: 8 } } : undefined,
                    numbering: ctx.listRef ? { reference: ctx.listRef, level: ctx.listLevel ?? 0 } : undefined,
                    children: runs(node.children, {}, rtl),
                })];
            }
            case 'list': return listBlocks(node, ctx, orderedRefs);
            case 'blockquote': return blocks(node.children, { ...ctx, indent: ctx.indent + 480, quote: true }, orderedRefs);
            case 'table': return [wordTable(node), new Paragraph({ children: [] })];
            case 'code':
                return node.value.split('\n').map(line => new Paragraph({
                    shading: { type: ShadingType.CLEAR, fill: 'F0F0F0' },
                    children: [new TextRun({ text: line, font: 'Courier New', size: 20 })],
                }));
            case 'thematicBreak':
                return [new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '999999', space: 1 } }, children: [] })];
            default: return [];
        }
    });
}

function listBlocks(list: List, ctx: Ctx, orderedRefs: string[]): FileChild[] {
    const level = ctx.listRef ? (ctx.listLevel ?? 0) + 1 : 0;
    let ref = 'bullets';
    if (list.ordered) {
        ref = `ordered-${orderedRefs.length}`;
        orderedRefs.push(ref);
    }
    const numbered: Ctx = { ...ctx, listRef: ref, listLevel: Math.min(level, 8) };
    const plain: Ctx = { ...ctx, indent: ctx.indent + 720 * (numbered.listLevel! + 1), listRef: undefined };
    return list.children.flatMap(item => item.children.flatMap((child, index) =>
        // Only an item's first paragraph carries the bullet/number; nested lists keep their own level.
        blocks([child], child.type === 'list' ? numbered : index === 0 ? numbered : plain, orderedRefs)));
}

const levels = (format: (typeof LevelFormat)[keyof typeof LevelFormat], text: (n: number) => string) =>
    Array.from({ length: 9 }, (_, level) => ({
        level, format, text: text(level), alignment: AlignmentType.START,
        style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
    }));

export async function buildDocx(markdown: string): Promise<{ blob: Blob; name: string }> {
    const title = documentTitle(markdown);
    const orderedRefs: string[] = [];
    const children = blocks(parse(markdown).children, { indent: 0 }, orderedRefs);

    const doc = new Document({
        title,
        styles: {
            default: { document: { run: { font: { ascii: FONT, hAnsi: FONT, cs: COMPLEX_FONT }, size: 24 }, paragraph: { spacing: { after: 160, line: 320 } } } },
            paragraphStyles: HEADINGS.map((_, i) => ({
                id: `Heading${i + 1}`, name: `heading ${i + 1}`, basedOn: 'Normal', next: 'Normal', quickFormat: true,
                run: { bold: true, size: [36, 30, 27, 25, 24, 24][i], font: { ascii: FONT, hAnsi: FONT, cs: COMPLEX_FONT } },
                paragraph: { spacing: { before: i === 0 ? 0 : 280, after: 140 }, ...(i === 0 ? { alignment: AlignmentType.CENTER } : {}) },
            })),
        },
        numbering: {
            config: [
                { reference: 'bullets', levels: levels(LevelFormat.BULLET, level => (level % 2 ? '–' : '•')) },
                ...orderedRefs.map(reference => ({
                    reference,
                    levels: levels(LevelFormat.DECIMAL, level => `%${level + 1}.`),
                })),
            ],
        },
        sections: [{
            properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
            children,
        }],
    });

    return { blob: await Packer.toBlob(doc), name: fileName(title, 'docx') };
}

/* ───────────────────────── PDF (browser print engine) ───────────────────────── */

const esc = (text: string) =>
    text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(nodes: PhrasingContent[]): string {
    return nodes.map(node => {
        switch (node.type) {
            case 'text': return esc(node.value);
            case 'inlineCode': return `<code>${esc(node.value)}</code>`;
            case 'strong': return `<strong>${inline(node.children)}</strong>`;
            case 'emphasis': return `<em>${inline(node.children)}</em>`;
            case 'delete': return `<del>${inline(node.children)}</del>`;
            case 'break': return '<br>';
            case 'link': {
                const url = safeUrl(node.url);
                return url ? `<a href="${esc(url)}">${inline(node.children)}</a>` : inline(node.children);
            }
            default: return '';
        }
    }).join('');
}

function html(nodes: RootContent[]): string {
    return nodes.map(node => {
        switch (node.type) {
            case 'heading': return `<h${node.depth} dir="auto">${inline(node.children)}</h${node.depth}>`;
            case 'paragraph': return `<p dir="auto">${inline(node.children)}</p>`;
            case 'blockquote': return `<blockquote>${html(node.children)}</blockquote>`;
            case 'code': return `<pre>${esc(node.value)}</pre>`;
            case 'thematicBreak': return '<hr>';
            case 'list': {
                const tag = node.ordered ? 'ol' : 'ul';
                const items = node.children.map(item => `<li dir="auto">${html(item.children)}</li>`).join('');
                return `<${tag}${node.ordered && node.start && node.start !== 1 ? ` start="${node.start}"` : ''}>${items}</${tag}>`;
            }
            case 'table': {
                const [head, ...body] = node.children;
                const row = (r: Table['children'][number], tag: 'th' | 'td') =>
                    `<tr>${r.children.map(c => `<${tag} dir="auto">${inline(c.children)}</${tag}>`).join('')}</tr>`;
                return `<table><thead>${row(head, 'th')}</thead><tbody>${body.map(r => row(r, 'td')).join('')}</tbody></table>`;
            }
            default: return '';
        }
    }).join('');
}

const PRINT_CSS = `
@page { size: A4; margin: 2.54cm; }
* { box-sizing: border-box; }
body { margin: 0; font: 12pt/1.6 "Times New Roman", "Noto Naskh Arabic", "Jameel Noor Nastaleeq", serif; color: #000; }
h1 { font-size: 18pt; text-align: center; margin: 0 0 14pt; }
h2 { font-size: 15pt; margin: 18pt 0 8pt; } h3 { font-size: 13.5pt; margin: 14pt 0 6pt; }
h4, h5, h6 { font-size: 12pt; margin: 12pt 0 6pt; }
h1, h2, h3, h4, h5, h6 { break-after: avoid; }
p { margin: 0 0 8pt; text-align: justify; orphans: 3; widows: 3; }
ul, ol { margin: 0 0 8pt; padding-inline-start: 22pt; } li { margin-bottom: 3pt; }
blockquote { margin: 0 0 8pt; padding-inline-start: 12pt; border-inline-start: 3pt solid #999; color: #333; }
pre, code { font-family: "Courier New", monospace; background: #f0f0f0; } pre { padding: 8pt; white-space: pre-wrap; font-size: 10pt; }
code { padding: 0 2pt; } a { color: #000; }
hr { border: 0; border-top: 1px solid #999; margin: 12pt 0; }
table { width: 100%; border-collapse: collapse; margin: 0 0 10pt; }
th, td { border: 1px solid #555; padding: 4pt 6pt; vertical-align: top; text-align: start; }
th { background: #e8e8e8; } thead { display: table-header-group; } tr { break-inside: avoid; }`;

/** Opens the browser's print dialog on a styled copy of the document; "Save as PDF" produces the file. */
export function printPdf(markdown: string): void {
    const title = documentTitle(markdown);
    const frame = document.createElement('iframe');
    // No scripts can run in the frame; same-origin is only needed so the parent can call print().
    frame.setAttribute('sandbox', 'allow-modals allow-same-origin');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden';
    frame.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(fileName(title, 'pdf').replace(/\.pdf$/, ''))}</title><style>${PRINT_CSS}</style></head><body>${html(parse(markdown).children)}</body></html>`;
    const cleanup = () => frame.remove();
    frame.onload = () => {
        const win = frame.contentWindow;
        if (!win) return cleanup();
        win.addEventListener('afterprint', cleanup);
        win.focus();
        win.print();
        setTimeout(cleanup, 120_000);
    };
    document.body.appendChild(frame);
}

/* ───────────────────────── entry point ───────────────────────── */

export async function exportDocument(markdown: string, format: DocumentFormat): Promise<void> {
    if (format === 'pdf') return printPdf(markdown);
    const { blob, name } = await buildDocx(markdown);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
