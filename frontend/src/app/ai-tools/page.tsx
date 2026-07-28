'use client';

import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Check,
  Clock,
  FileSearch,
  Layers,
  Mic,
  Sparkles,
  UserCheck,
  Zap,
} from 'lucide-react';
import { FadeIn, PageCTA, PageHero, SiteShell } from '@/components/site/SiteShell';
import { AI_TOOLS, IMPACT, SITE } from '@/lib/site-content';

const chatbot = AI_TOOLS.find((t) => t.slug === 'chatbot')!;
const casePrism = AI_TOOLS.find((t) => t.slug === 'case-prism')!;
const consultant = AI_TOOLS.find((t) => t.slug === 'consultant')!;

export default function AIToolsPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Product · AI Tools"
        title="Integrated AI-powered legal tools"
        highlight="for research & consultation"
        description="Three purpose-built tools — a citation-aware chatbot, deep case research, and 24/7 virtual consultation — designed for judges, lawyers, and court staff who need answers grounded in Pakistani law."
        crumbs={[{ label: 'Product', href: '/ai-tools' }, { label: 'AI Tools' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/25 hover:bg-emerald-600 transition-colors"
          >
            Start Free <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:border-emerald-200 hover:bg-emerald-50/50 transition-colors"
          >
            View All Features
          </Link>
        </div>
      </PageHero>

      {/* Featured chatbot — wide hero card */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-[#F2FBF6] via-white to-emerald-50/40 shadow-xl shadow-emerald-500/5">
              <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
              <div className="relative grid lg:grid-cols-5 gap-0">
                <div className="lg:col-span-3 p-8 md:p-10 lg:p-12">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.12em] mb-5 bg-emerald-500 text-white">
                    <Sparkles className="w-3 h-3" />
                    {chatbot.badge}
                  </div>
                  <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-4">
                    {chatbot.title}
                  </h2>
                  <p className="text-slate-500 text-lg leading-relaxed mb-8 max-w-xl">
                    {chatbot.description}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {chatbot.features.map((feat) => (
                      <div
                        key={feat}
                        className="flex items-center gap-2.5 text-sm text-slate-600 bg-white/80 rounded-xl px-4 py-3 border border-emerald-100/80"
                      >
                        <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-emerald-600" strokeWidth={3} />
                        </span>
                        {feat}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-2 flex items-center justify-center p-8 md:p-10 bg-gradient-to-br from-emerald-500 to-teal-700">
                  <div className="text-center text-white">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
                      <Bot className="w-10 h-10" />
                    </div>
                    <p className="text-white/80 text-sm mb-2">Trained on {SITE.stats[0].value} documents</p>
                    <p className="font-heading text-2xl font-semibold mb-1">Ask in Urdu or English</p>
                    <p className="text-white/70 text-sm">Real-time updates · Instant citations</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Case Prism & Consultant — detailed side panels */}
      <section className="py-16 lg:py-20 bg-[#F7FAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-3">
              Specialized research & consultation
            </h2>
            <p className="text-slate-500 text-lg">
              Go beyond chat — drill into precedents with advanced filters or explore strategic outcomes with an always-on consultant.
            </p>
          </FadeIn>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Case Prism */}
            <FadeIn delay={0.05}>
              <div className="h-full rounded-3xl border border-slate-200 bg-white overflow-hidden hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                <div className="h-2 bg-gradient-to-r from-emerald-400 to-teal-500" />
                <div className="p-8 md:p-10">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <Layers className="w-7 h-7 text-emerald-600" />
                    </div>
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">
                      {casePrism.badge}
                    </span>
                  </div>
                  <h3 className="font-heading text-2xl font-semibold text-slate-900 mb-3">
                    {casePrism.title}
                  </h3>
                  <p className="text-slate-500 leading-relaxed mb-8">{casePrism.description}</p>
                  <ul className="space-y-3 mb-8">
                    {casePrism.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-3 text-sm text-slate-600">
                        <FileSearch className="w-4 h-4 text-emerald-500 shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <div className="pt-6 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-400">
                    <span className="inline-flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-emerald-500" /> Relevance-ranked results
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-500" /> Millions of cases
                    </span>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Virtual Consultant */}
            <FadeIn delay={0.1}>
              <div className="h-full rounded-3xl border border-slate-200 bg-white overflow-hidden hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
                <div className="h-2 bg-gradient-to-r from-teal-400 to-emerald-600" />
                <div className="p-8 md:p-10">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center">
                      <UserCheck className="w-7 h-7 text-teal-600" />
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <Clock className="w-3 h-3" /> 24/7
                    </span>
                  </div>
                  <h3 className="font-heading text-2xl font-semibold text-slate-900 mb-3">
                    {consultant.title}
                  </h3>
                  <p className="text-slate-500 leading-relaxed mb-8">{consultant.description}</p>
                  <ul className="space-y-3 mb-8">
                    {consultant.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-3 text-sm text-slate-600">
                        <Check className="w-4 h-4 text-teal-500 shrink-0" strokeWidth={2.5} />
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <div className="rounded-2xl bg-[#F2FBF6] border border-emerald-100 p-4">
                    <p className="text-sm text-slate-600 leading-relaxed">
                      <span className="font-semibold text-emerald-700">Strategic guidance</span> without the wait — explore outcomes, risks, and next steps before your next hearing.
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Court staff impact */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-4 bg-emerald-50 text-emerald-700 border border-emerald-200">
                Impact · Court Staff
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-4">
                Built for the people behind every hearing
              </h2>
              <p className="text-slate-500 text-lg mb-8">
                Stenographers, clerks, and registry staff handle the volume that keeps courts moving. These tools lighten that load without compromising accuracy.
              </p>
              <ul className="space-y-4">
                {IMPACT.staff.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-slate-600">
                    <span className="mt-1 w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <Mic className="w-3.5 h-3.5 text-emerald-600" />
                    </span>
                    <span className="leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 to-emerald-950 p-8 md:p-10 text-white">
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage:
                      'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)',
                    backgroundSize: '24px 24px',
                  }}
                />
                <div className="relative z-10">
                  <p className="text-emerald-300 text-sm font-semibold uppercase tracking-wider mb-3">
                    Voice & documents
                  </p>
                  <p className="font-heading text-2xl md:text-3xl font-semibold mb-4 leading-snug">
                    Transcribe, summarize, and prepare — in Urdu and regional languages
                  </p>
                  <p className="text-white/70 text-sm leading-relaxed">
                    Whisper-powered voice input and OCR for scanned records mean staff spend less time on manual transcription and more on court readiness.
                  </p>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Resource links */}
      <section className="py-14 bg-[#F7FAF8] border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <h3 className="font-heading text-xl font-semibold text-slate-900 mb-1">
                  Explore further
                </h3>
                <p className="text-slate-500 text-sm">
                  Dive into platform capabilities, documentation, or create your account.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/features"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                >
                  Features <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:border-emerald-200 hover:text-emerald-700 transition-colors"
                >
                  Documentation <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-colors"
                >
                  Sign Up Free <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <PageCTA
        title="Put AI tools to work in your practice"
        description="Start with the JudicialGPT chatbot, explore Case Prism for deep research, or consult virtually — all grounded in Pakistani legal sources."
      />
    </SiteShell>
  );
}
