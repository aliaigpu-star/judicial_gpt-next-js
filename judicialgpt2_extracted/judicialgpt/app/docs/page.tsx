'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen, Rocket, Layers, Shield, CheckCircle, Users,
  ChevronRight, Database, Server, Cpu,
} from 'lucide-react';
import { FadeIn, PageCTA, PageHero, SiteShell } from '@/components/site/SiteShell';
import {
  CORE_FEATURES, TECH_STACK, SECURITY, RELIABILITY, IMPACT, SITE,
} from '@/lib/site-content';

const NAV = [
  { id: 'getting-started', label: 'Getting Started', icon: Rocket },
  { id: 'features', label: 'Features', icon: Layers },
  { id: 'architecture', label: 'Architecture', icon: Server },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'reliability', label: 'Reliability', icon: CheckCircle },
  { id: 'impact', label: 'Impact Audiences', icon: Users },
] as const;

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<string>(NAV[0].id);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    NAV.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSection(id);
        },
        { rootMargin: '-15% 0px -60% 0px', threshold: 0 },
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <SiteShell>
      <PageHero
        eyebrow="Support · Documentation"
        title="Documentation"
        highlight="for builders & professionals"
        description="Technical and product documentation for JudicialGPT — from onboarding and core features to architecture, security, reliability, and impact by audience."
        crumbs={[{ label: 'Support', href: '/docs' }, { label: 'Documentation' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-500/25 hover:bg-emerald-600 transition-colors"
          >
            Get Started Free
          </Link>
          <Link
            href="/help"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:border-emerald-200 transition-colors"
          >
            Help Center
          </Link>
        </div>
      </PageHero>

      <section className="py-12 lg:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-12 xl:gap-16">
            {/* Docs sidebar — lg+ */}
            <aside className="hidden lg:block">
              <nav
                aria-label="Documentation sections"
                className="sticky top-28 rounded-2xl border border-slate-200 bg-[#F7FAF8] overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-slate-200 bg-white">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-slate-900">Documentation</span>
                  </div>
                </div>
                <ul className="p-3 space-y-0.5">
                  {NAV.map(({ id, label, icon: Icon }) => (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className={`flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg transition-colors ${
                          activeSection === id
                            ? 'bg-emerald-500 text-white font-semibold shadow-sm'
                            : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {label}
                        {activeSection === id && <ChevronRight className="w-3.5 h-3.5 ml-auto" />}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            {/* Mobile nav pills */}
            <div className="lg:hidden flex gap-2 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
              {NAV.map(({ id, label }) => (
                <a
                  key={id}
                  href={`#${id}`}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-bold border ${
                    activeSection === id
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {label}
                </a>
              ))}
            </div>

            <div className="space-y-16 lg:space-y-20 min-w-0">
              {/* Getting Started */}
              <FadeIn>
                <section id="getting-started" className="scroll-mt-28">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Rocket className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900">
                      Getting Started
                    </h2>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {[
                      {
                        step: '01',
                        title: 'Create an account',
                        body: 'Sign up with your institutional or professional email. Judges and staff in PJA pilot programs may receive pre-provisioned access.',
                      },
                      {
                        step: '02',
                        title: 'Choose your workflow',
                        body: 'Start with Q&A for research, attach case files for summarization, or open Judgment Writer for structured drafting support.',
                      },
                      {
                        step: '03',
                        title: 'Verify citations',
                        body: 'Review every cited source. JudicialGPT is retrieval-based — always confirm precedents and statutes before relying on outputs.',
                      },
                      {
                        step: '04',
                        title: 'Provide feedback',
                        body: 'Corrections and RLHF feedback from judges improve accuracy. Weekly refinements ship from PJA pilot learnings.',
                      },
                    ].map((card) => (
                      <div
                        key={card.step}
                        className="p-5 rounded-2xl border border-slate-200 bg-[#F7FAF8] hover:border-emerald-200 transition-colors"
                      >
                        <span className="text-xs font-bold text-emerald-600">{card.step}</span>
                        <h3 className="font-bold text-slate-900 mt-1 mb-2">{card.title}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{card.body}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </FadeIn>

              {/* Features */}
              <FadeIn>
                <section id="features" className="scroll-mt-28">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Layers className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900">
                      Features
                    </h2>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {CORE_FEATURES.map((feat) => (
                      <div
                        key={feat.title}
                        className="p-5 rounded-2xl border border-slate-200 bg-white hover:shadow-md hover:border-emerald-200 transition-all"
                      >
                        <h3 className="font-bold text-slate-900 mb-2">{feat.title}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{feat.description}</p>
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/features"
                    className="inline-flex items-center gap-1 mt-6 text-sm font-semibold text-emerald-600 hover:underline"
                  >
                    Full features overview <ChevronRight className="w-4 h-4" />
                  </Link>
                </section>
              </FadeIn>

              {/* Architecture */}
              <FadeIn>
                <section id="architecture" className="scroll-mt-28">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Server className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900">
                      Architecture
                    </h2>
                  </div>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="grid md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200">
                      {[
                        { icon: Layers, label: 'Frontend', value: TECH_STACK.frontend },
                        { icon: Cpu, label: 'Backend', value: TECH_STACK.backend },
                        { icon: Database, label: 'Database', value: TECH_STACK.database },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="p-6 bg-white">
                          <Icon className="w-5 h-5 text-emerald-600 mb-3" />
                          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                            {label}
                          </p>
                          <p className="text-slate-700 text-sm font-medium leading-relaxed">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="p-6 bg-[#F7FAF8] border-t border-slate-200">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                        AI & Integration Layer
                      </p>
                      <ul className="grid sm:grid-cols-2 gap-2">
                        {TECH_STACK.models.map((model) => (
                          <li
                            key={model}
                            className="flex gap-2 text-sm text-slate-600"
                          >
                            <span className="text-emerald-500 shrink-0">→</span>
                            {model}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </section>
              </FadeIn>

              {/* Security */}
              <FadeIn>
                <section id="security" className="scroll-mt-28">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900">
                      Security
                    </h2>
                  </div>
                  <p className="text-slate-600 mb-6 max-w-2xl">
                    Judicial data never leaves Pakistan. Private servers, encryption, RLS, and WAF protections
                    are baseline requirements — not optional add-ons.
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {SECURITY.map((point) => (
                      <li
                        key={point}
                        className="flex gap-2.5 p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 text-sm text-slate-700"
                      >
                        <Shield className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/privacy"
                    className="inline-flex items-center gap-1 mt-6 text-sm font-semibold text-emerald-600 hover:underline"
                  >
                    Privacy Policy <ChevronRight className="w-4 h-4" />
                  </Link>
                </section>
              </FadeIn>

              {/* Reliability */}
              <FadeIn>
                <section id="reliability" className="scroll-mt-28">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900">
                      Reliability
                    </h2>
                  </div>
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950 text-white mb-6">
                    <p className="text-emerald-300 text-sm font-bold uppercase tracking-wider mb-2">
                      Design principle
                    </p>
                    <p className="text-lg font-medium leading-relaxed">
                      Prefer no answer over an incorrect answer. Every response should trace back to a document.
                    </p>
                  </div>
                  <ul className="space-y-3">
                    {RELIABILITY.map((item) => (
                      <li key={item} className="flex gap-3 text-slate-600 text-sm leading-relaxed">
                        <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              </FadeIn>

              {/* Impact */}
              <FadeIn>
                <section id="impact" className="scroll-mt-28">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-emerald-600" />
                    </div>
                    <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900">
                      Impact Audiences
                    </h2>
                  </div>
                  <div className="grid md:grid-cols-3 gap-5">
                    {(
                      [
                        ['Judges', IMPACT.judges, 'emerald'],
                        ['Court Staff', IMPACT.staff, 'teal'],
                        ['Judicial System', IMPACT.system, 'slate'],
                      ] as const
                    ).map(([title, items, accent]) => (
                      <div
                        key={title}
                        className={`p-6 rounded-2xl border ${
                          accent === 'emerald'
                            ? 'border-emerald-200 bg-emerald-50/50'
                            : accent === 'teal'
                              ? 'border-teal-200 bg-teal-50/40'
                              : 'border-slate-200 bg-slate-50/80'
                        }`}
                      >
                        <h3 className="font-bold text-slate-900 mb-4">{title}</h3>
                        <ul className="space-y-3">
                          {items.map((item) => (
                            <li key={item} className="flex gap-2 text-sm text-slate-600 leading-relaxed">
                              <span className="w-1 h-1 rounded-full bg-emerald-500 mt-2 shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <p className="mt-6 text-sm text-slate-500">
                    {SITE.stats.find((s) => s.label.includes('Judges'))?.value}{' '}
                    {SITE.stats.find((s) => s.label.includes('Judges'))?.label} —{' '}
                    <Link href="/community" className="text-emerald-600 hover:underline">
                      join the community
                    </Link>
                  </p>
                </section>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      <PageCTA title="Build with confidence" description="Explore features live or contact us for institutional deployment documentation." />
    </SiteShell>
  );
}
