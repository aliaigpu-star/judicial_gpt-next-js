'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Shield, MapPin, Mail, ChevronRight } from 'lucide-react';
import { FadeIn, PageHero, SiteShell } from '@/components/site/SiteShell';
import { SECURITY, SITE } from '@/lib/site-content';

const LAST_UPDATED = 'July 17, 2026';

const SECTIONS = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'data-we-collect', label: 'Data We Collect' },
  { id: 'how-we-use', label: 'How We Use Data' },
  { id: 'storage-location', label: 'Storage & Location' },
  { id: 'sharing', label: 'Sharing' },
  { id: 'security', label: 'Security' },
  { id: 'retention', label: 'Retention' },
  { id: 'your-rights', label: 'Your Rights' },
  { id: 'contact', label: 'Contact' },
] as const;

export default function PrivacyPage() {
  const [activeId, setActiveId] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveId(id);
        },
        { rootMargin: '-20% 0px -65% 0px', threshold: 0 },
      );
      observer.observe(el);
      observers.push(observer);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, []);

  return (
    <SiteShell>
      <PageHero
        eyebrow="Legal · Privacy"
        title="Privacy Policy"
        highlight="Your data stays in Pakistan"
        description="JudicialGPT is built for courts and legal professionals who cannot afford data leakage. This policy explains what we collect, how we protect it, and where it lives."
        crumbs={[{ label: 'Legal', href: '/privacy' }, { label: 'Privacy Policy' }]}
      >
        <p className="text-sm text-slate-500">
          Last updated: <time dateTime="2026-07-17">{LAST_UPDATED}</time>
        </p>
      </PageHero>

      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-[240px_1fr] lg:gap-14 xl:gap-20">
            {/* Sticky TOC — desktop only */}
            <aside className="hidden lg:block">
              <nav
                aria-label="Table of contents"
                className="sticky top-28 rounded-2xl border border-slate-200 bg-[#F7FAF8] p-5"
              >
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">On this page</p>
                <ul className="space-y-1">
                  {SECTIONS.map(({ id, label }) => (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                          activeId === id
                            ? 'bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100'
                            : 'text-slate-600 hover:text-emerald-700 hover:bg-emerald-50/60'
                        }`}
                      >
                        <ChevronRight
                          className={`w-3.5 h-3.5 shrink-0 transition-opacity ${
                            activeId === id ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </aside>

            {/* Prose content */}
            <article className="prose-policy max-w-none">
              <FadeIn>
                <section id="introduction" className="scroll-mt-28 mb-14">
                  <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
                    Introduction
                  </h2>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    JudicialGPT (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates an AI-powered legal
                    intelligence platform at{' '}
                    <Link href={SITE.url} className="text-emerald-600 hover:underline">
                      {SITE.url}
                    </Link>
                    . We serve judges, court staff, lawyers, law students, and affiliated institutions across
                    Pakistan.
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Because our users handle sensitive judicial and legal information, privacy is not an
                    afterthought — it is a core design requirement. We host infrastructure locally, encrypt data
                    in transit and at rest, and do not send judicial case content to foreign AI servers. By
                    using JudicialGPT, you agree to the practices described in this policy.
                  </p>
                </section>
              </FadeIn>

              <FadeIn>
                <section id="data-we-collect" className="scroll-mt-28 mb-14">
                  <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
                    Data We Collect
                  </h2>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    We collect only what is necessary to provide secure, reliable legal intelligence services:
                  </p>
                  <div className="space-y-4">
                    {[
                      {
                        title: 'Account information',
                        body: 'Name, institutional email, role (judge, lawyer, student, staff), and authentication credentials when you register or sign in.',
                      },
                      {
                        title: 'Usage and query data',
                        body: 'Legal questions, prompts, attached documents, voice inputs, and session metadata needed to deliver research, drafting, OCR, and summarization features.',
                      },
                      {
                        title: 'Case and document content',
                        body: 'Files you upload — FIRs, pleadings, scanned records, judgment drafts — processed locally for OCR, retrieval, and citation-aware responses.',
                      },
                      {
                        title: 'Technical logs',
                        body: 'IP addresses, device type, browser, timestamps, and security events for fraud prevention, audit trails, and system reliability.',
                      },
                      {
                        title: 'Feedback and support',
                        body: 'Messages you send to our team, pilot feedback from judicial training programs, and optional RLHF corrections that improve model accuracy.',
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="p-5 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-emerald-200 transition-colors"
                      >
                        <h3 className="font-bold text-slate-900 mb-1">{item.title}</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">{item.body}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </FadeIn>

              <FadeIn>
                <section id="how-we-use" className="scroll-mt-28 mb-14">
                  <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
                    How We Use Data
                  </h2>
                  <ul className="space-y-3 text-slate-600">
                    {[
                      'Deliver legal research, Q&A, judgment drafting support, OCR, voice transcription, and document summarization.',
                      'Authenticate users, enforce role-based access (RLS), and maintain session security.',
                      'Improve retrieval quality, citation accuracy, and bilingual model performance through aggregated, privacy-preserving feedback.',
                      'Monitor system health, detect abuse, and comply with institutional audit requirements.',
                      'Communicate service updates, security notices, and support responses you request.',
                    ].map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 text-slate-600 text-sm leading-relaxed">
                    We do not sell personal data. We do not use judicial case content to train public or
                    third-party models without explicit institutional agreement.
                  </p>
                </section>
              </FadeIn>

              <FadeIn>
                <section id="storage-location" className="scroll-mt-28 mb-14">
                  <div className="flex items-start gap-4 p-6 rounded-2xl bg-emerald-50 border border-emerald-200 mb-6">
                    <MapPin className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900 mb-2">
                        Storage & Location
                      </h2>
                      <p className="text-slate-600 leading-relaxed">
                        Judicial data is stored on locally hosted infrastructure within Pakistan. PostgreSQL
                        databases, application servers, and AI model deployments run on private servers under
                        institutional control — not on foreign cloud platforms that could expose case materials
                        to extraterritorial jurisdiction.
                      </p>
                    </div>
                  </div>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    Backups are encrypted and retained within the same controlled environment. When web search
                    or external APIs are enabled for a feature, only the minimum necessary query context is
                    transmitted — never full case files — and judicial uploads remain on local storage.
                  </p>
                </section>
              </FadeIn>

              <FadeIn>
                <section id="sharing" className="scroll-mt-28 mb-14">
                  <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
                    Sharing
                  </h2>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    We share data only in limited circumstances:
                  </p>
                  <ul className="space-y-3 text-slate-600 text-sm">
                    {[
                      'With your institution when you access JudicialGPT through an organizational deployment, subject to that institution\'s policies.',
                      'With authorized subprocessors (e.g., certificate authorities, WAF providers) who process metadata — not judicial case content — under strict contractual safeguards.',
                      'When required by valid Pakistani law, court order, or regulatory obligation, and only to the extent legally compelled.',
                      'To protect the rights, safety, and integrity of users, the platform, and the judicial system.',
                    ].map((item) => (
                      <li key={item} className="flex gap-3 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              </FadeIn>

              <FadeIn>
                <section id="security" className="scroll-mt-28 mb-14">
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-7 h-7 text-emerald-600" />
                    <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900">
                      Security
                    </h2>
                  </div>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    We apply defense-in-depth controls appropriate for high-sensitivity legal workloads:
                  </p>
                  <ul className="grid sm:grid-cols-2 gap-3">
                    {SECURITY.map((point) => (
                      <li
                        key={point}
                        className="flex gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-600 leading-relaxed"
                      >
                        <span className="text-emerald-500 font-bold shrink-0">✓</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </section>
              </FadeIn>

              <FadeIn>
                <section id="retention" className="scroll-mt-28 mb-14">
                  <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
                    Retention
                  </h2>
                  <p className="text-slate-600 leading-relaxed mb-4">
                    We retain account and usage data for as long as your account is active or as needed to
                    provide services. Uploaded case files and query history may be retained according to your
                    institution&apos;s deployment settings — typically for the duration of the judicial workflow
                    plus a configurable audit period.
                  </p>
                  <p className="text-slate-600 leading-relaxed">
                    Security logs and backup snapshots are retained on a rolling schedule for incident response
                    and disaster recovery, then securely deleted or anonymized. You may request deletion of
                    personal account data subject to legal and institutional retention obligations.
                  </p>
                </section>
              </FadeIn>

              <FadeIn>
                <section id="your-rights" className="scroll-mt-28 mb-14">
                  <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
                    Your Rights
                  </h2>
                  <p className="text-slate-600 leading-relaxed mb-4">Depending on your jurisdiction and institutional agreement, you may have the right to:</p>
                  <ul className="space-y-3 text-slate-600 text-sm">
                    {[
                      'Access a copy of personal data we hold about you.',
                      'Correct inaccurate account information.',
                      'Request deletion of data not subject to legal or judicial retention requirements.',
                      'Object to or restrict certain processing where applicable.',
                      'Export your data in a portable format where technically feasible.',
                    ].map((item) => (
                      <li key={item} className="flex gap-3 leading-relaxed">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              </FadeIn>

              <FadeIn>
                <section id="contact" className="scroll-mt-28">
                  <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
                    Contact
                  </h2>
                  <p className="text-slate-600 leading-relaxed mb-6">
                    For privacy questions, data access requests, or security concerns, contact us at:
                  </p>
                  <a
                    href={`mailto:${SITE.email}`}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold hover:bg-emerald-100 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {SITE.email}
                  </a>
                  <p className="mt-6 text-sm text-slate-500">
                    See also our{' '}
                    <Link href="/terms" className="text-emerald-600 hover:underline">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/cookies" className="text-emerald-600 hover:underline">
                      Cookie Policy
                    </Link>
                    .
                  </p>
                </section>
              </FadeIn>
            </article>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
