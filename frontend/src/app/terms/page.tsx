'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Scale,
  Search,
  ChevronRight,
  ArrowUp,
  Check,
  Copy,
  ExternalLink,
  Mail,
  Shield,
  FileText,
  UserCheck,
  AlertTriangle,
  Gavel,
  Lock,
  Layers,
  Globe,
  Ban,
  CheckCircle2,
  RefreshCw,
  HelpCircle,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { SiteShell } from '@/components/site/SiteShell';

const SECTIONS = [
  { id: 'section-1', number: '1', title: 'Introduction and Acceptance', icon: FileText },
  { id: 'section-2', number: '2', title: 'Description of Services', icon: Sparkles },
  { id: 'section-3', number: '3', title: 'Eligibility and Accounts', icon: UserCheck },
  { id: 'section-4', number: '4', title: 'Permitted Use', icon: Shield },
  { id: 'section-5', number: '5', title: 'AI-Generated Content and Accuracy', icon: AlertTriangle },
  { id: 'section-6', number: '6', title: 'No Guarantee of Legal Outcomes', icon: Gavel },
  { id: 'section-7', number: '7', title: 'User Content and Documents', icon: Layers },
  { id: 'section-8', number: '8', title: 'Privacy and Information Security', icon: Lock },
  { id: 'section-9', number: '9', title: 'Intellectual Property', icon: BookOpen },
  { id: 'section-10', number: '10', title: 'Third-Party Services and Sources', icon: Globe },
  { id: 'section-11', number: '11', title: 'Availability and Suspension', icon: Ban },
  { id: 'section-12', number: '12', title: 'Limitation of Liability', icon: Scale },
  { id: 'section-13', number: '13', title: 'Indemnification', icon: CheckCircle2 },
  { id: 'section-14', number: '14', title: 'Changes to These Terms', icon: RefreshCw },
  { id: 'section-15', number: '15', title: 'General Provisions', icon: HelpCircle },
  { id: 'section-16', number: '16', title: 'Contact Information', icon: Mail },
];

export default function TermsPage() {
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
      const url = `${window.location.origin}/terms#${id}`;
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
          {/* Main Title & Metadata */}
          <div className="max-w-4xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white mb-3 sm:mb-4">
              Terms and Conditions of Use
            </h1>
            
            <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-xs sm:text-sm text-slate-300 font-medium mb-4 sm:mb-5">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-slate-400">Website:</span>
                <a
                  href="https://judicialgpt.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline inline-flex items-center gap-0.5"
                >
                  https://judicialgpt.org/ <ExternalLink className="w-3 h-3" />
                </a>
              </span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-slate-400">Effective Date:</span>
                <strong className="text-white">15 Oct 2026</strong>
              </span>
              <span className="hidden sm:inline text-slate-600">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-400">Contact Email:</span>
                <a
                  href="mailto:support.judicialgpt@gmail.com"
                  className="text-emerald-400 hover:underline font-semibold"
                >
                  support.judicialgpt@gmail.com
                </a>
              </span>
            </div>

            <div className="space-y-2 text-slate-300 text-sm sm:text-base leading-relaxed border-l-2 border-[#00a859] pl-4 bg-white/5 py-3 rounded-r-xl">
              <p>
                These Terms and Conditions govern access to and use of Judicial GPT, including its website, mobile applications, AI-powered legal tools, document-processing features, and related services (collectively, the &ldquo;Platform&rdquo;).
              </p>
              <p className="text-xs sm:text-sm text-slate-400">
                Please review these Terms carefully before using the Platform. Your use indicates full acceptance of these terms and the companion{' '}
                <Link href="/privacy" className="text-emerald-400 hover:underline font-medium">
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </div>

          {/* Key Assurance Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 sm:mt-8 sm:pt-6 border-t border-slate-800">
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-emerald-500/40 transition-colors">
              <Scale className="w-5 h-5 text-emerald-400 mb-2" />
              <h4 className="text-xs sm:text-sm font-semibold text-white">Decision Support</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Designed to aid research and drafting; judges decide.</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-emerald-500/40 transition-colors">
              <Layers className="w-5 h-5 text-emerald-400 mb-2" />
              <h4 className="text-xs sm:text-sm font-semibold text-white">Your Documents</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Users retain all rights in submitted files and prompts.</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-emerald-500/40 transition-colors">
              <AlertTriangle className="w-5 h-5 text-emerald-400 mb-2" />
              <h4 className="text-xs sm:text-sm font-semibold text-white">Human Verification</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Statutes &amp; citations must be independently reviewed.</p>
            </div>

            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 sm:p-4 hover:border-emerald-500/40 transition-colors">
              <Shield className="w-5 h-5 text-emerald-400 mb-2" />
              <h4 className="text-xs sm:text-sm font-semibold text-white">Ethical &amp; Lawful</h4>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Strict prohibition of fraudulent use or impersonation.</p>
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
              {/* Search within terms */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search terms sections..."
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
                    All Clauses (16)
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    DOCX Terms
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

              {/* Companion Privacy Link Card */}
              <div className="mt-4 p-4 bg-emerald-950 text-white rounded-2xl border border-emerald-800/40">
                <p className="text-xs font-semibold text-emerald-300 mb-1">Companion Policy</p>
                <p className="text-[11px] text-slate-300 leading-relaxed mb-3">
                  Read our full privacy statement and data protection architecture.
                </p>
                <Link
                  href="/privacy"
                  className="inline-flex items-center justify-center w-full gap-1.5 px-3 py-2 rounded-lg bg-[#00a859] hover:bg-emerald-600 text-white font-semibold text-xs transition-colors shadow-sm"
                >
                  <Lock className="w-3.5 h-3.5" />
                  View Privacy Policy
                </Link>
              </div>
            </aside>

            {/* Main Terms Content (16 Sections Verbatim) */}
            <main className="space-y-8">
              
              {/* Mobile Search Bar */}
              <div className="lg:hidden bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search terms sections..."
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
                      1. Introduction and Acceptance
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
                <div className="space-y-3 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    These Terms and Conditions govern access to and use of Judicial GPT, including its website, mobile applications, AI-powered legal tools, document-processing features, and related services (collectively, the &ldquo;Platform&rdquo;).
                  </p>
                  <p>
                    By accessing or using Judicial GPT, you agree to these Terms and the applicable Privacy Policy. If you do not agree, you must discontinue using the Platform.
                  </p>
                  <p>
                    If you access the Platform on behalf of a court, law firm, organization, or institution, you represent that you have authority to do so and agree to any applicable institutional terms.
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
                      2. Description of Services
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
                <div className="space-y-3.5 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    Judicial GPT is an AI-powered legal intelligence platform designed to support legal research, case analysis, legal information retrieval, document comprehension, and drafting workflows.
                  </p>
                  <p className="font-semibold text-slate-900">
                    Depending on the user&apos;s access level and available features, the Platform may provide:
                  </p>
                  <ul className="space-y-2 list-none pl-0">
                    {[
                      'AI-assisted legal questions and answers.',
                      'Case-law and statutory research with citations.',
                      'Case and legal document analysis.',
                      'Summarization of uploaded files and records.',
                      'OCR and text extraction from scanned documents, including Urdu and English materials.',
                      'Judgment drafting and structured draft preparation.',
                      'Voice input and transcription.',
                      'Web-based research and related legal information tools.',
                      'Paid plans, subscriptions, or premium features, where offered.',
                    ].map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#00a859] flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                          ✓
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="pt-2 text-xs sm:text-sm text-slate-500 italic">
                    Features may change over time and may be subject to access restrictions, technical limitations, or institutional agreements.
                  </p>
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
                      3. Eligibility and Accounts
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
                <div className="space-y-3 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    Users must provide accurate information when registering and must protect their account credentials.
                  </p>
                  <p>
                    Users are responsible for activity conducted through their accounts and must promptly report suspected unauthorized access.
                  </p>
                  <p>
                    Access may depend on the user&apos;s role, subscription, institutional authorization, or other eligibility requirements.
                  </p>
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
                      4. Permitted Use
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
                    Users may use the Platform for lawful legal research, education, document review, professional workflows, and other purposes authorized by Judicial GPT.
                  </p>
                  
                  <div className="p-4 bg-red-50/70 border border-red-200/80 rounded-xl space-y-2.5">
                    <p className="font-bold text-red-900 text-xs sm:text-sm flex items-center gap-1.5">
                      <Ban className="w-4 h-4 text-red-600 shrink-0" />
                      Users must not:
                    </p>
                    <ul className="space-y-2 list-none pl-0 text-red-950 text-xs sm:text-sm">
                      {[
                        'Use the Platform for unlawful, fraudulent, or deceptive activities.',
                        'Generate fraudulent legal documents or impersonate a judge, lawyer, court, or public official.',
                        'Access accounts, records, or restricted information without authorization.',
                        'Upload malware or attempt to compromise the Platform\'s security.',
                        'Scrape, reverse-engineer, or interfere with the Platform except as expressly permitted by applicable law or written authorization.',
                        'Upload or process confidential, personal, or copyrighted material without the necessary authority.',
                        'Use AI outputs as a substitute for decisions reserved by law to a judge, court, or other authorized professional.',
                      ].map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-red-500 font-bold shrink-0">✕</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
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
                      5. AI-Generated Content and Accuracy
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
                    Judicial GPT uses AI to assist with legal research, analysis, and drafting. AI-generated content may contain factual errors, incomplete analysis, outdated legal references, incorrect citations, or other inaccuracies.
                  </p>
                  <p>
                    Although the Platform may use retrieval, source references, and other techniques intended to improve reliability, accuracy cannot be guaranteed.
                  </p>
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                    <p className="font-semibold text-amber-950">
                      Users must independently verify relevant statutes, judgments, citations, facts, procedural requirements, and applicable law before relying on any output.
                    </p>
                    <p className="text-xs sm:text-sm text-amber-900">
                      An appropriately qualified person must review, correct, and approve AI-generated drafts before use in court, client matters, or other consequential situations.
                    </p>
                  </div>
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
                      6. No Guarantee of Legal Outcomes
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
                <div className="space-y-3 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    Judicial GPT does not guarantee the outcome of any case, the acceptance of a filing, the correctness of a legal strategy, or the suitability of generated material for a particular proceeding.
                  </p>
                  <p>
                    Unless expressly agreed otherwise in a separate written agreement, the Platform provides decision-support and information tools rather than legal representation or a judicial determination.
                  </p>
                  <p className="font-medium text-slate-900">
                    Use of the Platform does not, by itself, establish an advocate-client relationship or confer judicial authority.
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
                      7. User Content and Documents
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
                <div className="space-y-3 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    Users retain whatever rights they hold in documents, prompts, and other material they submit, subject to applicable third-party rights.
                  </p>
                  <p>
                    Users authorize the processing of submitted content to the extent reasonably necessary to provide the requested services and as permitted by the applicable Privacy Policy and any institutional agreement.
                  </p>
                  <p>
                    Users are responsible for ensuring that they have the authority to upload and process case files, personal information, confidential documents, and other restricted material.
                  </p>
                  <p className="text-xs sm:text-sm text-slate-500 italic">
                    Additional requirements may apply to institutional users handling court records or sensitive legal information.
                  </p>
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
                      8. Privacy and Information Security
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
                <div className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    JudicialGPT&apos;s collection, use, storage, retention, and disclosure of personal information are described in its Privacy Policy:
                  </p>

                  {/* Privacy Policy Link */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50/50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-base flex items-center gap-2">
                          <span>JudicialGPT Privacy Policy</span>
                          <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">Official Policy</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                          Review data protection, encryption, third-party processing, retention, and user rights
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#00a859] hover:bg-[#008f4c] text-white text-sm font-semibold transition-all shadow-xs shrink-0 group cursor-pointer"
                    >
                      <span>Open Privacy Policy</span>
                      <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>

                  <p>
                    Users should review that policy before submitting personal, client, or judicial information.
                  </p>
                  <p>
                    Any statements about data residency, encryption, third-party processing, model training, deletion, and retention must be interpreted in accordance with the applicable published policies and institutional agreements.
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
                      9. Intellectual Property
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
                <div className="space-y-3 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    The Platform&apos;s software, branding, design, documentation, and original materials are owned by or licensed to the relevant rights holders.
                  </p>
                  <p>
                    Subject to these Terms, users receive a limited, non-exclusive, non-transferable right to use the Platform for its intended purposes.
                  </p>
                  <p>
                    Third-party legal materials remain subject to their applicable ownership, licensing, attribution, and reuse requirements.
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
                      10. Third-Party Services and Sources
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
                <div className="space-y-3 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    The Platform may use external information sources, search tools, infrastructure providers, or other third-party services.
                  </p>
                  <p>
                    External sources may be incomplete, unavailable, or subject to separate terms. Users should verify important legal material against authoritative sources.
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
                      11. Availability and Suspension
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
                <div className="space-y-3 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    Judicial GPT may update, maintain, restrict, suspend, or discontinue features where reasonably necessary for security, maintenance, legal compliance, or service improvement.
                  </p>
                  <p>
                    Access may be suspended or terminated for material violations of these Terms, unauthorized access, security risks, or other grounds permitted by applicable law and contractual arrangements.
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
                      12. Limitation of Liability
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
                <div className="space-y-3 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    To the extent permitted by applicable law, Judicial GPT and its operator shall not be liable for indirect, incidental, special, consequential, or punitive losses arising from the use of the Platform.
                  </p>
                  <p>
                    The Platform does not guarantee uninterrupted access, error-free outputs, complete research results, or a particular legal outcome.
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
                      13. Indemnification
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
                <div className="space-y-3 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    To the extent permitted by applicable law, users may be responsible for losses and reasonable costs arising from their unlawful use of the Platform, infringement of third-party rights, or material breach of these Terms.
                  </p>
                  <p>
                    The scope of this provision is subject to applicable law and any separate institutional agreement.
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
                      14. Changes to These Terms
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
                <div className="space-y-3 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    Judicial GPT may revise these Terms to reflect changes in its services, legal obligations, or security practices. Updated versions will be published with a revised effective date.
                  </p>
                  <p>
                    Where required, users will receive notice of material changes before they take effect.
                  </p>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 15 */}
              {/* ============================================================== */}
              <article
                id="section-15"
                className="scroll-mt-28 bg-white rounded-2xl border border-slate-200/80 p-6 sm:p-8 shadow-xs hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-emerald-100 text-[#00a859] font-bold text-sm">
                      15
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      15. General Provisions
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
                <div className="space-y-3 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <p>
                    If any provision is held unenforceable, the remaining provisions will continue to apply to the extent permitted by law.
                  </p>
                  <p>
                    These Terms, together with the applicable Privacy Policy and any separate agreements, govern use of the Platform. In the event of a conflict with an institutional agreement, the applicable agreement&apos;s precedence provisions will control.
                  </p>
                </div>
              </article>

              {/* ============================================================== */}
              {/* SECTION 16 */}
              {/* ============================================================== */}
              <article
                id="section-16"
                className="scroll-mt-28 bg-gradient-to-br from-white to-emerald-50/50 rounded-2xl border border-emerald-200/80 p-6 sm:p-8 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-emerald-100">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-[#00a859] text-white font-bold text-sm">
                      16
                    </span>
                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                      16. Contact Information
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyLink('section-16')}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Copy section link"
                  >
                    {copiedId === 'section-16' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="space-y-4 text-slate-700 text-sm sm:text-base leading-relaxed">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-xl border border-emerald-200/80 shadow-2xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-[#00a859] flex items-center justify-center shrink-0">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Official Website</span>
                        <a
                          href="https://judicialgpt.org"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          https://judicialgpt.org <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-emerald-200/80 shadow-2xs flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-100 text-[#00a859] flex items-center justify-center shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs text-slate-400 font-medium block">Contact Email</span>
                        <a
                          href="mailto:support.judicialgpt@gmail.com"
                          className="text-sm font-bold text-emerald-700 hover:underline break-all"
                        >
                          support.judicialgpt@gmail.com
                        </a>
                      </div>
                    </div>
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
