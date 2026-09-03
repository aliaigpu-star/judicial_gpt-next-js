'use client';

import Link from 'next/link';
import {
  AlertTriangle, Target, Eye, Database, Users, Globe, Mail, ExternalLink,
  Shield, TrendingUp, Check,
} from 'lucide-react';
import { FadeIn, PageCTA, PageHero, SiteShell } from '@/components/site/SiteShell';
import { AIMS, PROBLEM, TEAM, SITE, IMPACT, DATA_SOURCES } from '@/lib/site-content';

export default function AboutPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Company · About"
        title="Making legal help accessible"
        highlight="Accessible to All"
        description="JudicialGPT is an AI-powered legal intelligence platform built in Pakistan — reducing judicial cognitive load while preserving independence, security, and professional judgment."
        crumbs={[{ label: 'Company', href: '/about' }, { label: 'About' }]}
      />

      {/* Problem — staggered timeline layout */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-14">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-4 bg-amber-50 text-amber-800 border border-amber-200">
                <AlertTriangle className="w-3.5 h-3.5" />
                {PROBLEM.title}
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900">
                The bandwidth crisis in Pakistan&apos;s courts
              </h2>
            </div>
            <p className="text-slate-500 text-lg max-w-md lg:text-right">
              {SITE.tagline}. The problem is not lack of competence — it is lack of judicial bandwidth.
            </p>
          </FadeIn>

          <div className="relative">
            <div className="hidden lg:block absolute left-[27px] top-4 bottom-4 w-px bg-gradient-to-b from-emerald-200 via-[#00a859] to-emerald-100" />
            <div className="space-y-6">
              {PROBLEM.points.map((point, i) => (
                <FadeIn key={i} delay={i * 0.06}>
                  <div className="flex gap-5 lg:gap-8 group">
                    <div className="relative shrink-0 w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00a859] to-[#00a859] flex items-center justify-center shadow-lg shadow-[#00a859]/20 group-hover:scale-105 transition-transform">
                      <span className="text-white font-bold text-sm">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="flex-1 pt-2 pb-6 lg:pb-2">
                      <p className="text-slate-600 leading-relaxed text-base md:text-lg">{point}</p>
                    </div>
                  </div>
                </FadeIn>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Aims & Vision — split panel */}
      <section className="py-20 lg:py-24 bg-[#00a859]/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-3">
              Aims &amp; Objective
            </h2>
            <p className="text-[#00a859] font-medium text-lg">{AIMS.objective}</p>
          </FadeIn>

          <div className="grid lg:grid-cols-2 gap-8">
            <FadeIn>
              <div className="h-full rounded-3xl bg-white border border-[#00a859]/15 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-xl bg-[#00a859]/15 flex items-center justify-center">
                    <Target className="w-5 h-5 text-[#00a859]" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold text-slate-900">Core Aims</h3>
                </div>
                <ul className="space-y-4">
                  {AIMS.aims.map((aim) => (
                    <li key={aim} className="flex items-start gap-3">
                      <span className="mt-1 w-5 h-5 rounded-full bg-[#00a859]/15 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-[#00a859]" strokeWidth={3} />
                      </span>
                      <span className="text-slate-600 leading-relaxed">{aim}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>

            <FadeIn delay={0.08}>
              <div className="h-full rounded-3xl bg-gradient-to-br from-[#00a859] to-[#00a859] p-8 text-white shadow-xl shadow-[#00a859]/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center">
                    <Eye className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold">Vision</h3>
                </div>
                <ul className="space-y-4">
                  {AIMS.vision.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#00a859] shrink-0" />
                      <span className="text-white/90 leading-relaxed text-sm md:text-base">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Data Sources — masonry-style cards */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-4 bg-slate-100 text-slate-600 border border-slate-200">
              <Database className="w-3.5 h-3.5" />
              Data Foundation
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-3">
              Grounded in real legal sources
            </h2>
            <p className="text-slate-500 text-lg">
              JudicialGPT is trained and evaluated on curated Pakistani legal corpora — not generic internet text.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {DATA_SOURCES.map((source, i) => (
              <FadeIn key={source.title} delay={i * 0.05}>
                <div
                  className={`h-full p-6 rounded-2xl border transition-all hover:shadow-lg hover:shadow-[#00a859]/5 ${
                    i === 0 || i === 3
                      ? 'bg-[#00a859]/10/60 border-[#00a859]/25 lg:row-span-1'
                      : 'bg-white border-slate-200 hover:border-[#00a859]/25'
                  }`}
                >
                  <h3 className="font-extrabold text-slate-900 mb-2">{source.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{source.detail}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Team — portrait grid */}
      <section className="py-20 lg:py-24 bg-[#F7FAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-2xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-4 bg-[#00a859]/10 text-[#00a859] border border-[#00a859]/25">
              <Users className="w-3.5 h-3.5" />
              Our Team
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-3">
              Built by engineers, validated by judges
            </h2>
            <p className="text-slate-500 text-lg">
              A cross-functional team spanning AI, full-stack engineering, data, and legal domain expertise.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEAM.map((member, i) => (
              <FadeIn key={member.name} delay={i * 0.06}>
                <article className="group h-full rounded-2xl bg-white border border-slate-200 p-6 hover:border-[#00a859]/25 hover:shadow-xl hover:shadow-[#00a859]/8 transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00a859] to-[#00a859] flex items-center justify-center text-white font-bold text-lg mb-4 shadow-md shadow-[#00a859]/25 group-hover:scale-105 transition-transform">
                    {member.name.split(' ').slice(-1)[0]?.[0] ?? member.name[0]}
                  </div>
                  <h3 className="font-extrabold text-slate-900 mb-0.5">{member.name}</h3>
                  <p className="text-[#00a859] text-sm font-semibold mb-3">{member.role}</p>
                  <p className="text-slate-500 text-sm leading-relaxed">{member.bio}</p>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* System Impact + Contact strip */}
      <section className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12">
            <FadeIn className="lg:col-span-3">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 rounded-xl bg-[#00a859]/15 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-[#00a859]" />
                </div>
                <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900">
                  System-wide impact
                </h2>
              </div>
              <ul className="grid sm:grid-cols-2 gap-4">
                {IMPACT.system.map((item) => (
                  <li key={item} className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <Shield className="w-4 h-4 text-[#00a859] mt-0.5 shrink-0" />
                    <span className="text-slate-600 text-sm leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </FadeIn>

            <FadeIn delay={0.1} className="lg:col-span-2">
              <div className="h-full rounded-3xl border border-[#00a859]/25 bg-gradient-to-br from-emerald-50 to-white p-8">
                <h3 className="font-heading text-xl font-semibold text-slate-900 mb-4">Get in touch</h3>
                <div className="space-y-4">
                  <a
                    href={`mailto:${SITE.email}`}
                    className="flex items-center gap-3 text-slate-600 hover:text-[#00a859] transition-colors group"
                  >
                    <Mail className="w-5 h-5 text-[#00a859]" />
                    <span className="text-sm font-medium group-hover:underline">{SITE.email}</span>
                  </a>
                  <a
                    href={SITE.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-slate-600 hover:text-[#00a859] transition-colors group"
                  >
                    <Globe className="w-5 h-5 text-[#00a859]" />
                    <span className="text-sm font-medium group-hover:underline">{SITE.url}</span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                  </a>
                </div>
                <Link
                  href="/contact"
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00a859] text-white text-sm font-bold hover:bg-[#00a859] transition-colors"
                >
                  Contact the team
                </Link>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      <PageCTA
        title="Join us in making legal intelligence accessible"
        description="Whether you are a judge, lawyer, or technologist — JudicialGPT is built to serve Pakistan's judicial ecosystem with privacy, accuracy, and respect for professional independence."
      />
    </SiteShell>
  );
}
