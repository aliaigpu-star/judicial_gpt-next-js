'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Shield,
  Search,
  ChevronRight,
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  Mail,
  Lock,
  Server,
  Trash2,
  FileText,
  UserCheck,
  Cpu,
  Eye,
  Cookie,
  Smartphone,
  Globe,
  HelpCircle,
  Scale,
  CreditCard,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { SiteShell } from '@/components/site/SiteShell';

const SECTIONS = [
  { id: 'section-1', number: '1', title: 'Who Can Use JudicialGPT', icon: UserCheck },
  { id: 'section-2', number: '2', title: 'Information We Collect', icon: FileText },
  { id: 'section-3', number: '3', title: 'How We Use Information', icon: Sparkles },
  { id: 'section-4', number: '4', title: 'AI Processing and Model Training', icon: Cpu },
  { id: 'section-5', number: '5', title: 'Access to Your Information', icon: Eye },
  { id: 'section-6', number: '6', title: 'Cookies, Local Storage, and Similar Technologies', icon: Cookie },
  { id: 'section-7', number: '7', title: 'Mobile App Permissions', icon: Smartphone },
  { id: 'section-8', number: '8', title: 'Hosting, Storage, and International Transfers', icon: Globe },
  { id: 'section-9', number: '9', title: 'Retention and Deletion', icon: Trash2 },
  { id: 'section-10', number: '10', title: 'Security', icon: Lock },
  { id: 'section-11', number: '11', title: 'Your Choices and Requests', icon: HelpCircle },
  { id: 'section-12', number: '12', title: 'Legal Information and Confidentiality', icon: Scale },
  { id: 'section-13', number: '13', title: 'Payments and Advertising', icon: CreditCard },
  { id: 'section-14', number: '14', title: 'Changes to This Policy', icon: RefreshCw },
  { id: 'section-15', number: '15', title: 'Contact', icon: Mail },
];

export default function PrivacyPage() {
  const [activeId, setActiveId] = useState<string>('section-1');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Scrollspy & progress listener
  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      const currentScroll = window.scrollY;
      if (totalScroll > 0) {
        setScrollProgress((currentScroll / totalScroll) * 100);
      }
      setShowBackToTop(currentScroll > 400);

      // Scrollspy
      const sectionElements = SECTIONS.map(s => document.getElementById(s.id)).filter(Boolean);
      const scrollPosition = window.scrollY + 220;

      for (let i = sectionElements.length - 1; i >= 0; i--) {
        const el = sectionElements[i];
        if (el && el.offsetTop <= scrollPosition) {
          setActiveId(el.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCopyLink = (id: string) => {
    if (typeof window !== 'undefined') {
      const url = `${window.location.origin}/privacy#${id}`;
      navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };


  const scrollToTop = () => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Filter sections by search query
  const matchingSectionIds = useMemo(() => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();
    const matched = new Set<string>();

    SECTIONS.forEach(s => {
      if (s.title.toLowerCase().includes(query)) {
        matched.add(s.id);
      }
    });

    return matched;
  }, [searchQuery]);

  return (
    <SiteShell>
      {/* Scroll Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-transparent z-[10000]">
        <div
          className="h-full bg-gradient-to-r from-[#00a859] via-emerald-400 to-[#00a859] transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Hero Header */}
      <section className="relative pt-6 sm:pt-8 pb-8 sm:pb-10 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
        {/* Background Ambient Glows */}
        <div className="absolute top-1/4 right-1/4 w-[450px] h-[450px] rounded-full bg-[#00a859]/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-[350px] h-[350px] rounded-full bg-emerald-600/15 blur-[100px] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(#00a859_1px,transparent_1px)] [background-size:24px_24px] opacity-10 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Title & Effective Date */}
          <div className="max-w-4xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-3 sm:mb-4">
              Privacy Policy for <span className="text-[#00a859]">Judicial GPT</span>
            </h1>
            <p className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-800/70 border border-slate-700/60 text-xs sm:text-sm text-slate-300 font-medium mb-4 sm:mb-5">
              <span>📅 Effective date:</span>
              <strong className="text-white">October 15, 2026</strong>
            </p>

            <div className="space-y-3 text-slate-300 text-sm sm:text-base leading-relaxed border-l-2 border-[#00a859] pl-4 bg-white/5 py-3 rounded-r-xl">
              <p>
                This Privacy Policy explains how information is collected, used, stored, and protected when you use the Judicial GPT website{' '}
                <a
                  href="https://judicialgpt.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline font-medium inline-flex items-center gap-1"
                >
                  https://judicialgpt.org <ExternalLink className="w-3 h-3" />
                </a>{' '}
                and the Judicial GPT mobile app for Android (together, the &ldquo;Service&rdquo;). It also describes your rights and choices regarding the information you provide while using the service.
              </p>
              <p className="font-medium text-emerald-300">
                Judicial GPT serves judges, court clerks, lawyers, and the general public in Pakistan.
              </p>
              <p className="text-xs sm:text-sm text-slate-400 flex items-center gap-2">
                <Mail className="w-4 h-4 text-emerald-400" />
                <span>Contact:</span>
                <a
                  href="mailto:support.judicialgpt@gmail.com"
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  support.judicialgpt@gmail.com
                </a>
              </p>
            </div>
          </div>

          {/* Key Assurance Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 sm:mt-8 sm:pt-6 border-t border-slate-800">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-emerald-500/40 transition-colors">
              <Shield className="w-5 h-5 text-emerald-400 mb-2" />
              <h4 className="text-xs sm:text-sm font-semibold text-white">Zero AI Training</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">We do not use conversations or files to train models.</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-emerald-500/40 transition-colors">
              <Server className="w-5 h-5 text-emerald-400 mb-2" />
              <h4 className="text-xs sm:text-sm font-semibold text-white">Hosted in Pakistan</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Primary application servers reside in Pakistan.</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-emerald-500/40 transition-colors">
              <Trash2 className="w-5 h-5 text-emerald-400 mb-2" />
              <h4 className="text-xs sm:text-sm font-semibold text-white">30-Day Deletion</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Verified account &amp; data deletion within 30 days.</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-emerald-500/40 transition-colors">
              <Lock className="w-5 h-5 text-emerald-400 mb-2" />
              <h4 className="text-xs sm:text-sm font-semibold text-white">No Ads / No Sale</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">We never sell personal data or run advertising trackers.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="py-8 sm:py-10 lg:py-12 bg-[#F8FAF9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-10 xl:gap-14 items-start">
            
            {/* Sticky Sidebar Navigation */}
            <aside className="hidden lg:block sticky top-6 max-h-[calc(100vh-48px)] overflow-y-auto pr-2">
              {/* Search within policy */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search policy sections..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#00a859]/30 focus:border-[#00a859] transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Table of Contents */}
              <nav aria-label="Table of contents" className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    All Sections (15)
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    DOCX V-2
                  </span>
                </div>
                <ul className="space-y-1 text-xs">
                  {SECTIONS.map((section) => {
                    const isMatched = matchingSectionIds ? matchingSectionIds.has(section.id) : true;
                    const isActive = activeId === section.id;
                    return (
                      <li key={section.id}>
                        <a
                          href={`#${section.id}`}
                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg transition-all ${
                            isActive
                              ? 'bg-emerald-50 text-[#00a859] font-bold border border-emerald-200 shadow-2xs'
                              : isMatched
                              ? 'text-slate-700 hover:text-[#00a859] hover:bg-slate-50'
                              : 'text-slate-400 opacity-50'
                          }`}
                        >
                          <span className="truncate pr-2">
                            <span className="font-mono text-[11px] text-slate-400 mr-1.5">{section.number}.</span>
                            {section.title}
                          </span>
                          <ChevronRight
                            className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                              isActive ? 'text-[#00a859] translate-x-0.5' : 'text-slate-300 opacity-0 group-hover:opacity-100'
                            }`}
                          />
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </nav>

              {/* Quick Contact Card in Sidebar */}
              <div className="mt-4 p-4 bg-emerald-950 text-white rounded-2xl border border-emerald-800/40">
                <p className="text-xs font-semibold text-emerald-300 mb-1">Need Clarification?</p>
                <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                  Have questions about your data privacy or rights under this policy?
                </p>
                <a
                  href="mailto:support.judicialgpt@gmail.com"
                  className="inline-flex items-center justify-center w-full gap-1.5 px-3 py-2 rounded-lg bg-[#00a859] hover:bg-emerald-600 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email Support
                </a>
              </div>
            </aside>

            {/* Main Policy Content (15 Sections Verbatim) */}
            <main className="space-y-8">
              
              {/* Mobile Search Bar */}
              <div className="lg:hidden bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search policy sections..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 outline-none focus:ring-2 focus:ring-[#00a859]"
                  />
                </div>
              </div>

              {/* ============================================================== */}
              {/* SECTION 1 */}
              {/* ============================================================== */}
              <article
                id="section-1"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      1
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      1. Who Can Use JudicialGPT
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-1')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-1' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    Judicial GPT is intended for people aged 18 and above. We do not knowingly collect personal information from people under 18. If we learn that someone under 18 has created an account, we will delete the account and its associated data.
                  </p>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 2 */}
              {/* ============================================================== */}
              <article
                id="section-2"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      2
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      2. Information We Collect
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-2')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-2' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <strong className="text-slate-900 block mb-1">Account information:</strong>
                    <p>
                      We collect your email address, name, and the information necessary to create and authenticate your account. You can sign in using email or Google. If you use Google sign-in, we receive the account information Google shares through that process, according to the permissions presented to you. You may also add a profile picture.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <strong className="text-slate-900 block mb-1">Questions and conversations:</strong>
                    <p>
                      We collect the questions you submit and the conversations you have with Judicial GPT to provide responses and maintain your chat history.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <strong className="text-slate-900 block mb-1">Uploaded files, photos, and images:</strong>
                    <p>
                      We collect files and images you upload or attach (for example, documents, or photos chosen from your gallery or taken with your camera) so that the Service can process them for your requests. These may contain personal or confidential information about you or other people.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <strong className="text-slate-900 block mb-1">Voice recordings:</strong>
                    <p>
                      If you use voice input, the app records audio from your microphone only while you are recording, and sends it to our servers to be converted to text. If you use the read-aloud feature, the text of the response is sent to generate speech. We do not record audio in the background.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <strong className="text-slate-900 block mb-1">Feedback:</strong>
                    <p>
                      We collect ratings you give to responses and any feedback comments you submit.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <strong className="text-slate-900 block mb-1">Support communications:</strong>
                    <p>
                      We collect messages and information you provide when you contact us.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <strong className="text-slate-900 block mb-1">Technical and usage information:</strong>
                    <p>
                      We collect IP addresses for security purposes, device information, usage logs, session data, and error logs.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                    <strong className="text-slate-900 block mb-1">Security checks:</strong>
                    <p>
                      Our sign-in and sign-up forms use Cloudflare Turnstile to detect bots. Turnstile may process technical signals from your device, subject to Cloudflare’s own privacy policy.
                    </p>
                  </div>

                  <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs sm:text-sm font-medium">
                    ⚠️ Only submit information about other people when you are authorized to share it. Avoid including personal or confidential information that is unnecessary for your request.
                  </div>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 3 */}
              {/* ============================================================== */}
              <article
                id="section-3"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      3
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      3. How We Use Information
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-3')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-3' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-slate-700 text-sm sm:text-base leading-relaxed space-y-3">
                  <p className="font-semibold text-slate-900">We use information to:</p>
                  <ul className="space-y-2 list-none pl-0">
                    {[
                      'Create and manage accounts and authenticate users.',
                      'Process questions, images, voice input, and uploaded files and generate AI responses.',
                      'Maintain conversation history.',
                      'Respond to support requests and investigate technical problems.',
                      'Protect the Service and prevent unauthorized access and abuse.',
                      'Improve our AI model using user feedback.',
                      'Meet applicable legal obligations.',
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#00a859] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                          ✓
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pt-3 border-t border-slate-100 font-semibold text-emerald-800 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
                    🛡️ We do not sell your personal information, and we do not use it for advertising.
                  </div>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 4 */}
              {/* ============================================================== */}
              <article
                id="section-4"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      4
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      4. AI Processing and Model Training
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-4')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-4' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-3.5 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    To generate responses, your questions, conversations, attached images, and uploaded file content are processed by AI models. Depending on the feature and how the Service is configured, this processing may be done by our own servers or by third-party AI service providers acting on our behalf, including Google (Gemini) and Groq. Where a third-party AI provider is used, the relevant content is sent to that provider only to generate your response, and the provider’s own terms and privacy policy apply to its handling of that data.
                  </p>
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl font-medium text-emerald-900">
                    We use user feedback, including ratings of AI responses, to fine-tune and improve our model. We do not use your conversations or uploaded files to train our own models.
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 italic">
                    Please avoid including personal or confidential information in feedback comments.
                  </p>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 5 */}
              {/* ============================================================== */}
              <article
                id="section-5"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      5
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      5. Access to Your Information
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-5')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-5' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-3.5 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    Our team has technical access to conversations and uploaded files. We do not routinely read them. We may access information when necessary to provide support, investigate abuse or security incidents, review feedback for model improvement, or meet legal requirements.
                  </p>
                  <p>
                    IP addresses, device information, and usage and error logs are available through our administrative portal for operating and securing the Service.
                  </p>
                  <p>
                    We do not publicly share your private conversations or uploaded files. If you choose to share a conversation using the share feature, anyone with the link can view it until you stop sharing it.
                  </p>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <p className="font-semibold text-slate-900 mb-2">We may share information with:</p>
                    <ul className="space-y-2 list-none pl-0">
                      <li className="flex items-start gap-2">
                        <span className="text-[#00a859] font-bold">•</span>
                        <span>Hosting, authentication, email, security (such as Cloudflare), AI, speech, and other service providers where necessary to operate the Service.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#00a859] font-bold">•</span>
                        <span>Authorities when required by applicable law or valid legal process.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-[#00a859] font-bold">•</span>
                        <span>A successor operator if responsibility for the Service is transferred, subject to applicable requirements.</span>
                      </li>
                    </ul>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 pt-2 border-t border-slate-100">
                    Google’s handling of information through Google sign-in is governed by its own privacy policy.
                  </p>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 6 */}
              {/* ============================================================== */}
              <article
                id="section-6"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      6
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      6. Cookies, Local Storage, and Similar Technologies
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-6')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-6' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-3.5 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    On the website we use only essential cookies and similar technologies needed to authenticate users, maintain sessions, and operate the Service. In the mobile app, we store your sign-in credentials in the device’s secure storage and a few app preferences locally on your device.
                  </p>
                  <p>
                    We do not currently use advertising or analytics tracking. Blocking essential cookies may prevent login or affect other features.
                  </p>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 7 */}
              {/* ============================================================== */}
              <article
                id="section-7"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      7
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      7. Mobile App Permissions
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-7')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-7' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-3.5 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    The Android app may ask for the following permissions. You can change them at any time in your device settings.
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-3 pt-1">
                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                      <strong className="text-slate-900 block text-xs sm:text-sm font-semibold mb-1">Internet access:</strong>
                      <span className="text-xs text-slate-600">required to communicate with our servers.</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                      <strong className="text-slate-900 block text-xs sm:text-sm font-semibold mb-1">Microphone:</strong>
                      <span className="text-xs text-slate-600">used only for voice input, when you tap to record.</span>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                      <strong className="text-slate-900 block text-xs sm:text-sm font-semibold mb-1">Photos, files, and camera:</strong>
                      <span className="text-xs text-slate-600">used only when you choose to attach an image or file or set a profile picture.</span>
                    </div>
                  </div>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 8 */}
              {/* ============================================================== */}
              <article
                id="section-8"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      8
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      8. Hosting, Storage, and International Transfers
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-8')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-8' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    Our primary servers are located in Pakistan. If a third-party service provider described in this policy processes your information, that processing may take place in other countries, which may have different data-protection rules from Pakistan. Access to stored information is limited according to operational needs.
                  </p>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 9 */}
              {/* ============================================================== */}
              <article
                id="section-9"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      9
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      9. Retention and Deletion
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-9')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-9' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-3.5 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    We retain conversations and uploaded files until you delete them or delete your account.
                  </p>
                  <p>
                    You can delete chats through the app or website. When you delete a chat or uploaded file, it is removed from active storage and from backups within a reasonable period as backups are rotated.
                  </p>
                  <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl">
                    <p className="font-medium text-emerald-950">
                      You can delete your account and its associated data by emailing us at{' '}
                      <a href="mailto:support.judicialgpt@gmail.com" className="text-[#00a859] underline font-semibold">
                        support.judicialgpt@gmail.com
                      </a>{' '}
                      from your registered email address, or through the account-deletion option in the app or website where available. We will complete verified deletion requests within 30 days.
                    </p>
                  </div>
                  <p>
                    We retain IP addresses, device information, and usage and error logs while you continue using Judicial GPT, and delete them within 90 days after your account is deleted, except where we must keep them to investigate abuse or security incidents or to comply with law.
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 italic">
                    Deleting stored feedback does not necessarily reverse changes already made to a trained model.
                  </p>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 10 */}
              {/* ============================================================== */}
              <article
                id="section-10"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      10
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      10. Security
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-10')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-10' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    We use encryption (HTTPS) to protect information in transit and take reasonable steps to protect information against unauthorized access, loss, alteration, or misuse. However, no method of electronic transmission or storage is completely secure.
                  </p>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 11 */}
              {/* ============================================================== */}
              <article
                id="section-11"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      11
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      11. Your Choices and Requests
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-11')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-11' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-3.5 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    You can delete chats and your account as described above. You may also contact us to request access to, correction of, or deletion of your personal information, or withdraw permissions such as microphone or camera access through your device settings.
                  </p>
                  <p>
                    We may need to verify your identity before completing a request. Requests are handled subject to applicable legal obligations.
                  </p>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 12 */}
              {/* ============================================================== */}
              <article
                id="section-12"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      12
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      12. Legal Information and Confidentiality
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-12')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-12' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-slate-700 text-sm sm:text-base leading-relaxed p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <p>
                    Judicial GPT is a legal information tool designed to provide legal information and analysis. Its responses are intended to assist users and should not be considered professional legal advice or a final legal verdict. For accuracy and due consideration, all responses should be reviewed and validated by a qualified human legal professional.
                  </p>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 13 */}
              {/* ============================================================== */}
              <article
                id="section-13"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      13
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      13. Payments and Advertising
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-13')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-13' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    Judicial GPT is currently free. If we introduce paid plans or advertising that changes how we process information, we will update this policy and notify users in advance.
                  </p>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 14 */}
              {/* ============================================================== */}
              <article
                id="section-14"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      14
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      14. Changes to This Policy
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-14')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-14' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    We may update this Privacy Policy as our services or practices change. We will update the effective date shown above and notify users of important changes through the Service or other appropriate channels.
                  </p>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 15 */}
              {/* ============================================================== */}
              <article
                id="section-15"
                className="scroll-mt-28 bg-gradient-to-br from-white to-emerald-50/50 rounded-2xl border border-emerald-200/80 p-6 sm:p-8 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-emerald-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#00a859] text-white font-bold text-sm">
                      15
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      15. Contact
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-15')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-15' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>For privacy questions or requests, contact:</p>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 bg-white rounded-xl border border-emerald-200 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-[#00a859] flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Official Privacy Contact</span>
                        <a
                          href="mailto:support.judicialgpt@gmail.com"
                          className="text-sm sm:text-base font-bold text-emerald-700 hover:underline break-all"
                        >
                          support.judicialgpt@gmail.com
                        </a>
                      </div>
                    </div>
                    <a
                      href="mailto:support.judicialgpt@gmail.com"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#00a859] hover:bg-emerald-600 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer shadow-sm"
                    >
                      <span>Send Inquiry</span>
                      <ChevronRight className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </article>

              {/* Back to Top / Navigation Footer Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#00a859] transition-colors"
                >
                  ← Return to Sign In / Sign Up
                </Link>

                <button
                  type="button"
                  onClick={scrollToTop}
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-[#00a859] transition-colors cursor-pointer"
                >
                  <span>Back to top</span>
                  <ArrowUp className="w-4 h-4" />
                </button>
              </div>

            </main>
          </div>
        </div>
      </section>

      {/* Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-[#00a859] hover:bg-emerald-600 text-white shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </SiteShell>
  );
}
