'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Check,
  Code2,
  Cpu,
  Database,
  Globe,
  Key,
  Layers,
  Lock,
  Server,
  Shield,
  Users,
  Zap,
} from 'lucide-react';
import { FadeIn, PageCTA, PageHero, SiteShell } from '@/components/site/SiteShell';
import { SECURITY, SITE, TECH_STACK } from '@/lib/site-content';

const SECURITY_HIGHLIGHTS = SECURITY.slice(0, 8);

const ENTERPRISE_FEATURES = [
  {
    icon: Key,
    title: 'API Access',
    description: 'RESTful endpoints for legal research, case analysis, and document processing — integrate JudicialGPT into your existing systems.',
  },
  {
    icon: Layers,
    title: 'White-Label Options',
    description: 'Deploy under your institution\'s branding with custom domains, logos, and themed interfaces for law firms and courts.',
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Shared workspaces, role-based permissions, and collaborative research sessions for legal teams and registry staff.',
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Usage dashboards, query insights, and performance metrics to understand adoption and optimize workflows.',
  },
  {
    icon: Shield,
    title: 'SLA Guarantee',
    description: 'Enterprise-grade uptime commitments, priority incident response, and dedicated support channels.',
  },
  {
    icon: Cpu,
    title: 'Custom AI Training',
    description: 'Fine-tune models on your jurisdiction\'s corpus with dedicated account management and onboarding.',
  },
];

const SAMPLE_REQUEST = `POST /api/v1/research/query
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json

{
  "query": "What precedents apply to bail under Section 497 CrPC?",
  "language": "en",
  "jurisdiction": "PK",
  "include_citations": true,
  "max_results": 10
}`;

const SAMPLE_RESPONSE = `{
  "status": "success",
  "results": [
    {
      "title": "Muhammad Aslam v. State (2024 SCMR 112)",
      "relevance": 0.94,
      "summary": "Supreme Court clarified bail discretion under Section 497...",
      "citations": ["2024 SCMR 112", "PLD 2023 SC 45"]
    }
  ],
  "confidence": 0.91,
  "sources_cited": 3
}`;

export default function APIPlatformPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Platform · API & Enterprise"
        title="Integrate legal intelligence"
        highlight="into your infrastructure"
        description="Connect JudicialGPT to your case management systems, internal portals, and legal workflows. Enterprise plans include full API access, white-label deployment, and SLA-backed support."
        crumbs={[{ label: 'Platform', href: '/api-platform' }, { label: 'API' }]}
      >
        <div className="flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0c9344] text-white font-bold shadow-md shadow-[#0c9344]/25 hover:bg-[#0c9344] transition-colors"
          >
            Contact Sales <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:border-[#0c9344]/25 hover:bg-[#0c9344]/10/50 transition-colors"
          >
            Get Started
          </Link>
        </div>
      </PageHero>

      {/* Tech stack */}
      <section className="py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="max-w-2xl mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-3">
              Production-ready architecture
            </h2>
            <p className="text-slate-500 text-lg">
              {SITE.name} runs on a modern, privacy-first stack — locally hosted databases, private model deployment, and retrieval-augmented generation with guard rails.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
            {[
              { icon: Globe, label: 'Frontend', value: TECH_STACK.frontend },
              { icon: Server, label: 'Backend', value: TECH_STACK.backend },
              { icon: Database, label: 'Database', value: TECH_STACK.database },
              { icon: Cpu, label: 'AI Models', value: `${TECH_STACK.models.length} integrated models` },
            ].map((item, i) => (
              <FadeIn key={item.label} delay={i * 0.05}>
                <div className="h-full p-6 rounded-2xl border border-slate-200 bg-[#F7FAF8] hover:border-[#0c9344]/25 transition-colors">
                  <div className="w-11 h-11 rounded-xl bg-[#0c9344]/15 flex items-center justify-center mb-4">
                    <item.icon className="w-5 h-5 text-[#0c9344]" />
                  </div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#0c9344] mb-2">
                    {item.label}
                  </p>
                  <p className="text-slate-700 text-sm leading-relaxed">{item.value}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.15}>
            <div className="rounded-2xl border border-[#0c9344]/15 bg-[#0c9344]/5 p-6 md:p-8">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#0c9344] mb-4">
                Model & integration layer
              </p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TECH_STACK.models.map((model) => (
                  <div
                    key={model}
                    className="flex items-start gap-2.5 text-sm text-slate-600 bg-white rounded-xl px-4 py-3 border border-[#0c9344]/15/80"
                  >
                    <Zap className="w-4 h-4 text-[#0c9344] shrink-0 mt-0.5" />
                    {model}
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Code example */}
      <section className="py-20 lg:py-24 bg-[#F7FAF8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <FadeIn>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-4 bg-[#0c9344]/10 text-[#0c9344] border border-[#0c9344]/25">
                <Code2 className="w-3 h-3" /> API Reference
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-4">
                Query legal research programmatically
              </h2>
              <p className="text-slate-500 text-lg mb-6 leading-relaxed">
                Send structured queries and receive citation-backed results. The Enterprise plan includes full API access with authentication, rate limits tailored to your organization, and dedicated integration support.
              </p>
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#0c9344]/10 border border-[#0c9344]/25 text-sm text-[#0c9344]">
                <Lock className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  <span className="font-semibold">Enterprise plan required.</span> API keys are issued after onboarding — judicial data never leaves your approved infrastructure.
                </p>
              </div>
            </FadeIn>

            <FadeIn delay={0.1}>
              <div className="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
                <div className="flex items-center gap-2 px-4 py-3 bg-slate-900 border-b border-slate-800">
                  <span className="w-3 h-3 rounded-full bg-red-400/80" />
                  <span className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <span className="w-3 h-3 rounded-full bg-[#0c9344]/80" />
                  <span className="ml-2 text-xs text-slate-400 font-mono">legal-research.sh</span>
                </div>
                <div className="p-5 overflow-x-auto">
                  <pre className="text-[13px] leading-relaxed font-mono">
                    <code>
                      <span className="text-[#0c9344]">{SAMPLE_REQUEST}</span>
                      {'\n\n'}
                      <span className="text-slate-500"># Response</span>
                      {'\n'}
                      <span className="text-sky-300">{SAMPLE_RESPONSE}</span>
                    </code>
                  </pre>
                </div>
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12">
            <FadeIn className="lg:col-span-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-4 bg-[#0c9344]/10 text-[#0c9344] border border-[#0c9344]/25">
                Security
              </div>
              <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-4">
                Enterprise-grade controls
              </h2>
              <p className="text-slate-500 text-lg">
                Every API call is protected by the same security posture that safeguards judicial workflows — encryption, WAF, local hosting, and zero foreign data transfer.
              </p>
            </FadeIn>
            <FadeIn delay={0.08} className="lg:col-span-3">
              <ul className="grid sm:grid-cols-2 gap-4">
                {SECURITY_HIGHLIGHTS.map((item, i) => (
                  <li
                    key={item}
                    className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:border-[#0c9344]/25 hover:bg-[#0c9344]/10/30 transition-colors"
                  >
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-[#0c9344]/15 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-[#0c9344]" strokeWidth={3} />
                    </span>
                    <span className="text-sm text-slate-600 leading-relaxed">{item}</span>
                  </li>
                ))}
              </ul>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Enterprise features */}
      <section className="py-20 lg:py-24 bg-[#0c9344]/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="font-heading text-3xl md:text-4xl font-semibold text-slate-900 mb-3">
              Enterprise plan capabilities
            </h2>
            <p className="text-slate-500 text-lg">
              Built for law firms, courts, and organizations that need API integration, team workflows, and institutional-grade support.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {ENTERPRISE_FEATURES.map((feat, i) => (
              <FadeIn key={feat.title} delay={i * 0.05}>
                <div className="h-full p-6 rounded-2xl bg-white border border-[#0c9344]/15/80 hover:shadow-lg hover:shadow-[#0c9344]/5 hover:border-[#0c9344]/25 transition-all duration-300">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#0c9344] to-[#0c9344] flex items-center justify-center mb-4 shadow-md shadow-[#0c9344]/20">
                    <feat.icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-900 mb-2">{feat.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{feat.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={0.2} className="mt-12 text-center">
            <div className="inline-flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#0c9344] text-white font-bold shadow-md shadow-[#0c9344]/25 hover:bg-[#0c9344] transition-colors"
              >
                Request Enterprise Demo <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:border-[#0c9344]/25 transition-colors"
              >
                Create Account
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <PageCTA
        title="Ready to integrate JudicialGPT?"
        description="Talk to our team about Enterprise API access, white-label deployment, and custom integrations for your organization."
      />
    </SiteShell>
  );
}
