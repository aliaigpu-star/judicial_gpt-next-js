'use client';

import Link from 'next/link';
import {
  MessageSquare, FileText, ScanText, Mic, Paperclip, Search,
  Scale, Check, ArrowRight,
} from 'lucide-react';
import { FadeIn, PageCTA, PageHero, SiteShell } from '@/components/site/SiteShell';
import { AIMS, CORE_FEATURES, IMPACT, PROBLEM, RELIABILITY, SITE } from '@/lib/site-content';

const icons = [MessageSquare, FileText, ScanText, Mic, Paperclip, Search];

export default function FeaturesPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Product · Features"
        title="Current capabilities built for"
        highlight="real judicial workflows"
        description="From bilingual Q&A and judgment drafting to OCR, voice input, and citation-aware research — JudicialGPT reduces cognitive load while preserving professional judgment."
        crumbs={[{ label: 'Product', href: '/features' }, { label: 'Features' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link href="/signup" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#00a859] text-white font-bold shadow-md shadow-[#00a859]/25 hover:bg-[#00a859] transition-colors">
            Try JudicialGPT <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/docs" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:border-[#00a859]/25 hover:bg-[#00a859]/10/50 transition-colors">
            Read Documentation
          </Link>
        </div>
      </PageHero>

      {/* Problem strip */}
      <section className="py-16 bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-3xl mb-10">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-3">
              Built for the bandwidth gap
            </h2>
            <p className="text-slate-500 text-lg">
              {SITE.tagline}. The challenge facing Pakistan&apos;s courts is not competence — it is time.
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PROBLEM.points.map((point, i) => (
              <FadeIn key={i} delay={i * 0.05}>
                <div className="h-full p-5 rounded-2xl border border-slate-200 bg-slate-50/80 hover:border-[#00a859]/25 hover:bg-[#00a859]/10/30 transition-all">
                  <div className="w-8 h-8 rounded-lg bg-[#00a859]/15 text-[#00a859] font-bold text-sm flex items-center justify-center mb-3">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  <p className="text-slate-600 text-sm leading-relaxed">{point}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Feature bento */}
      <section className="py-20 lg:py-24 bg-[#F7FAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-3">
              Current features
            </h2>
            <p className="text-slate-500 text-lg">
              Capabilities live in production workflows: research, drafting, OCR, voice, attachments, and grounded web search.
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CORE_FEATURES.map((feat, i) => {
              const Icon = icons[i];
              return (
                <FadeIn key={feat.title} delay={i * 0.06}>
                  <div className="group h-full rounded-2xl border border-slate-200 bg-white p-6 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#00a859]/10 hover:border-[#00a859]/25 transition-all duration-300">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00a859] to-[#00a859] flex items-center justify-center shadow-md mb-5">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-900 mb-2">{feat.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{feat.description}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Reliability */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-start">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-4 bg-[#00a859]/10 text-[#00a859] border border-[#00a859]/25">
              Reliability
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-4">
              Designed to ground answers in sources
            </h2>
            <p className="text-slate-500 text-lg mb-6">
              {AIMS.objective} Features are paired with retrieval, citations, and uncertainty signaling so professionals can trust — and verify — every step.
            </p>
            <ul className="space-y-3">
              {RELIABILITY.map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-600 text-sm">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-[#00a859]/15 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-[#00a859]" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </FadeIn>
          <FadeIn delay={0.1}>
            <div className="rounded-3xl border border-[#00a859]/15 bg-gradient-to-br from-emerald-50 to-white p-8 shadow-lg shadow-[#00a859]/5">
              <Scale className="w-10 h-10 text-[#00a859] mb-6" />
              <h3 className="font-heading text-2xl font-semibold text-slate-900 mb-4">Expected impact for judges</h3>
              <ul className="space-y-4">
                {IMPACT.judges.map((item) => (
                  <li key={item} className="flex gap-3 text-slate-600 text-sm leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00a859] mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </div>
      </section>

      <PageCTA title="Explore features in your own workflow" />
    </SiteShell>
  );
}
