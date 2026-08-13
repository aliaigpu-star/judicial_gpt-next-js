'use client';

import Link from 'next/link';
import { Cookie, Settings, BarChart3, ShieldCheck, Mail } from 'lucide-react';
import { FadeIn, PageHero, SiteShell } from '@/components/site/SiteShell';
import { SITE } from '@/lib/site-content';

const LAST_UPDATED = 'July 17, 2026';

const CATEGORIES = [
  {
    icon: ShieldCheck,
    name: 'Essential cookies',
    required: true,
    description:
      'Required for the platform to function. They enable authentication, session management, security tokens, load balancing, and CSRF protection. Without these cookies, you cannot sign in or use core features.',
    examples: ['Session ID', 'Authentication token', 'Security preferences', 'Load balancer affinity'],
  },
  {
    icon: BarChart3,
    name: 'Analytics cookies',
    required: false,
    description:
      'Help us understand how features are used — page views, error rates, and performance metrics — so we can improve reliability for judicial workflows. We use aggregated, privacy-conscious analytics and do not track individual case content.',
    examples: ['Page visit counts', 'Feature usage events', 'Performance timing', 'Error diagnostics'],
  },
  {
    icon: Settings,
    name: 'Preference cookies',
    required: false,
    description:
      'Remember your choices such as language (Urdu/English), theme, sidebar state, and notification settings so you do not have to reconfigure the interface each visit.',
    examples: ['Language preference', 'UI layout', 'Notification opt-in', 'Accessibility settings'],
  },
] as const;

export default function CookiesPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Legal · Cookies"
        title="Cookie Policy"
        highlight="Transparent & minimal"
        description="We use a small set of cookies to keep JudicialGPT secure and usable. This page explains what they are, which categories we use, and how you can control them."
        crumbs={[{ label: 'Legal', href: '/cookies' }, { label: 'Cookie Policy' }]}
      >
        <p className="text-sm text-slate-500">
          Last updated: <time dateTime="2026-07-17">{LAST_UPDATED}</time>
        </p>
      </PageHero>

      <section className="py-16 lg:py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="flex items-start gap-5 p-8 rounded-3xl bg-gradient-to-br from-emerald-50 to-[#0c9344]/5 border border-[#0c9344]/15 mb-14">
              <div className="w-14 h-14 rounded-2xl bg-white border border-[#0c9344]/25 flex items-center justify-center shrink-0 shadow-sm">
                <Cookie className="w-7 h-7 text-[#0c9344]" />
              </div>
              <div>
                <h2 className="font-heading text-2xl font-semibold text-slate-900 mb-3">
                  What are cookies?
                </h2>
                <p className="text-slate-600 leading-relaxed">
                  Cookies are small text files stored on your device when you visit a website. They help
                  websites remember your session, preferences, and security state. JudicialGPT uses cookies
                  sparingly — we prioritize essential and functional cookies over invasive tracking. We do
                  not use cookies to sell data or profile users for advertising.
                </p>
              </div>
            </div>
          </FadeIn>

          <FadeIn>
            <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900 mb-8">
              Cookie categories
            </h2>
          </FadeIn>

          <div className="space-y-6 mb-16">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <FadeIn key={cat.name} delay={i * 0.06}>
                  <div className="rounded-2xl border border-slate-200 overflow-hidden hover:border-[#0c9344]/25 transition-colors">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-50 border-b border-slate-200">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-[#0c9344]" />
                        <h3 className="font-bold text-slate-900">{cat.name}</h3>
                      </div>
                      <span
                        className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${
                          cat.required
                            ? 'bg-[#0c9344]/15 text-[#0c9344]'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {cat.required ? 'Required' : 'Optional'}
                      </span>
                    </div>
                    <div className="p-6">
                      <p className="text-slate-600 text-sm leading-relaxed mb-4">{cat.description}</p>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                        Examples
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {cat.examples.map((ex) => (
                          <span
                            key={ex}
                            className="px-3 py-1 text-xs font-medium rounded-lg bg-[#0c9344]/10 text-[#0c9344] border border-[#0c9344]/15"
                          >
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </FadeIn>
              );
            })}
          </div>

          <FadeIn>
            <section className="mb-14">
              <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900 mb-4">
                How to control cookies
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  {
                    title: 'Browser settings',
                    body: 'Most browsers let you block or delete cookies. Note that blocking essential cookies will prevent sign-in and core platform features.',
                  },
                  {
                    title: 'In-app preferences',
                    body: 'Where available, you can opt out of non-essential analytics and adjust preference cookies from your account settings.',
                  },
                  {
                    title: 'Institutional deployments',
                    body: 'Courts and firms deploying JudicialGPT may configure cookie policies through their administrator console.',
                  },
                  {
                    title: 'Do Not Track',
                    body: 'We honor reasonable privacy signals and do not use optional cookies for cross-site advertising tracking.',
                  },
                ].map((item) => (
                  <div key={item.title} className="p-5 rounded-xl border border-slate-200 bg-[#F7FAF8]">
                    <h3 className="font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>
          </FadeIn>

          <FadeIn>
            <section className="p-8 rounded-2xl border border-[#0c9344]/25 bg-[#0c9344]/10/50 text-center">
              <Mail className="w-8 h-8 text-[#0c9344] mx-auto mb-4" />
              <h2 className="font-heading text-xl font-semibold text-slate-900 mb-2">Contact</h2>
              <p className="text-slate-600 text-sm mb-4">
                Questions about our use of cookies? Reach us at{' '}
                <a href={`mailto:${SITE.email}`} className="text-[#0c9344] font-semibold hover:underline">
                  {SITE.email}
                </a>
              </p>
              <Link
                href="/privacy"
                className="text-sm text-[#0c9344] hover:underline font-medium"
              >
                Read our Privacy Policy →
              </Link>
            </section>
          </FadeIn>
        </div>
      </section>
    </SiteShell>
  );
}
