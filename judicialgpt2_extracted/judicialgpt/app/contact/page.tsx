'use client';

import { useState, useEffect, FormEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Mail, Globe, MapPin, Send, CheckCircle2, Building2, User, MessageSquare,
  ExternalLink,
} from 'lucide-react';
import { FadeIn, PageHero, SiteShell } from '@/components/site/SiteShell';
import { SITE } from '@/lib/site-content';

const TOPICS = [
  'General Inquiry',
  'Product Demo',
  'Partnership',
  'PJA / Judicial Pilot',
  'Careers',
  'Technical Support',
  'Media & Press',
];

function ContactForm() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role');

  const [form, setForm] = useState({
    name: '',
    email: '',
    organization: '',
    topic: roleParam ? 'Careers' : 'General Inquiry',
    message: roleParam ? `I am interested in applying for the role: ${roleParam}.\n\n` : '',
  });
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (roleParam) {
      setForm((prev) => ({
        ...prev,
        topic: 'Careers',
        message: prev.message || `I am interested in applying for the role: ${roleParam}.\n\n`,
      }));
    }
  }, [roleParam]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  function handleChange(field: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  if (submitted) {
    return (
      <FadeIn>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10 text-center">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h3 className="font-heading text-2xl font-semibold text-slate-900 mb-2">
            Message received
          </h3>
          <p className="text-slate-600 mb-6 max-w-sm mx-auto">
            Thank you, {form.name || 'there'}. We will respond to{' '}
            <span className="font-semibold text-emerald-700">{form.email}</span> within two business days.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setForm({ name: '', email: '', organization: '', topic: 'General Inquiry', message: '' });
            }}
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Send another message
          </button>
        </div>
      </FadeIn>
    );
  }

  return (
    <FadeIn>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="Your name"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="organization" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Organization
          </label>
          <div className="relative">
            <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="organization"
              type="text"
              value={form.organization}
              onChange={(e) => handleChange('organization', e.target.value)}
              placeholder="Court, firm, university, or company"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all"
            />
          </div>
        </div>

        <div>
          <label htmlFor="topic" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Topic
          </label>
          <select
            id="topic"
            required
            value={form.topic}
            onChange={(e) => handleChange('topic', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all appearance-none cursor-pointer"
          >
            {TOPICS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="message" className="block text-sm font-semibold text-slate-700 mb-1.5">
            Message
          </label>
          <div className="relative">
            <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <textarea
              id="message"
              required
              rows={5}
              value={form.message}
              onChange={(e) => handleChange('message', e.target.value)}
              placeholder="How can we help?"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 transition-all resize-y min-h-[140px]"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-emerald-500 text-white font-bold shadow-md shadow-emerald-500/25 hover:bg-emerald-600 transition-colors"
        >
          Send message <Send className="w-4 h-4" />
        </button>
      </form>
    </FadeIn>
  );
}

export default function ContactPage() {
  return (
    <SiteShell>
      <PageHero
        eyebrow="Support · Contact"
        title="Get in touch"
        highlight="with our team"
        description="Questions about JudicialGPT, pilot partnerships, careers, or technical support — we respond to every message from judges, institutions, and collaborators."
        crumbs={[{ label: 'Support', href: '/contact' }, { label: 'Contact' }]}
      />

      <section className="py-16 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16">
            {/* Left — contact info */}
            <FadeIn className="lg:col-span-2">
              <div className="sticky top-28 space-y-8">
                <div>
                  <p className="text-emerald-600 font-bold text-sm uppercase tracking-wider mb-2">
                    {SITE.tagline}
                  </p>
                  <h2 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900 mb-6">
                    Let&apos;s start a conversation
                  </h2>
                </div>

                <div className="space-y-5">
                  <a
                    href={`mailto:${SITE.email}`}
                    className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/40 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">Email</p>
                      <p className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                        {SITE.email}
                      </p>
                    </div>
                  </a>

                  <a
                    href={SITE.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/40 transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                      <Globe className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-0.5">Website</p>
                      <p className="font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors inline-flex items-center gap-1">
                        {SITE.url}
                        <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                      </p>
                    </div>
                  </a>
                </div>

                {/* Map — KICS, UET Lahore */}
                <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                  <a
                    href="https://www.google.com/maps/search/KICS+UET+Lahore/@31.5878,74.3642,17z"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open KICS location in Google Maps"
                    className="block relative h-48 group"
                  >
                    <iframe
                      title="KICS — Khawarizmi Institute of Computer Science, UET Lahore"
                      src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3401.5!2d74.3642!3d31.5878!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x391904cfc42e34bd%3A0x6f8e4c8a5a3bbf2c!2sKhawarizmi%20Institute%20of%20Computer%20Science%20(KICS)%2C%20UET%20Lahore!5e0!3m2!1sen!2spk!4v1700000000000!5m2!1sen!2spk"
                      className="w-full h-full border-0"
                      allowFullScreen={false}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    {/* Hover overlay — "Open in Maps" hint */}
                    <div className="absolute inset-0 bg-emerald-900/0 group-hover:bg-emerald-900/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                      <span className="px-3 py-1.5 rounded-full bg-white/90 text-xs font-semibold text-emerald-700 shadow">
                        Open in Google Maps ↗
                      </span>
                    </div>
                  </a>
                  <div className="p-5 bg-white">
                    <a
                      href="https://www.google.com/maps/search/KICS+UET+Lahore/@31.5878,74.3642,17z"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-1.5 font-extrabold text-slate-900 hover:text-emerald-600 transition-colors mb-1"
                    >
                      <MapPin className="w-4 h-4 shrink-0 text-emerald-500" />
                      Lahore · KICS
                    </a>
                    <p className="text-slate-500 text-sm leading-relaxed">
                      JudicialGPT is developed at the{' '}
                      <span className="font-semibold text-slate-700">Khawarizmi Institute of Computer Science (KICS)</span>,
                      University of Engineering and Technology, Lahore — in collaboration with judicial partners
                      across Punjab.
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>

            {/* Right — form */}
            <div className="lg:col-span-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 md:p-10">
                <h3 className="font-heading text-xl font-semibold text-slate-900 mb-6">
                  Send us a message
                </h3>
                <Suspense fallback={<div className="text-slate-400 text-sm py-8">Loading form…</div>}>
                  <ContactForm />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}
