'use client';

import Link from 'next/link';
import {
  Users, MessageSquare, Calendar, Lightbulb, Scale, GraduationCap,
  Briefcase, ArrowRight, Heart, Shield, TrendingUp,
} from 'lucide-react';
import { FadeIn, PageCTA, PageHero, SiteShell } from '@/components/site/SiteShell';
import { IMPACT, SITE } from '@/lib/site-content';

const AUDIENCES = [
  {
    icon: Scale,
    title: 'Judges',
    description: 'Research, drafting support, and multilingual evidence handling — with independence preserved.',
    href: '/features',
  },
  {
    icon: Briefcase,
    title: 'Lawyers',
    description: 'Faster precedent discovery, case analysis, and bilingual Q&A for client matters.',
    href: '/ai-tools',
  },
  {
    icon: GraduationCap,
    title: 'Law Students',
    description: 'Learn citation-aware research, statutory interpretation, and professional AI literacy.',
    href: '/docs',
  },
] as const;

const CHANNELS = [
  {
    icon: MessageSquare,
    title: 'Discussions',
    description: 'Share workflows, research tips, and bilingual legal intelligence practices with peers across Punjab and beyond.',
    tag: 'Active',
  },
  {
    icon: Lightbulb,
    title: 'Product Feedback',
    description: 'Report accuracy issues, suggest features, and participate in RLHF-style corrections that shape weekly releases.',
    tag: 'PJA Pilot',
  },
  {
    icon: Calendar,
    title: 'Events & Trainings',
    description: 'Punjab Judicial Academy sessions, webinars on judgment drafting, and security briefings for institutional admins.',
    tag: 'Monthly',
  },
] as const;

const GUIDELINES = [
  'Respect judicial independence — AI assists; humans decide.',
  'Do not share identifiable case details or client-confidential material in public channels.',
  'Verify AI outputs and cite primary sources before applying advice in proceedings.',
  'Report security concerns privately to the team rather than in open discussions.',
  'Be constructive: feedback from 200+ PJA judges has directly improved the product.',
] as const;

export default function CommunityPage() {
  const judgeStat = SITE.stats.find((s) => s.label.includes('Judges'));

  return (
    <SiteShell>
      <PageHero
        eyebrow="Support · Community"
        title="A community for"
        highlight="legal professionals"
        description="Judges, lawyers, and law students shaping the future of AI in Pakistan's judiciary — grounded in local hosting, professional ethics, and real courtroom feedback."
        crumbs={[{ label: 'Support', href: '/community' }, { label: 'Community' }]}
      >
        <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-white border border-[#00a859]/25 shadow-sm">
          <Heart className="w-4 h-4 text-[#00a859]" />
          <span className="text-sm font-semibold text-slate-700">
            {judgeStat?.value} {judgeStat?.label}
          </span>
        </div>
      </PageHero>

      {/* PJA Pilot highlight */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <FadeIn>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-4 bg-[#00a859]/10 text-[#00a859] border border-[#00a859]/25">
                PJA Pilot Program
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-4">
                Built with {judgeStat?.value} judges in Punjab Judicial Academy trainings
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed mb-6">
                JudicialGPT launched in PJA with weekly testing cycles. Judges provide real-world feedback on
                research speed, drafting quality, OCR accuracy, and bilingual support — driving continuous
                refinement of every release.
              </p>
              <Link
                href="/blog/pja-pilot-feedback"
                className="inline-flex items-center gap-2 text-[#00a859] font-bold hover:underline"
              >
                Read pilot lessons <ArrowRight className="w-4 h-4" />
              </Link>
            </FadeIn>
            <FadeIn delay={0.1}>
              <div className="relative rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00a859] via-[#00a859] to-[#00a859]" />
                <div className="relative p-8 md:p-10 text-white">
                  <TrendingUp className="w-10 h-10 mb-6 opacity-90" />
                  <div className="grid grid-cols-2 gap-6">
                    {SITE.stats.map((stat) => (
                      <div key={stat.label}>
                        <p className="text-3xl md:text-4xl font-extrabold">{stat.value}</p>
                        <p className="text-white/75 text-sm mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section className="py-16 bg-[#F7FAF8] border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="font-heading text-3xl font-semibold text-slate-900 mb-3">Who belongs here</h2>
            <p className="text-slate-500">
              Whether you wear robes, represent clients, or study law — you have a place in this community.
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-5">
            {AUDIENCES.map((aud, i) => {
              const Icon = aud.icon;
              return (
                <FadeIn key={aud.title} delay={i * 0.06}>
                  <Link
                    href={aud.href}
                    className="group block h-full p-6 rounded-2xl border border-slate-200 bg-white hover:border-[#00a859] hover:shadow-xl hover:shadow-[#00a859]/10 transition-all"
                  >
                    <div className="w-12 h-12 rounded-xl bg-[#00a859]/15 flex items-center justify-center mb-4 group-hover:bg-[#00a859] transition-colors">
                      <Icon className="w-5 h-5 text-[#00a859] group-hover:text-white transition-colors" />
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">{aud.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{aud.description}</p>
                  </Link>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Channels */}
      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="mb-10">
            <h2 className="font-heading text-3xl font-semibold text-slate-900 mb-3">Community channels</h2>
            <p className="text-slate-500 max-w-xl">
              Connect, learn, and influence the product roadmap through structured channels.
            </p>
          </FadeIn>
          <div className="grid md:grid-cols-3 gap-5">
            {CHANNELS.map((ch, i) => {
              const Icon = ch.icon;
              return (
                <FadeIn key={ch.title} delay={i * 0.05}>
                  <div className="h-full p-6 rounded-2xl border border-slate-200 bg-[#F7FAF8]">
                    <div className="flex items-start justify-between mb-4">
                      <Icon className="w-6 h-6 text-[#00a859]" />
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-[#00a859]/15 text-[#00a859]">
                        {ch.tag}
                      </span>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-2">{ch.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{ch.description}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Impact + Guidelines */}
      <section className="py-16 lg:py-20 bg-[#00a859]/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12">
          <FadeIn>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-[#00a859]" />
              <h2 className="font-heading text-2xl font-semibold text-slate-900">Impact highlights</h2>
            </div>
            <div className="space-y-6">
              {(
                [
                  ['For Judges', IMPACT.judges],
                  ['For Court Staff', IMPACT.staff],
                  ['For the System', IMPACT.system],
                ] as const
              ).map(([title, items]) => (
                <div key={title} className="p-5 rounded-xl bg-white border border-[#00a859]/15">
                  <h3 className="font-bold text-slate-900 mb-3">{title}</h3>
                  <ul className="space-y-2">
                    {items.slice(0, 2).map((item) => (
                      <li key={item} className="flex gap-2 text-sm text-slate-600">
                        <span className="text-[#00a859] shrink-0">✓</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </FadeIn>

          <FadeIn delay={0.08}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-[#00a859]" />
              <h2 className="font-heading text-2xl font-semibold text-slate-900">Community guidelines</h2>
            </div>
            <ul className="space-y-3 mb-8">
              {GUIDELINES.map((rule) => (
                <li
                  key={rule}
                  className="flex gap-3 p-4 rounded-xl bg-white border border-slate-200 text-sm text-slate-600 leading-relaxed"
                >
                  <span className="w-6 h-6 rounded-full bg-[#00a859]/15 text-[#00a859] text-xs font-bold flex items-center justify-center shrink-0">
                    {GUIDELINES.indexOf(rule) + 1}
                  </span>
                  {rule}
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00a859] text-white font-bold text-sm shadow-md shadow-[#00a859]/25 hover:bg-[#00a859] transition-colors"
              >
                Read the Blog <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:border-[#00a859]/25 transition-colors"
              >
                Contact Us
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <PageCTA
        title="Join the JudicialGPT community"
        description="Whether you're in the PJA pilot or exploring independently — connect with peers building responsible AI for Pakistan's courts."
      />
    </SiteShell>
  );
}
