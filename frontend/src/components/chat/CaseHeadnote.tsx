import React from 'react';
import type { CaseDetail } from '@/lib/caseLibraryApi';

/**
 * The headnote laid out like a law-report headnote page: citation line,
 * "Present to", the parties (centred, bold), then the headnote text.
 * Always dark text on white "paper", like the reference page, in both themes.
 */
export default function CaseHeadnote({ judgment }: { judgment: CaseDetail }) {
    const citation = judgment.citation || judgment.citation_raw;
    const judges = judgment.judges || judgment.author_judge;
    // Each "Held, that …" holding becomes its own paragraph.
    const holdings = (judgment.headnote || '')
        .split(/\s+(?=Held,)/)
        .map(text => text.trim())
        .filter(Boolean);

    return (
        <div
            className="rounded-xl border border-[#e5e5e5] bg-white px-6 py-6 sm:px-10 sm:py-8 text-[13.5px] leading-[1.65] text-[#111] shadow-sm"
            style={{ fontFamily: 'Verdana, Geneva, "DejaVu Sans", sans-serif' }}
        >
            {(citation || judgment.court) && (
                <p className="mb-3 flex flex-wrap gap-x-6 font-bold">
                    {citation && <span>{citation}</span>}
                    {judgment.court && <span>{judgment.court}</span>}
                    {judgment.decision_date && <span>{judgment.decision_date}</span>}
                </p>
            )}

            {judges && (
                <p className="mb-4">
                    Present to: <strong className="uppercase">{judges}</strong>
                </p>
            )}

            {(judgment.petitioner || judgment.respondent) && (
                <p className="my-5 text-center font-bold">
                    {judgment.petitioner}
                    <br />
                    Versus
                    <br />
                    {judgment.respondent}
                </p>
            )}

            {judgment.acts_referred && <p className="mb-3 font-semibold">{judgment.acts_referred}</p>}

            {holdings.length > 0 ? (
                holdings.map((text, i) => (
                    <p key={i} className="mb-3 text-justify">
                        {text}
                    </p>
                ))
            ) : (
                <p className="text-[#666]">No headnote is available for this case. Open the full case to read it.</p>
            )}

            {judgment.ratio_decidendi && (
                <p className="mt-5 text-justify">
                    <strong>Ratio decidendi: </strong>
                    {judgment.ratio_decidendi}
                </p>
            )}
        </div>
    );
}
