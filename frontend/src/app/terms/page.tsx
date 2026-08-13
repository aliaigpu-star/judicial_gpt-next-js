'use client';

import Link from 'next/link';
import { Scale, AlertTriangle, FileText, Gavel } from 'lucide-react';
import { FadeIn, PageHero, SiteShell } from '@/components/site/SiteShell';
import { SITE } from '@/lib/site-content';

const LAST_UPDATED = 'July 17, 2026';

const CLAUSES = [
  {
    id: 'acceptance',
    icon: FileText,
    title: 'Acceptance',
    content: [
      'By accessing or using JudicialGPT — including our website, application, APIs, and pilot programs — you agree to these Terms of Service and our Privacy Policy.',
      'If you use the platform on behalf of a court, law firm, or institution, you represent that you have authority to bind that organization. Institutional deployments may be subject to additional agreements.',
      'If you do not agree, do not use the service.',
    ],
  },
  {
    id: 'description',
    icon: Scale,
    title: 'Description of Service',
    content: [
      'JudicialGPT provides AI-assisted legal intelligence: research, Q&A, judgment drafting support, OCR, voice input, document summarization, and citation-aware retrieval across bilingual (Urdu and English) legal materials.',
      'Our guiding principle is "AI Assists, Judges Decide." The platform reduces cognitive load and research time; it does not replace professional judgment, judicial independence, or the authority of courts.',
      'Outputs are suggestions and drafts subject to human review. You are responsible for verifying accuracy, applicability, and completeness before relying on any output in legal proceedings.',
    ],
  },
  {
    id: 'accounts',
    icon: Gavel,
    title: 'Accounts',
    content: [
      'You must provide accurate registration information and keep credentials confidential. You are responsible for all activity under your account.',
      'We may suspend or terminate accounts that violate these terms, pose security risks, or misuse judicial or client data.',
      'Role-based access (RLS) may restrict features based on your assigned role (judge, staff, lawyer, student, administrator).',
    ],
  },
  {
    id: 'acceptable-use',
    icon: AlertTriangle,
    title: 'Acceptable Use',
    content: [
      'Use JudicialGPT only for lawful legal research, education, and professional workflows aligned with your role and institutional policies.',
      'Do not upload malware, attempt unauthorized access, scrape the platform, reverse-engineer models, or circumvent security controls.',
      'Do not use the service to generate fraudulent documents, impersonate courts or officials, or automate decisions that require human judicial authority.',
      'Do not submit content you lack rights to process, or material that violates confidentiality obligations without proper authorization.',
    ],
  },
  {
    id: 'ai-disclaimer',
    icon: AlertTriangle,
    title: 'AI Disclaimer',
    highlight: true,
    content: [
      'JudicialGPT is not a lawyer, judge, or court. Nothing on the platform constitutes legal advice, a judicial decision, or a binding determination of any case.',
      'AI outputs may contain errors despite retrieval, citations, and guard rails. Always verify sources, statutes, and precedents independently.',
      'The system is designed to prefer no answer over an incorrect one, but no AI system is infallible. Professional judgment remains entirely with the user.',
      'Use of JudicialGPT does not create an attorney-client or judicial relationship with JudicialGPT or its team.',
    ],
  },
  {
    id: 'intellectual-property',
    icon: FileText,
    title: 'Intellectual Property',
    content: [
      'JudicialGPT, its software, models, branding, and documentation are owned by JudicialGPT and its licensors. You receive a limited, non-exclusive license to use the service as permitted by these terms.',
      'You retain ownership of content you upload. By submitting content, you grant us a license to process it solely to provide and improve the service, subject to our Privacy Policy and institutional agreements.',
      'Public legal materials referenced by the system remain subject to their original copyright and citation requirements.',
    ],
  },
  {
    id: 'liability',
    icon: Scale,
    title: 'Limitation of Liability',
    content: [
      'To the maximum extent permitted by applicable law, JudicialGPT and its team are not liable for indirect, incidental, special, consequential, or punitive damages arising from use of the service.',
      'We do not guarantee uninterrupted availability, error-free outputs, or fitness for a particular legal outcome. The service is provided "as is" with the reliability measures described in our documentation.',
      'Our aggregate liability for any claim relating to the service is limited to the amount you paid us in the twelve months preceding the claim, or PKR 0 for free-tier and pilot access.',
    ],
  },
  {
    id: 'changes',
    icon: FileText,
    title: 'Changes',
    content: [
      'We may update these terms to reflect product changes, legal requirements, or security improvements. We will post the revised terms with an updated date.',
      'Material changes affecting institutional deployments will be communicated through appropriate channels. Continued use after changes take effect constitutes acceptance.',
    ],
  },
  {
    id: 'contact',
    icon: Gavel,
    title: 'Contact',
    content: [
      `Questions about these terms: ${SITE.email}`,
      'For privacy matters, see our Privacy Policy. For cookie practices, see our Cookie Policy.',
    ],
  },
] as const;

export default function TermsPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Legal · Terms"
        title="Terms of Service"
        highlight="AI Assists, Judges Decide"
        description="These terms govern your use of JudicialGPT. They reflect our commitment to professional judgment, local data sovereignty, and responsible AI in the judiciary."
        crumbs={[{ label: 'Legal', href: '/terms' }, { label: 'Terms of Service' }]}
      >
        <p className="text-sm text-slate-500">
          Last updated: <time dateTime="2026-07-17">{LAST_UPDATED}</time>
        </p>
      </PageHero>

      <section className="py-16 lg:py-20 bg-[#F7FAF8]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="mb-12 p-6 rounded-2xl border-2 border-amber-200 bg-amber-50/80">
              <div className="flex gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                <p className="text-amber-900 text-sm leading-relaxed">
                  <strong>Important:</strong> JudicialGPT provides decision support, not legal advice or
                  judicial rulings. Every output must be reviewed by a qualified professional before use in
                  court or client matters.
                </p>
              </div>
            </div>
          </FadeIn>

          <div className="space-y-6">
            {CLAUSES.map((clause, i) => {
              const Icon = clause.icon;
              const isHighlight = 'highlight' in clause && clause.highlight;
              return (
                <FadeIn key={clause.id} delay={i * 0.04}>
                  <article
                    id={clause.id}
                    className={`scroll-mt-28 rounded-2xl border p-6 md:p-8 ${
                      isHighlight
                        ? 'border-[#0c9344] bg-white shadow-lg shadow-[#0c9344]/5 ring-1 ring-emerald-100'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          isHighlight
                            ? 'bg-[#0c9344]/15 text-[#0c9344]'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <h2 className="font-heading text-xl md:text-2xl font-semibold text-slate-900 pt-1.5">
                        {clause.title}
                      </h2>
                    </div>
                    <div className="space-y-3 pl-0 md:pl-[3.75rem]">
                      {clause.content.map((para) => (
                        <p key={para} className="text-slate-600 text-sm md:text-base leading-relaxed">
                          {para.includes(SITE.email) ? (
                            <>
                              Questions about these terms:{' '}
                              <a href={`mailto:${SITE.email}`} className="text-[#0c9344] hover:underline">
                                {SITE.email}
                              </a>
                            </>
                          ) : para.startsWith('For privacy') ? (
                            <>
                              For privacy matters, see our{' '}
                              <Link href="/privacy" className="text-[#0c9344] hover:underline">
                                Privacy Policy
                              </Link>
                              . For cookie practices, see our{' '}
                              <Link href="/cookies" className="text-[#0c9344] hover:underline">
                                Cookie Policy
                              </Link>
                              .
                            </>
                          ) : (
                            para
                          )}
                        </p>
                      ))}
                    </div>
                  </article>
                </FadeIn>
              );
            })}
          </div>

          <FadeIn>
            <p className="mt-12 text-center text-sm text-slate-500">
              Related:{' '}
              <Link href="/privacy" className="text-[#0c9344] hover:underline">
                Privacy Policy
              </Link>{' '}
              ·{' '}
              <Link href="/cookies" className="text-[#0c9344] hover:underline">
                Cookie Policy
              </Link>
            </p>
          </FadeIn>
        </div>
      </section>
    </SiteShell>
  );
}
