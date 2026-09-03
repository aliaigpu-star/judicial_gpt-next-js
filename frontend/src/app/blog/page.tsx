'use client';

import { BookOpen, Calendar, Tag, ArrowDown } from 'lucide-react';
import { FadeIn, PageCTA, PageHero, SiteShell } from '@/components/site/SiteShell';
import { BLOG_POSTS } from '@/lib/site-content';

const ARTICLE_BODY: Record<string, string[]> = {
  'why-judicialgpt': [
    'Pakistan\'s judiciary faces a structural challenge: over 2.26 million pending cases and a backlog that grows every year. Judges are not failing on competence — they are drowning in research, drafting, and record review that consumes 60–70% of their working hours. Cognitive overload leads to inconsistency, delay, and burnout across the system.',
    'JudicialGPT was conceived to restore judicial bandwidth without replacing judicial judgment. The platform assists with legal research, document comprehension, and draft scaffolding while keeping the judge firmly in control of every decision. Our principle — "AI Assists, Judges Decide" — is not marketing copy; it is the architectural constraint that shapes every feature we ship.',
    'Generic tools like ChatGPT pose real risks for courts: data leakage, foreign hosting, and costs estimated at PKR 100 million per year for roughly 1,600 judges. JudicialGPT offers a sovereign alternative — locally hosted, citation-aware, and designed for the multilingual reality of Pakistani courtrooms.',
  ],
  'bilingual-legal-intelligence': [
    'Pakistani courts operate in a multilingual world. Evidence arrives in Urdu, English, and regional languages — often as scanned paper records that resist quick search and analysis. A legal AI platform that only understands English misses the majority of what judges actually read.',
    'JudicialGPT invests heavily in bilingual data preparation: Urdu–English Q&A pairs in JSONL format, OCR pipelines for scanned documents via Google Vision, and voice input through Whisper for stenographers and court staff. Our LLaMA 3.1 8B model is custom-trained on this bilingual judicial corpus, not generic web text.',
    'The roadmap extends beyond Urdu and English toward Punjabi, Saraiki, Sindhi, and Balochi — because accessibility means meeting litigants and judges in the languages they actually use. Bilingual intelligence is not a feature checkbox; it is the foundation of relevance for Pakistan\'s judiciary.',
  ],
  'rag-not-guesswork': [
    'Large language models can generate fluent prose that sounds authoritative but cites no real source. In legal contexts, that failure mode is unacceptable. JudicialGPT addresses it through retrieval-augmented generation (RAG): every answer is grounded in retrieved documents from case law bulletins, statutes, and shared judicial files before the model synthesizes a response.',
    'Guard rails enforce mandatory citations whenever possible, confidence scoring flags uncertain outputs, and the system is designed to prefer no answer over an incorrect one. Prompt engineering is tuned specifically for judicial workflows — fact extraction, issue framing, precedent comparison — rather than open-ended chat.',
    'Human-in-the-loop reinforcement learning from judicial feedback (RLHF) closes the loop. Judges who tested JudicialGPT through Punjab Judicial Academy trainings provide weekly refinements that improve retrieval quality, citation accuracy, and draft structure. RAG is not a buzzword here; it is the reliability contract we make with every user.',
  ],
  'pja-pilot-feedback': [
    'JudicialGPT launched in Punjab Judicial Academy (PJA) training sessions, putting the platform directly in front of judges during structured workshops. Over 200 judges participated, providing real-time feedback on research speed, drafting support, and usability in courtroom-adjacent workflows.',
    'The pilot surfaced consistent themes: judges valued faster access to relevant precedents, appreciated judgment skeleton drafts that covered facts, issues, and applicable law, and requested tighter bilingual support for Urdu evidence. Staff highlighted voice-to-text transcription and document summarization as immediate workload reducers.',
    'Weekly testing cycles continue beyond the initial launch. Each iteration incorporates judicial feedback into model tuning, UI refinements, and data corpus expansion. PJA is not a one-time demo — it is an ongoing partnership that keeps JudicialGPT aligned with how judges actually work, not how engineers assume they work.',
  ],
  'security-by-design': [
    'Judicial data is among the most sensitive information a state handles. Sending case files, judgments-in-progress, or litigant records to foreign AI servers is a non-starter. JudicialGPT is architected for local sovereignty: PostgreSQL hosted in Pakistan, AI models deployed on private servers, and a explicit policy that judicial data never leaves institutional control.',
    'Technical controls stack in depth: HTTPS with OV SSL/TLS certificates, role-level security for admin and user access, Web Application Firewall and ModSecurity via Cloudflare, protections against session hijacking, SQL injection, and XSS, plus CSP, CORS restrictions, and validated file uploads. All data is encrypted at rest and in transit.',
    'Operational security includes activity logging, automated backups, continuous vulnerability patching, bot protection, geo-blocking, and traffic filtering. These are not afterthoughts bolted onto a SaaS product — they are requirements derived from conversations with judges who asked, first and foremost, "where does my data go?"',
  ],
  'judgment-writer': [
    'Drafting a well-reasoned judgment is among the most cognitively demanding tasks a judge performs. It requires synthesizing facts from lengthy records, framing legal issues precisely, applying the correct statutes and precedents, and writing prose that will withstand appellate scrutiny — often under time pressure with dozens of other cases waiting.',
    'The Judgment Writer workflow in JudicialGPT produces structured skeletons: a facts section drawn from uploaded case files, clearly enumerated issues, applicable law with cited precedents, and a reasoning scaffold the judge can edit, expand, or reject entirely. The judge remains the author; the AI reduces the blank-page problem and repetitive research loops.',
    'Pilot feedback from PJA sessions confirmed the value: judges reported significant reduction in drafting time while maintaining — and often improving — consistency in legal referencing. The workflow integrates with the broader platform: OCR for scanned records, bilingual Q&A for research, and RAG-backed citations throughout. Judgment Writer is decision support, not decision replacement.',
  ],
};

const CATEGORY_COLORS: Record<string, string> = {
  Insight: 'bg-violet-50 text-violet-700 border-violet-200',
  Product: 'bg-[#00a859]/10 text-[#00a859] border-[#00a859]/25',
  Engineering: 'bg-blue-50 text-blue-700 border-blue-200',
  Impact: 'bg-amber-50 text-amber-700 border-amber-200',
  Security: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function BlogPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Insights · Blog"
        title="Perspectives on AI"
        highlight="in the judiciary"
        description="Research notes, product updates, and engineering deep-dives from the JudicialGPT team — covering backlog, bilingual NLP, RAG, pilot feedback, security, and judgment drafting."
        crumbs={[{ label: 'Company', href: '/blog' }, { label: 'Blog' }]}
      >
        <a
          href="#why-judicialgpt"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#00a859] hover:text-[#00a859] transition-colors"
        >
          Read latest <ArrowDown className="w-4 h-4" />
        </a>
      </PageHero>

      {/* Post cards grid */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="mb-10">
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900">
              Latest articles
            </h2>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {BLOG_POSTS.map((post, i) => (
              <FadeIn key={post.slug} delay={i * 0.05}>
                <a
                  href={`#${post.slug}`}
                  className="group block h-full rounded-2xl border border-slate-200 bg-white p-6 hover:border-[#00a859] hover:shadow-xl hover:shadow-[#00a859]/8 transition-all duration-300"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        CATEGORY_COLORS[post.category] ?? 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}
                    >
                      <Tag className="w-3 h-3" />
                      {post.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-400 ml-auto">
                      <Calendar className="w-3 h-3" />
                      {post.date}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-slate-900 mb-2 group-hover:text-[#00a859] transition-colors leading-snug">
                    {post.title}
                  </h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-3">{post.excerpt}</p>
                  <span className="mt-4 inline-block text-sm font-semibold text-[#00a859] group-hover:underline">
                    Read article →
                  </span>
                </a>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Full articles with alternating left border accents */}
      <section className="py-16 lg:py-24 bg-[#F7FAF8] border-t border-slate-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="flex items-center gap-3 mb-12">
            <BookOpen className="w-6 h-6 text-[#00a859]" />
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900">
              Full articles
            </h2>
          </FadeIn>

          <div className="space-y-16">
            {BLOG_POSTS.map((post, i) => {
              const paragraphs = ARTICLE_BODY[post.slug] ?? [post.excerpt];
              const borderColor =
                i % 3 === 0
                  ? 'border-[#00a859]'
                  : i % 3 === 1
                    ? 'border-[#00a859]'
                    : 'border-[#00a859]';
              const bgTint =
                i % 2 === 0 ? 'bg-white' : 'bg-[#00a859]/10/40';

              return (
                <FadeIn key={post.slug} delay={0.04}>
                  <article
                    id={post.slug}
                    className={`scroll-mt-28 rounded-2xl ${bgTint} border border-slate-200 overflow-hidden shadow-sm`}
                  >
                    <div className={`border-l-4 ${borderColor} pl-0`}>
                      <div className="p-8 md:p-10">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                              CATEGORY_COLORS[post.category] ?? 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {post.category}
                          </span>
                          <time className="text-sm text-slate-400">{post.date}</time>
                        </div>
                        <h3 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900 mb-6 leading-tight">
                          {post.title}
                        </h3>
                        <div className="space-y-5">
                          {paragraphs.map((para, pi) => (
                            <p key={pi} className="text-slate-600 leading-relaxed text-base md:text-[1.05rem]">
                              {para}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </article>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      <PageCTA
        title="Stay informed as JudicialGPT evolves"
        description="Follow our blog for updates on bilingual NLP, RAG reliability, PJA pilot results, and new features for judges and legal professionals."
      />
    </SiteShell>
  );
}
