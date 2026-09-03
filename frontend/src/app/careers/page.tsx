'use client';

import Link from 'next/link';
import {
  Briefcase, MapPin, Clock, ArrowRight, Shield, Scale, Languages,
  Heart, Lightbulb, Users, Sparkles,
} from 'lucide-react';
import { FadeIn, PageCTA, PageHero, SiteShell } from '@/components/site/SiteShell';
import { CAREERS } from '@/lib/site-content';

const WHY_JOIN = [
  {
    icon: Shield,
    title: 'Privacy-first AI',
    description:
      'Build systems where judicial data stays in Pakistan — local hosting, private model deployment, and security controls designed with real courtroom stakes in mind.',
  },
  {
    icon: Scale,
    title: 'Judicial impact at scale',
    description:
      'Your work reaches 200+ judges in pilot programs and addresses a 2.26 million case backlog. This is infrastructure for justice, not another consumer chatbot.',
  },
  {
    icon: Languages,
    title: 'Bilingual NLP frontier',
    description:
      'Work on Urdu–English OCR, voice transcription, and legal Q&A at the intersection of NLP research and one of the world\'s most multilingual judiciaries.',
  },
];

const VALUES = [
  {
    icon: Heart,
    title: 'Human in the loop',
    description: 'AI assists; judges decide. We build tools that amplify professional judgment, never override it.',
  },
  {
    icon: Lightbulb,
    title: 'Grounded, not guessed',
    description: 'RAG, citations, and uncertainty flags are engineering requirements — not optional nice-to-haves.',
  },
  {
    icon: Users,
    title: 'Cross-functional by default',
    description: 'Engineers, data analysts, and legal domain experts (including active judiciary members) ship together.',
  },
  {
    icon: Sparkles,
    title: 'Iterate with real users',
    description: 'Weekly feedback from PJA trainings and judicial pilots drives our roadmap — not hypothetical personas.',
  },
];

export default function CareersPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Company · Careers"
        title="Join the mission"
        highlight="to transform legal intelligence"
        description="Help us build privacy-first AI that reduces judicial cognitive load, supports bilingual courts, and keeps sensitive data under institutional control in Pakistan."
        crumbs={[{ label: 'Company', href: '/careers' }, { label: 'Careers' }]}
      />

      {/* Why work here */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-3">
              Why work at JudicialGPT
            </h2>
            <p className="text-slate-500 text-lg">
              We are a small, focused team at KICS in Lahore — building sovereign legal AI for Pakistan&apos;s judiciary.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {WHY_JOIN.map((item, i) => {
              const Icon = item.icon;
              return (
                <FadeIn key={item.title} delay={i * 0.07}>
                  <div className="h-full p-7 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-emerald-50/30 hover:border-[#00a859]/25 hover:shadow-lg hover:shadow-[#00a859]/5 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-[#00a859]/15 flex items-center justify-center mb-5">
                      <Icon className="w-6 h-6 text-[#00a859]" />
                    </div>
                    <h3 className="font-extrabold text-slate-900 text-lg mb-2">{item.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* Job listings — stacked cards with accent rail */}
      <section className="py-20 lg:py-24 bg-[#00a859]/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-4 bg-[#00a859]/15 text-[#00a859] border border-[#00a859]/25">
              <Briefcase className="w-3.5 h-3.5" />
              Open Roles
            </div>
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900">
              Current openings
            </h2>
          </FadeIn>

          <div className="space-y-5">
            {CAREERS.map((job, i) => (
              <FadeIn key={job.title} delay={i * 0.06}>
                <article className="group relative rounded-2xl bg-white border border-slate-200 overflow-hidden hover:border-[#00a859] hover:shadow-xl hover:shadow-[#00a859]/8 transition-all">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[#00a859] to-[#00a859] group-hover:w-1.5 transition-all" />
                  <div className="p-6 md:p-8 pl-7 md:pl-9">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-extrabold text-xl text-slate-900 mb-2">{job.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                            <Clock className="w-3.5 h-3.5" />
                            {job.type}
                          </span>
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                            <MapPin className="w-3.5 h-3.5" />
                            {job.location}
                          </span>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed max-w-2xl">{job.summary}</p>
                      </div>
                      <Link
                        href={`/contact?role=${encodeURIComponent(job.title)}`}
                        className="shrink-0 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#00a859] text-white text-sm font-bold shadow-md shadow-[#00a859]/25 hover:bg-[#00a859] transition-colors"
                      >
                        Apply <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </article>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Culture / values — 2x2 grid with icons */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-3">
              Open culture &amp; values
            </h2>
            <p className="text-slate-500 text-lg">
              We move fast with judicial feedback loops, ship with security baked in, and treat legal accuracy as a team sport.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {VALUES.map((value, i) => {
              const Icon = value.icon;
              return (
                <FadeIn key={value.title} delay={i * 0.06}>
                  <div className="flex gap-4 p-6 rounded-2xl border border-slate-200 hover:bg-[#00a859]/10/40 hover:border-[#00a859]/25 transition-all">
                    <div className="w-10 h-10 rounded-lg bg-[#00a859]/15 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-[#00a859]" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 mb-1">{value.title}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">{value.description}</p>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      <PageCTA
        title="Don't see your role?"
        description="We are always interested in engineers, legal researchers, and designers who care about sovereign AI for justice. Reach out and tell us how you would contribute."
      />
    </SiteShell>
  );
}
