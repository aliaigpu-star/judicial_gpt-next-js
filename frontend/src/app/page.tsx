'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Scale, ArrowRight, FileText, Users, MessageSquare, Star, Twitter, Linkedin,
  Github, Mail, Brain, Clock, Target, Award, Sparkles, Lock, Globe, MessageCircle,
  FileSearch, Bot, ChevronDown, ChevronLeft, ChevronRight, Menu, X, Check, Lightbulb, Shield,
  Search, BookOpen, ShieldCheck, Zap, DollarSign, MapPin, Landmark, Briefcase,
  ScanText, Mic, Info, Plus, Code, BarChart3, Cloud
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { SiteFooter } from '@/components/site/SiteShell';

// ============================================================================
// TYPES
// ============================================================================
type Particle = { left: string; top: string; duration: number; delay: number };

/** Shared viewport settings: animate only when scrolled into view, once */
const SCROLL_VIEWPORT = { once: true, amount: 0.28, margin: '0px 0px -12% 0px' } as const;

/** Animate a number from 0 → target when `active` becomes true (runs once) */
function useCountUp(active: boolean, target: number, duration = 1400) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // Quadratic ease-out keeps lower numbers visible longer
      const eased = 1 - Math.pow(1 - t, 2);
      setValue(Math.round(target * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, target, duration]);

  return value;
}

/** True only after client mount — keeps SSR and first client paint identical */
function useHasMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

// ============================================================================
// FLOATING PARTICLES — client-only (prevents SSR/hydration mismatch)
// ============================================================================
const FloatingParticles = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setParticles(
      Array.from({ length: 24 }).map(() => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        duration: 4 + Math.random() * 6,
        delay: Math.random() * 6,
      }))
    );
  }, []);

  return (
    <>
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-[#00a859]/35"
          style={{ left: p.left, top: p.top }}
          animate={{ y: [0, -40, 0], opacity: [0.08, 0.4, 0.08], scale: [1, 2, 1] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
        />
      ))}
    </>
  );
};

// ============================================================================
// HERO BACKGROUND — match reference: soft left legal wash + right glowing hex ring
// ============================================================================

/** Round to 2 decimals — keeps SSR/client SVG attrs identical */
const r2 = (n: number) => Math.round(n * 100) / 100;

function hexPoints(cx: number, cy: number, r: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${r2(cx + r * Math.cos(a))},${r2(cy + r * Math.sin(a))}`;
  }).join(' ');
}

/** Precomputed geometry — identical on server & client */
const HERO_RING_GEOMETRY = (() => {
  const cx = 50;
  const cy = 50;

  // Hex band nodes (inner decorative ring of hexagons)
  const hexBand: { x: number; y: number; size: number }[] = [];
  const bandR = 28;
  const bandCount = 24;
  for (let i = 0; i < bandCount; i++) {
    const a = (Math.PI * 2 * i) / bandCount - Math.PI / 2;
    hexBand.push({
      x: r2(cx + bandR * Math.cos(a)),
      y: r2(cy + bandR * Math.sin(a)),
      size: 1.35,
    });
  }

  // Network mesh rings
  const meshRings = [
    { r: 12, count: 6 },
    { r: 20, count: 10 },
    { r: 36, count: 16 },
  ];
  const nodes: { x: number; y: number; ring: number; glowR: number; hexR: number }[] = [];
  meshRings.forEach((ring, ri) => {
    for (let i = 0; i < ring.count; i++) {
      const a = (Math.PI * 2 * i) / ring.count - Math.PI / 2 + (ri === 1 ? 0.12 : 0);
      nodes.push({
        x: r2(cx + ring.r * Math.cos(a)),
        y: r2(cy + ring.r * Math.sin(a)),
        ring: ri,
        glowR: r2(2.4 - ri * 0.3),
        hexR: r2(1.05 - ri * 0.1),
      });
    }
  });

  const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
  let offset = 0;
  meshRings.forEach((ring, ri) => {
    for (let i = 0; i < ring.count; i++) {
      const a = nodes[offset + i];
      const b = nodes[offset + ((i + 1) % ring.count)];
      lines.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      if (ri > 0) {
        const prev = meshRings[ri - 1];
        const prevOffset = offset - prev.count;
        const mapped = Math.round((i * prev.count) / ring.count) % prev.count;
        const p = nodes[prevOffset + mapped];
        lines.push({ x1: a.x, y1: a.y, x2: p.x, y2: p.y });
      }
    }
    offset += ring.count;
  });

  // Floating translucent hex accents (around outer ring, like the reference)
  const floatHexes: { x: number; y: number; size: number; opacity: number }[] = [];
  const floatSpecs = [
    { a: -20, r: 41, s: 3.2, o: 0.22 },
    { a: 25, r: 43, s: 2.4, o: 0.18 },
    { a: 70, r: 40, s: 2.8, o: 0.2 },
    { a: 130, r: 42, s: 2.2, o: 0.16 },
    { a: 175, r: 39, s: 3.0, o: 0.2 },
    { a: 220, r: 43, s: 2.5, o: 0.17 },
    { a: 280, r: 41, s: 2.7, o: 0.19 },
    { a: 320, r: 44, s: 2.1, o: 0.15 },
  ];
  floatSpecs.forEach((f) => {
    const rad = (f.a * Math.PI) / 180;
    floatHexes.push({
      x: r2(cx + f.r * Math.cos(rad)),
      y: r2(cy + f.r * Math.sin(rad)),
      size: f.s,
      opacity: f.o,
    });
  });

  return { cx, cy, nodes, lines, hexBand, floatHexes };
})();

/**
 * Full-page AI abstract background image — starts behind the navbar and
 * extends through the entire Hero section. Uses fixed positioning so it is
 * visible from the very top of the viewport.
 */
const HeroAbstractBg = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }} aria-hidden>
    {/* Base colour while image loads */}
    <div className="absolute inset-0 bg-[#a2ebd0]" />

    {/* Hero AI Scale image directly provided by user */}
    <div className="absolute inset-0 w-full h-full">
      <img
        src="/hero-judicial-scale.jpg"
        alt=""
        className="w-full h-full object-cover object-[25%_center] sm:object-center opacity-90"
        draggable={false}
      />
    </div>

    {/* Subtle soft gradient wash for optimal text readability on left */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(90deg, rgba(235, 250, 242, 0.45) 0%, rgba(235, 250, 242, 0.15) 50%, transparent 100%)',
      }}
    />

    {/* Clean soft fade at bottom transitioning to next section */}
    <div
      className="absolute bottom-0 inset-x-0 h-32"
      style={{
        background: 'linear-gradient(to bottom, transparent, #F7F7F5)',
      }}
    />
  </div>
);

/** Hero background — image spans behind navbar → hero bottom */
const HeroBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Base page colour (visible while image loads) */}
    <div className="absolute inset-0 bg-[#edf5f1]" />
    {/* Abstract AI image — full-width, green & white themed */}
    <HeroAbstractBg />
  </div>
);



/** Shared scroll reveal — matches Features section (bottom → top + fade) */
const ScrollReveal = ({
  children,
  className = '',
  delay = 0,
  y = 32,
  duration = 0.55,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  duration?: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={SCROLL_VIEWPORT}
    transition={{ duration, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

// ============================================================================
// SHARED: SECTION HEADING
// ============================================================================
const SectionHeading = ({
  label, title, subtitle, center = true, light = false,
}: {
  label: string;
  title: React.ReactNode;
  subtitle?: string;
  center?: boolean;
  light?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 32 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={SCROLL_VIEWPORT}
    transition={{ duration: 0.6, ease: 'easeOut' }}
    className={`mb-16 ${center ? 'text-center' : ''}`}
  >
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-5 ${light
      ? 'bg-[#00a859]/15 text-[#00a859] border border-[#00a859]/25'
      : 'bg-[#00a859]/10 text-[#00a859] border border-[#00a859]/25'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${light ? 'bg-[#00a859]' : 'bg-[#00a859]'} animate-pulse`} />
      {label}
    </div>
    <h2 className={`font-heading text-4xl md:text-5xl lg:text-[3.15rem] font-semibold leading-[1.15] tracking-tight mb-5 ${light ? 'text-white' : 'text-slate-900'
      }`}>
      {title}
    </h2>
    {subtitle && (
      <p className={`font-body text-xl md:text-[1.35rem] leading-[1.8] max-w-2xl ${center ? 'mx-auto' : ''} ${light ? 'text-slate-300' : 'text-slate-500'}`}>
        {subtitle}
      </p>
    )}
  </motion.div>
);

// ============================================================================
// HEADER
// ============================================================================
const Header = () => {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('Features');

  const navItems = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'AI Tools', href: '#ai-tools' },
    { name: 'Team', href: '#team' },
    { name: 'About', href: '#about' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-[9999] pt-3 sm:pt-3.5 px-3 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/85 backdrop-blur-xl border border-white/90 shadow-[0_6px_24px_rgba(0,0,0,0.05)] rounded-[20px] sm:rounded-[22px] px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between transition-all">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer flex-shrink-0"
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push('/')}
          >
            <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-[10px] bg-[#0c7a4b] flex items-center justify-center text-white shadow-sm shrink-0">
              <Scale className="w-4.5 h-4.5 text-white stroke-[2.2]" />
            </div>
            <span className="text-lg sm:text-[19px] font-black tracking-tight text-slate-900">
              Judicial<span className="text-[#0c7a4b]">GPT</span>
            </span>
          </motion.div>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-6">
            {navItems.map((item) => {
              const isActive = activeNav === item.name;
              return (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => setActiveNav(item.name)}
                  className="flex flex-col items-center group py-0.5"
                >
                  <span
                    className={`text-[14px] transition-colors duration-200 ${
                      isActive ? 'font-bold text-slate-900' : 'font-medium text-slate-700 hover:text-[#0c7a4b]'
                    }`}
                  >
                    {item.name}
                  </span>
                  {isActive ? (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="w-4 h-[3px] bg-[#0c7a4b] rounded-full mt-0.5"
                    />
                  ) : (
                    <div className="w-4 h-[3px] bg-transparent rounded-full mt-0.5 group-hover:bg-[#0c7a4b]/30 transition-colors" />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => router.push('/login')}
              className="text-[14px] font-semibold text-slate-700 hover:text-slate-900 px-2.5 py-1.5 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <motion.button
              onClick={() => router.push('/signup')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4.5 sm:px-5 py-2 text-[13.5px] font-bold text-white bg-[#0c7a4b] hover:bg-[#09633c] rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Get Started Free
            </motion.button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu dropdown */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="lg:hidden mt-2 bg-white/95 backdrop-blur-2xl border border-white/90 shadow-xl rounded-2xl p-4 space-y-2"
            >
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="block px-3.5 py-2.5 text-slate-700 font-semibold rounded-xl hover:bg-[#0c7a4b]/10 hover:text-[#0c7a4b] transition-colors"
                  onClick={() => {
                    setActiveNav(item.name);
                    setIsMobileMenuOpen(false);
                  }}
                >
                  {item.name}
                </a>
              ))}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <button
                  onClick={() => {
                    router.push('/login');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-sm font-semibold text-center text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    router.push('/signup');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-sm font-bold text-center text-white bg-[#0c7a4b] rounded-xl shadow-sm"
                >
                  Get Started Free
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

// ============================================================================
// ============================================================================
// 3D TILTED HERO SURFACE CARD — matches the reference image
// ============================================================================
const LEGAL_QA_LANGUAGES = [
  {
    lang: 'English',
    code: 'en',
    dir: 'ltr' as const,
    flag: 'en',
    question:
      'What are the legal consequences of breaching a contract in Pakistan, and can a court order specific performance?',
    answer:
      'Under Pakistani law, breaching a contract exposes the defaulting party to two primary remedies: compensatory damages under Section 73 of the Contract Act 1872, or a decree of specific performance under the Specific Relief Act 1877. Damages are awarded when the loss is a natural consequence of the breach or was foreseeable at the time the contract was formed. Specific performance, which compels the breaching party to fulfil their exact obligations, is granted when monetary compensation is inadequate, such as in contracts for immovable property or unique goods.',
  },
  {
    lang: 'اردو',
    code: 'ur',
    dir: 'rtl' as const,
    flag: 'PK',
    question:
      'پاکستان میں معاہدے کی خلاف ورزی کے قانونی نتائج کیا ہیں، اور کیا عدالت مخصوص کارکردگی کا حکم دے سکتی ہے؟',
    answer:
      'پاکستانی قانون کے تحت، معاہدے کی خلاف ورزی پر دو بنیادی تدارکات دستیاب ہیں: معاہدہ ایکٹ 1872 کی دفعہ 73 کے تحت معاوضاتی نقصانات، یا اسپیسیفک ریلیف ایکٹ 1877 کے تحت مخصوص کارکردگی کا ڈگری۔ نقصانات اس وقت دیے جاتے ہیں جب نقصان خلاف ورزی کا فطری نتیجہ ہو یا معاہدے کے وقت قابل پیش بینی تھا۔ مخصوص کارکردگی، جس میں عدالت خلاف ورزی کرنے والے کو معاہدہ پورا کرنے پر مجبور کرتی ہے، اس وقت دی جاتی ہے جب مالی معاوضہ ناکافی ہو، جیسے غیر منقولہ جائیداد کے معاملات میں۔',
  },
  {
    lang: 'بلوچی',
    code: 'bal',
    dir: 'rtl' as const,
    flag: 'PK',
    question:
      'پاکستان ءَ معاہدے شکستی چے قانونی نتیجہ انت، و آیا عدالت خاص اجرا ءِ حکم دئے سکیت؟',
    answer:
      'پاکستانی قانون طبق، معاہدے شکست ءَ دو اصلی علاج دست انت: معاہدہ ایکٹ 1872 ءِ دفعہ 73 طبق نقصانی تاوان، یا اسپیسیفک ریلیف ایکٹ 1877 طبق خاص اجرا ءِ ڈگری۔ تاوان هما وختا دئیگ بیت کہ نقصان شکست ءِ طبیعی نتیجہ بوت یا معاہدے وختا پیش بینی بوتگ بیت۔ خاص اجرا، کہ عدالت شکست کننگ ءِ جانبا معاہدہ پورا کرنا مجبور کنت، هما وختا دئیگ بیت کہ مالی تاوان کم بیت، جیئن غیر منقولہ جائیداد ءِ معاملات ءَ۔',
  },
  {
    lang: 'پنجابی',
    code: 'pa',
    dir: 'rtl' as const,
    flag: 'PK',
    question:
      'پاکستان وچ معاہدے دی خلاف ورزی دے کیہ قانونی نتیجے ہوندے نیں، تے کیہ عدالت خاص کارکردگی دا حکم دے سکدی اے؟',
    answer:
      'پاکستانی قانون دے مطابق، معاہدے دی خلاف ورزی اُتے دو مُکھ اپائے ملدے نیں: کنٹریکٹ ایکٹ 1872 دی دفعہ 73 تحت ہرجانہ، یا اسپیسیفک ریلیف ایکٹ 1877 تحت خاص کارکردگی دا ڈگری۔ ہرجانہ اودوں دتا جاندا اے جدوں نقصان خلاف ورزی دا قدرتی نتیجہ ہووے یا معاہدے ویلے پیشگی اندازہ لایا جا سکدا ہووے۔ خاص کارکردگی، جس وچ عدالت خلاف ورزی کرن والے نوں معاہدہ پورا کرن اُتے مجبور کردی اے، اودوں دتی جاندی اے جدوں مالی ہرجانہ ناکافی ہووے، جویں غیر منقولہ جائیداد دے معاملیاں وچ۔',
  },
  {
    lang: 'سنڌي',
    code: 'sd',
    dir: 'rtl' as const,
    flag: '🌙',
    question:
      'پاڪستان ۾ معاهدي جي ڀڃڪڙي جا قانوني نتيجا ڇا آهن، ۽ ڇا عدالت مخصوص ڪارگذاري جو حڪم ڏئي سگهي ٿي؟',
    answer:
      'پاڪستاني قانون موجب، معاهدي جي ڀڃڪڙي تي ٻه بنيادي اپاءَ موجود آهن: معاهدو ايڪٽ 1872 جي دفعي 73 تحت هاڃي جو تاوان، يا اسپيسفڪ ريلف ايڪٽ 1877 تحت مخصوص ڪارگذاري جو حڪمنامو. هاڃي جو تاوان تڏهن ملندو آهي جڏهن نقصان ڀڃڪڙي جو قدرتي نتيجو هجي يا معاهدي جي وقت اڳ ۾ ئي سمجهي سگهجي. مخصوص ڪارگذاري، جنهن ۾ عدالت ڀڃڻ واري کي معاهدو پورو ڪرڻ تي مجبور ڪري ٿي، اها تڏهن ڏني ويندي آهي جڏهن مالي تاوان ناڪافي هجي، جيئن غير منقوله ملڪيت جي معاملن ۾.',
  },
];

const CASE_DOC_SNIPPETS = [
  'Suit No. 412/2024: Agreement breach under Sec 73 Contract Act 1872.',
  'Civil Appeal 89/23: Petition for specific performance of sale contract.',
  'Certified Plaint: High Court of Sindh Appellate Record 2024.',
];

const AI_ANALYSIS_SNIPPETS = [
  'Analysis: Breach substantiated. High likelihood of decree under S.12.',
  'Precedents matched: PLD 2023 SC 145 with 99.4% confidence score.',
  'Recommended: File compensatory damages & specific performance plea.',
];

const TiltedHeroSurfaceCard = () => {
  const [langIndex, setLangIndex] = useState(2);
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [responseStream, setResponseStream] = useState('');
  const isRunning = useRef(false);

  // Micro-typing animations for bottom floating cards
  const [docSnippetIndex, setDocSnippetIndex] = useState(0);
  const [typedDocText, setTypedDocText] = useState('');
  const [analysisSnippetIndex, setAnalysisSnippetIndex] = useState(0);
  const [typedAnalysisText, setTypedAnalysisText] = useState('');

  const current = LEGAL_QA_LANGUAGES[langIndex];
  const isRtl = current.dir === 'rtl';
  const NASTALIQ_CODES = new Set(['ur', 'sd', 'pa', 'bal']);
  const isNastaliq = NASTALIQ_CODES.has(current.code);

  // Main tablet Q&A loop
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (isRunning.current) return;
      isRunning.current = true;

      setTypedText('');
      setShowResponse(false);
      setResponseStream('');
      setShowCursor(false);

      await new Promise((r) => setTimeout(r, 600));
      if (cancelled) return;

      const q = LEGAL_QA_LANGUAGES[langIndex].question;
      for (let i = 0; i <= q.length; i++) {
        if (cancelled) return;
        setTypedText(q.slice(0, i));
        await new Promise((r) => setTimeout(r, 20 + Math.random() * 24));
      }

      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 400));
      setShowCursor(true);
      await new Promise((r) => setTimeout(r, 400));
      setShowCursor(false);
      setShowResponse(true);

      const a = LEGAL_QA_LANGUAGES[langIndex].answer;
      for (let i = 0; i <= a.length; i++) {
        if (cancelled) return;
        setResponseStream(a.slice(0, i));
        await new Promise((r) => setTimeout(r, 10 + Math.random() * 14));
      }

      await new Promise((r) => setTimeout(r, 5000));
      if (cancelled) return;

      isRunning.current = false;
      setLangIndex((prev) => (prev + 1) % LEGAL_QA_LANGUAGES.length);
    };

    run();
    return () => {
      cancelled = true;
      isRunning.current = false;
    };
  }, [langIndex]);

  // Case Document typing animation loop
  useEffect(() => {
    let cancelled = false;
    const runDoc = async () => {
      setTypedDocText('');
      await new Promise((r) => setTimeout(r, 350));
      if (cancelled) return;
      const text = CASE_DOC_SNIPPETS[docSnippetIndex];
      for (let i = 0; i <= text.length; i++) {
        if (cancelled) return;
        setTypedDocText(text.slice(0, i));
        await new Promise((r) => setTimeout(r, 24 + Math.random() * 18));
      }
      await new Promise((r) => setTimeout(r, 4000));
      if (cancelled) return;
      setDocSnippetIndex((prev) => (prev + 1) % CASE_DOC_SNIPPETS.length);
    };
    runDoc();
    return () => { cancelled = true; };
  }, [docSnippetIndex]);

  // AI Analysis Result typing animation loop
  useEffect(() => {
    let cancelled = false;
    const runAnalysis = async () => {
      setTypedAnalysisText('');
      await new Promise((r) => setTimeout(r, 700));
      if (cancelled) return;
      const text = AI_ANALYSIS_SNIPPETS[analysisSnippetIndex];
      for (let i = 0; i <= text.length; i++) {
        if (cancelled) return;
        setTypedAnalysisText(text.slice(0, i));
        await new Promise((r) => setTimeout(r, 20 + Math.random() * 16));
      }
      await new Promise((r) => setTimeout(r, 4500));
      if (cancelled) return;
      setAnalysisSnippetIndex((prev) => (prev + 1) % AI_ANALYSIS_SNIPPETS.length);
    };
    runAnalysis();
    return () => { cancelled = true; };
  }, [analysisSnippetIndex]);

  return (
    <div className="relative w-full max-w-2xl mx-auto hero-3d-scene select-none py-6 sm:py-10">
      {/* Contact shadow on desk surface */}
      <div
        className="absolute -bottom-6 sm:-bottom-8 left-1/2 -translate-x-1/2 w-[88%] h-14 bg-[#00a859]/25 rounded-[100%] filter blur-2xl pointer-events-none"
        style={{ transform: 'rotateX(65deg) scale(1.15)' }}
      />

      {/* 3D Tilted Board */}
      <motion.div
        className="relative hero-tilted-stage cursor-default"
        initial={{ opacity: 0, y: 30, rotateY: -16, rotateX: 12 }}
        animate={{ opacity: 1, y: 0, rotateY: -13, rotateX: 8 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      >
        {/* Main White Tablet Chassis */}
        <div className="relative rounded-[28px] sm:rounded-[36px] bg-white/95 backdrop-blur-2xl border border-white/90 shadow-[0_25px_60px_-15px_rgba(6,57,35,0.22),0_12px_28px_-8px_rgba(0,0,0,0.12),inset_0_1px_2px_rgba(255,255,255,1)] p-4 sm:p-7 text-left transition-all h-[360px] sm:h-[400px] flex flex-col justify-between">
          
          {/* Top Window Chrome Bar */}
          <div className="flex items-center justify-between gap-2 pb-3.5 sm:pb-4 border-b border-slate-100 shrink-0">
            {/* JudicialGPT brand on top left */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="w-6 h-6 rounded-lg bg-[#0c7a4b] flex items-center justify-center shadow-sm">
                <Scale className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-xs sm:text-sm font-bold tracking-tight text-slate-900">
                Judicial<span className="text-[#0c7a4b]">GPT</span>
              </span>
            </div>

            {/* Language Pills */}
            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto [scrollbar-width:none]">
              {LEGAL_QA_LANGUAGES.map((l, i) => {
                const isActive = i === langIndex;
                return (
                  <button
                    key={l.code}
                    onClick={() => {
                      isRunning.current = false;
                      setLangIndex(i);
                    }}
                    className={`px-2.5 sm:px-3 py-1 rounded-full text-[10.5px] sm:text-[11.5px] font-semibold transition-all duration-200 border flex items-center gap-1 shrink-0 ${
                      isActive
                        ? 'bg-[#0c7a4b] border-[#0c7a4b] text-white shadow-sm'
                        : 'bg-white/80 border-slate-200/80 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[10px] opacity-80">{l.flag}</span>
                    <span>{l.lang}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search / Query Pill - Fixed Height */}
          <div className="my-3 sm:my-3.5 shrink-0">
            <div
              className="relative flex items-center bg-white rounded-full border border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-3.5 sm:px-4 h-10 sm:h-11 gap-2 sm:gap-3 overflow-hidden"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              {/* Circular Action Button on the edge */}
              <button className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-slate-100/90 hover:bg-[#0c7a4b]/10 text-slate-500 hover:text-[#0c7a4b] flex items-center justify-center shrink-0 transition-colors">
                <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 transform rotate-180 rtl:rotate-0" />
              </button>

              {/* Typed Question Query - Strictly single-line truncated */}
              <div
                className={`flex-1 text-slate-800 font-medium truncate whitespace-nowrap overflow-hidden ${
                  isNastaliq ? 'nastaliq-question text-right text-xs sm:text-sm' : 'text-xs sm:text-sm'
                }`}
                style={{
                  ...(!isNastaliq && isRtl ? { direction: 'rtl', textAlign: 'right' } : {}),
                }}
              >
                <span>
                  {typedText}
                  {!showResponse && (
                    <span className="w-0.5 h-3.5 bg-[#0c7a4b] animate-pulse inline-block align-middle ml-0.5 rtl:mr-0.5" />
                  )}
                </span>
              </div>

              {/* Search Icon */}
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
            </div>
          </div>

          {/* Main Legal Answer Box - Fixed Height & Non-Expanding */}
          <div className="relative rounded-2xl bg-white/70 border border-slate-100 p-3.5 sm:p-4 shadow-inner h-[175px] sm:h-[195px] overflow-hidden flex-1">
            <div className="flex items-start gap-3 sm:gap-3.5 h-full overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
              {/* Green Scale of Justice Floating Icon Badge */}
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-[#0c7a4b] text-white flex items-center justify-center shadow-md shadow-emerald-900/15 shrink-0 mt-0.5">
                <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>

              {/* Answer Content - Fixed bounding container */}
              <div
                className={`flex-1 text-slate-700 h-full overflow-hidden ${
                  isNastaliq ? 'nastaliq-text' : 'text-xs sm:text-sm leading-relaxed'
                }`}
                style={!isNastaliq && isRtl ? { direction: 'rtl', textAlign: 'right', lineHeight: '1.7' } : {}}
              >
                <div className="overflow-hidden h-full">
                  {responseStream}
                  {responseStream.length < current.answer.length && (
                    <span className="w-1 h-3.5 bg-[#0c7a4b] animate-pulse inline-block align-middle ml-0.5 rtl:mr-0.5" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Emerald Side Tool Dock on the Right */}
        <div className="absolute -right-3.5 sm:-right-6 top-10 sm:top-14 z-30">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="bg-gradient-to-b from-[#0c7a4b] to-[#0a663e] p-2 sm:p-2.5 rounded-2xl sm:rounded-3xl shadow-[0_15px_35px_rgba(6,57,35,0.35)] border border-emerald-400/30 flex flex-col items-center gap-3 sm:gap-4 text-white"
          >
            <button className="p-1.5 sm:p-2 rounded-xl hover:bg-white/20 transition-colors" title="Legal Scales">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <button className="p-1.5 sm:p-2 rounded-xl hover:bg-white/20 transition-colors" title="Documents">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <button className="p-1.5 sm:p-2 rounded-xl hover:bg-white/20 transition-colors" title="Library">
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <button className="p-1.5 sm:p-2 rounded-xl hover:bg-white/20 transition-colors" title="Judicial Shield">
              <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
            <button className="p-1.5 sm:p-2 rounded-xl hover:bg-white/20 transition-colors" title="AI Chat">
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </button>
          </motion.div>
        </div>

        {/* Floating Card 1: "Case Document" (Bottom Left Stacked) */}
        <div className="absolute -bottom-6 sm:-bottom-8 -left-3 sm:-left-6 z-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="relative"
          >
            {/* Stacked background card layers */}
            <div className="absolute -inset-1 bg-white/60 rounded-2xl sm:rounded-3xl border border-slate-200/60 transform rotate-[-3deg] -z-10 shadow-sm" />
            <div className="absolute -inset-0.5 bg-white/80 rounded-2xl sm:rounded-3xl border border-slate-200/70 transform rotate-[-1.5deg] -z-10 shadow-sm" />

            {/* Foreground Card */}
            <div className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/90 shadow-[0_15px_30px_rgba(0,0,0,0.08)] p-3 sm:p-4 w-48 sm:w-56 h-[95px] sm:h-[105px] overflow-hidden flex flex-col justify-between">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs sm:text-sm shrink-0">
                <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0c7a4b] shrink-0" />
                <span className="truncate">Case Document</span>
              </div>
              
              {/* Small Proportionate Animated Text - Fixed Height */}
              <div className="h-[32px] sm:h-[36px] text-[10px] sm:text-[11px] text-slate-600 font-medium leading-snug overflow-hidden line-clamp-2">
                <span>{typedDocText}</span>
                <span className="w-0.5 h-3 bg-[#0c7a4b] animate-pulse inline-block align-middle ml-0.5" />
              </div>

              {/* Micro skeleton accent line */}
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 opacity-60 shrink-0">
                <div className="h-1 bg-slate-200 rounded-full w-2/3" />
                <div className="h-1 bg-slate-200 rounded-full w-1/3" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Floating Card 2: "AI Analysis Result" (Bottom Right) */}
        <div className="absolute -bottom-5 sm:-bottom-7 right-3 sm:right-6 z-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="bg-white/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-white/90 shadow-[0_15px_30px_rgba(0,0,0,0.08)] p-3 sm:p-4 w-52 sm:w-64 h-[95px] sm:h-[105px] overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs sm:text-sm truncate">
                <Scale className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0c7a4b] shrink-0" />
                <span className="truncate">AI Analysis Result</span>
              </div>
              <div className="w-5 h-5 sm:w-5.5 sm:h-5.5 rounded-full bg-[#0c7a4b] text-white flex items-center justify-center shrink-0 shadow-sm">
                <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5 stroke-[3]" />
              </div>
            </div>

            {/* Mint / Emerald animated progress indicator */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 sm:h-2 overflow-hidden shrink-0 my-0.5">
              <div className="h-full bg-gradient-to-r from-[#0c7a4b] to-[#34d399] rounded-full w-[88%] transition-all duration-700" />
            </div>

            {/* Small Proportionate Animated Text - Fixed Height */}
            <div className="h-[32px] sm:h-[36px] text-[10px] sm:text-[11px] text-slate-700 font-medium leading-snug overflow-hidden line-clamp-2">
              <span>{typedAnalysisText}</span>
              <span className="w-0.5 h-3 bg-[#0c7a4b] animate-pulse inline-block align-middle ml-0.5" />
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

// ============================================================================
// HERO SECTION
// ============================================================================
const HeroSection = () => {
  const router = useRouter();

  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden pt-20 sm:pt-24 pb-12 sm:pb-16">
      <HeroBackground />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-8 lg:gap-8 items-center">
        {/* Left Column: Content (Centered) */}
        <div className="flex flex-col items-center text-center max-w-xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-[#0c7a4b]/20 bg-white/85 backdrop-blur-md mb-5 shadow-sm text-xs font-semibold text-[#0c7a4b] mx-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0c7a4b]" />
            <span>AI-Powered Judicial Intelligence Platform</span>
            <span className="w-2 h-2 rounded-full bg-[#0c7a4b] animate-pulse" />
          </motion.div>

          {/* Headline with matched serif typography */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="font-hero-serif text-4xl sm:text-5xl md:text-6xl lg:text-[3.8rem] xl:text-[4.2rem] font-bold text-slate-900 leading-[1.1] tracking-tight mb-5 text-center"
          >
            <span className="block font-hero-serif font-bold text-slate-900">
              JudicialGPT
            </span>
            <span className="block font-normal text-2xl sm:text-3xl lg:text-[2.25rem] text-slate-700 my-1 font-hero-serif italic">
              for
            </span>
            <span className="block font-hero-serif font-bold text-[#0c7a4b]">
              Legal Analysis
            </span>
          </motion.h1>

          {/* Subtitle description */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="font-hero-body text-base sm:text-lg text-slate-600 leading-relaxed max-w-lg mx-auto mb-7 text-center font-medium"
          >
            Turn intricate legal questions into clear, structured analysis. Get issue breakdowns, applicable law, and actionable guidance instantly.
          </motion.p>

          {/* CTA Button Centered Directly Underneath */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex justify-center w-full"
          >
            <motion.button
              onClick={() => router.push('/chat')}
              whileHover={{ scale: 1.03, boxShadow: '0 12px 28px rgba(12,122,75,0.35)' }}
              whileTap={{ scale: 0.97 }}
              className="px-7 py-3.5 bg-[#0c7a4b] hover:bg-[#09633c] text-white font-bold rounded-2xl text-base inline-flex items-center gap-3 shadow-lg shadow-[#0c7a4b]/25 transition-all cursor-pointer"
            >
              <Scale className="w-5 h-5 text-white" />
              <span>Try AI Assistant Free</span>
              <ArrowRight className="w-4 h-4 text-white/90" />
            </motion.button>
          </motion.div>
        </div>

        {/* Right Column: 3D Tilted Card on Surface */}
        <div className="w-full relative z-10 mt-6 lg:mt-0">
          <TiltedHeroSurfaceCard />
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// TRUST BAR + AUDIENCE MARQUEE (directly below Hero)
// ============================================================================
const TrustBarSection = () => {
  const trustItems = [
    { icon: Shield, title: 'Open to All', subtitle: 'Ask Legal Questions', color: 'bg-[#00a859]' },
    { icon: Scale, title: 'All-in-One', subtitle: 'Judicial AI Platform', color: 'bg-[#00a859]' },
    { icon: Globe, title: 'Multi-language', subtitle: 'Coverage', color: 'bg-[#00a859]' },
    { icon: ShieldCheck, title: 'Safe & Secure', subtitle: 'Ad-Free', color: 'bg-[#00a859]' },
    { icon: Zap, title: 'Learn Smarter,', subtitle: 'Not Harder', color: 'bg-[#00a859]' },
    { icon: DollarSign, title: 'Affordable', subtitle: 'Premium Access', color: 'bg-[#00a859]' },
  ];

  const audiences = [
    { label: 'General Public / Citizens', star: 'text-orange-500' },
    { label: 'Judges', star: 'text-[#00a859]' },
    { label: 'Justice Sector Institutions', star: 'text-violet-500' },
    { label: 'Police Investigation Officers (IO)', star: 'text-sky-500' },
    { label: 'Prosecution', star: 'text-rose-500' },
    { label: 'Prisons & Correctional Facilities', star: 'text-amber-500' },
    { label: 'Lawyers', star: 'text-orange-500' },
    { label: 'Revenue & Land Records', star: 'text-[#00a859]' },
    { label: 'Tax & Revenue Authorities', star: 'text-violet-500' },
    { label: 'Banking & Financial Institutions', star: 'text-sky-500' },
    { label: 'District Judiciary', star: 'text-rose-500' },
    { label: "Prosecutor General's Office", star: 'text-amber-500' },
    { label: 'Corporate & Commercial Sector', star: 'text-orange-500' },
    { label: 'E-Governance & Public Administration', star: 'text-[#00a859]' },
  ];

  const marqueeItems = [...audiences, ...audiences];

  return (
    <section className="relative z-20 bg-[#F7F7F5] border-y border-slate-200/80">
      {/* Feature highlights */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="flex overflow-x-auto md:overflow-visible md:grid md:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-200/90 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {trustItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-5 py-5 min-w-[200px] md:min-w-0 shrink-0"
              >
                <div className={`w-10 h-10 rounded-full ${item.color} flex items-center justify-center shrink-0 shadow-sm`}>
                  <item.icon className="w-5 h-5 text-white" strokeWidth={2.25} />
                </div>
                <div className="min-w-0 leading-tight">
                  <p className="text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-500">{item.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>

      {/* Scrolling audience marquee — temporarily hidden
      <ScrollReveal delay={0.12} y={24}>
        <div className="bg-[#EFEFEA] border-t border-slate-200/70 py-3.5 overflow-hidden">
          <div className="flex w-max animate-trust-marquee">
            {marqueeItems.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 mx-2 px-4 py-2 rounded-full bg-white border border-slate-200/80 shadow-sm text-sm font-medium text-slate-600 whitespace-nowrap"
              >
                <Sparkles className={`w-3.5 h-3.5 shrink-0 ${item.star}`} fill="currentColor" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </ScrollReveal>
      */}
    </section>
  );
};

// ============================================================================
// SHADCN MINI STATS CARDS (Right above Features)
// ============================================================================
const MiniStatsSection = () => {
  const stats = [
    {
      value: '2.4M',
      label: 'Legal Documents',
      subtext: 'Indexed precedents & case law',
      icon: FileText,
      badge: 'Live Index',
    },
    {
      value: '10K+',
      label: 'Active Users',
      subtext: 'Judges, lawyers & researchers',
      icon: Users,
      badge: 'Growing',
    },
    {
      value: 'Highest',
      label: 'Benchmark Accuracy',
      subtext: 'Verified judicial citation rate',
      icon: Target,
      badge: 'Top Tier',
    },
    {
      value: '24/7',
      label: 'AI Availability',
      subtext: 'Round-the-clock intelligence',
      icon: Clock,
      badge: 'Always On',
    },
  ];

  return (
    <section className="relative py-6 sm:py-8 bg-[#F7F7F5]/50 border-b border-slate-200/60 overflow-hidden">
      {/* Subtle green ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[160px] bg-[#0c7a4b]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((item, idx) => {
              const Icon = item.icon;
              return (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: idx * 0.06, duration: 0.4 }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                  className="group relative rounded-xl sm:rounded-2xl bg-white/90 backdrop-blur-xl border border-slate-200/90 p-3.5 sm:p-4 shadow-sm hover:shadow-lg hover:shadow-[#0c7a4b]/10 hover:border-[#0c7a4b]/60 transition-all duration-300 overflow-hidden"
                >
                  {/* Top green gradient border accent (Shadcn effect) */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#0c7a4b]/40 to-transparent group-hover:via-[#0c7a4b] transition-all duration-500" />
                  
                  {/* Subtle inner radial glow on hover */}
                  <div className="absolute -top-8 -right-8 w-16 h-16 bg-[#0c7a4b]/10 rounded-full blur-xl group-hover:bg-[#0c7a4b]/20 transition-all duration-500 pointer-events-none" />

                  <div className="flex items-center justify-between mb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#0c7a4b]/10 border border-[#0c7a4b]/20 flex items-center justify-center text-[#0c7a4b] group-hover:bg-[#0c7a4b] group-hover:text-white group-hover:border-[#0c7a4b] transition-all duration-300 shadow-sm">
                      <Icon className="w-4 h-4 stroke-[2.2]" />
                    </div>
                    <span className="inline-flex items-center text-[9.5px] sm:text-[10px] font-bold text-[#0c7a4b] bg-[#0c7a4b]/10 px-2 py-0.5 rounded-full border border-[#0c7a4b]/20 tracking-wide uppercase">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <div className="text-xl sm:text-2xl lg:text-[1.65rem] font-black text-slate-900 tracking-tight group-hover:text-[#0c7a4b] transition-colors duration-200 leading-tight">
                      {item.value}
                    </div>
                    <div className="text-[12.5px] sm:text-[13px] font-bold text-slate-800 mt-0.5">
                      {item.label}
                    </div>
                    <div className="text-[10.5px] sm:text-[11px] text-slate-500 mt-0.5 leading-snug">
                      {item.subtext}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

// ============================================================================
// FEATURES SECTION
// ============================================================================
const FeatureCard = ({ icon: Icon, title, description, delay, gradient, glow }: {
  icon: React.ElementType;
  title: string;
  description: string;
  delay: number;
  gradient: string;
  glow: string;
}) => (
  <div
    className="feature-card group relative bg-white rounded-2xl p-7 border border-slate-200 shadow-sm flex-shrink-0"
    style={{
      width: 'clamp(260px, 28vw, 320px)',
      scrollSnapAlign: 'start',
      boxShadow: '0 4px 18px rgba(16, 185, 129, 0.07)',
      transition: 'transform 0.25s ease, box-shadow 0.25s ease',
      willChange: 'transform',
      isolation: 'isolate',
      transformOrigin: 'center center',
      animation: `fadeInUp 0.55s ease-out ${delay}s both`,
    }}
    onMouseEnter={e => {
      const el = e.currentTarget as HTMLElement;
      el.style.transform = 'scale(1.03)';
      el.style.boxShadow = '0 20px 48px rgba(12, 147, 68, 0.18)';
    }}
    onMouseLeave={e => {
      const el = e.currentTarget as HTMLElement;
      el.style.transform = 'scale(1)';
      el.style.boxShadow = '0 4px 18px rgba(16, 185, 129, 0.07)';
    }}
  >
    {/* Bottom accent line */}
    <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradient}`} />

    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-5 shadow-md`}>
      <Icon className="w-6 h-6 text-white" />
    </div>
    <h3 className="text-base font-bold text-slate-900 mb-2.5">{title}</h3>
    <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
  </div>
);

const FeaturesSection = () => {
  const features = [
    { icon: Brain, title: 'AI Legal Assistant', description: 'Get instant answers to complex legal questions. Our AI breaks down legal jargon into simple, actionable advice.', gradient: 'from-[#00a859] to-[#00a859]', glow: 'rgba(16, 185, 129, 0.18)' },
    { icon: FileSearch, title: 'Case Research Tool', description: 'Access millions of case precedents and legal documents instantly. Find relevant cases in seconds, not hours.', gradient: 'from-[#00a859] to-[#00a859]', glow: 'rgba(15, 23, 42, 0.18)' },
    { icon: MessageCircle, title: 'Virtual Consultation', description: '24/7 AI-powered consultation to understand your case, predict outcomes, and provide strategic guidance.', gradient: 'from-[#00a859] to-[#00a859]', glow: 'rgba(148, 163, 184, 0.18)' },
    { icon: FileText, title: 'Document Analysis', description: 'Upload contracts and legal documents for instant AI analysis. Identify risks, obligations, and key clauses.', gradient: 'from-[#00a859] to-[#00a859]', glow: 'rgba(16, 185, 129, 0.18)' },
    { icon: Shield, title: 'Privacy Protected', description: 'All conversations are encrypted and private. Option for temporary chats that are never stored.', gradient: 'from-[#00a859] to-[#00a859]', glow: 'rgba(15, 23, 42, 0.18)' },
    { icon: Globe, title: 'Multi-Platform Access', description: 'Access from any device — web, mobile, or desktop. Seamless experience across all platforms.', gradient: 'from-[#00a859] to-[#00a859]', glow: 'rgba(148, 163, 184, 0.18)' },
  ];

  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartLeft = useRef(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft < maxScroll - 4);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    window.addEventListener('resize', updateScrollState);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
    };
  }, []);

  const scrollByCard = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    const card = el.querySelector('.feature-card') as HTMLElement | null;
    const gap = 20;
    const amount = (card?.offsetWidth ?? 300) + gap;
    el.scrollBy({ left: direction * amount, behavior: 'smooth' });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    dragStartX.current = e.pageX;
    scrollStartLeft.current = scrollRef.current?.scrollLeft ?? 0;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grabbing';
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault();
    scrollRef.current.scrollLeft = scrollStartLeft.current - (e.pageX - dragStartX.current);
  };
  const onMouseUp = () => {
    isDragging.current = false;
    if (scrollRef.current) scrollRef.current.style.cursor = 'grab';
  };

  const arrowBtnClass =
    'absolute top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white border border-slate-200 text-slate-600 shadow-md shadow-slate-900/8 flex items-center justify-center transition-all duration-300 hover:border-[#00a859]/25 hover:text-[#00a859] hover:shadow-lg hover:shadow-[#00a859]/15 disabled:opacity-35 disabled:pointer-events-none disabled:shadow-none';

  return (
    <section id="features" className="py-6 lg:py-8 bg-slate-50/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="Features"
          title={<>Innovative Features That<br /><span className="text-[#00a859]">Redefine Legal Assistance</span></>}
          subtitle="Powered by advanced AI technology trained on millions of legal documents, delivering accurate and reliable legal intelligence."
        />
      </div>
      {/* ── Centered carousel container — fixed width, cards scroll inside ── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          aria-label="Previous features"
          onClick={() => scrollByCard(-1)}
          disabled={!canScrollLeft}
          className={`${arrowBtnClass} -left-1 sm:-left-3 lg:-left-6 xl:-left-8`}
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.25} />
        </button>
        <button
          type="button"
          aria-label="Next features"
          onClick={() => scrollByCard(1)}
          disabled={!canScrollRight}
          className={`${arrowBtnClass} -right-1 sm:-right-3 lg:-right-6 xl:-right-8`}
        >
          <ChevronRight className="w-5 h-5" strokeWidth={2.25} />
        </button>

        <div
          ref={scrollRef}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          className="features-scroll flex gap-5 overflow-x-auto select-none rounded-2xl px-12 sm:px-14 lg:px-16"
          style={{
            cursor: 'grab',
            scrollSnapType: 'x mandatory',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            paddingBottom: '24px',
            paddingTop: '12px',
            touchAction: 'pan-x',
          }}
        >
          {features.map((f, i) => <FeatureCard key={i} {...f} delay={i * 0.08} />)}
        </div>
      </div>
      {/* Hide WebKit scrollbar for this row */}
      <style>{`
        .features-scroll::-webkit-scrollbar { display: none; }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
};

// ============================================================================
// AI TOOLS SECTION — bento dashboard layout
// ============================================================================
const AIToolsSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const hasMounted = useHasMounted();
  const inView = useInView(sectionRef, { once: true, amount: 0.22, margin: '0px 0px -8% 0px' });
  const isInView = hasMounted && inView;

  const CIRCLE_TARGET = 88;
  const circlePct = useCountUp(isInView, CIRCLE_TARGET, 1500);
  const circumference = 301.593;

  const tools = [
    {
      icon: Bot,
      title: 'Legal Document Interpretation',
      description: 'Analyze Pakistani land, revenue, and judicial documents using AI-powered intelligence. It extracts key information such as ownership, rights, and legal implications, presenting complex records in simple and understandable summaries.',
      features: [
        'Document Analysis',
        'Land Record Support',
        'Ownership Detection',
        'Legal Summaries',
      ],
      gradient: 'from-[#00a859] to-[#00a859]',
      accent: 'bg-[#00a859]',
      accentSoft: 'bg-[#00a859]/10',
      accentText: 'text-[#00a859]',
      accentBorder: 'border-[#00a859]/25',
      glow: 'rgba(16, 185, 129, 0.45)',
      glowSoft: 'rgba(16, 185, 129, 0.12)',
      ring: '#00a859',
      badge: 'Analysis',
    },
    {
      icon: ScanText,
      title: 'Handwritten Text Extraction',
      description: 'Convert handwritten notes and legal documents into editable digital text with high accuracy. It supports Urdu, English, and mixed-language content while preserving the original document structure for easy reading and processing.',
      features: ['Handwriting Recognition', 'Urdu & English', 'Structure Preservation', 'Faster Transcription'],
      gradient: 'from-[#00a859] to-[#00a859]',
      accent: 'bg-[#00a859]',
      accentSoft: 'bg-[#00a859]/10',
      accentText: 'text-[#00a859]',
      accentBorder: 'border-[#00a859]/25',
      glow: 'rgba(16, 185, 129, 0.45)',
      glowSoft: 'rgba(16, 185, 129, 0.12)',
      ring: '#00a859',
      badge: 'Extraction',
    },
    {
      icon: Mic,
      title: 'Voice Command Processing',
      description: 'Transform spoken instructions into accurate text and interact with JudicialGPT hands-free. The system understands legal terminology and local accents to provide a smooth and efficient user experience.',
      features: ['Speech-to-Text', 'Hands-Free Control', 'Legal Terminology', 'Accent Recognition'],
      gradient: 'from-[#00a859] to-[#00a859]',
      accent: 'bg-[#00a859]',
      accentSoft: 'bg-[#00a859]/10',
      accentText: 'text-[#00a859]',
      accentBorder: 'border-[#00a859]/25',
      glow: 'rgba(16, 185, 129, 0.45)',
      glowSoft: 'rgba(16, 185, 129, 0.12)',
      ring: '#00a859',
      badge: 'Transcription',
    },
  ];

  const core = tools[0];

  const sideTools = [
    {
      icon: BookOpen,
      title: 'Smart Citation Search',
      description: 'Quickly find relevant case laws, legal precedents, and statutory references. Get accurate citations and applicable legal provisions while saving valuable research time.',
      features: ['Case Law Search', 'Citation Matching', 'Legal References', 'Faster Research'],
      gradient: 'from-[#00a859] to-[#00a859]',
      accent: 'bg-[#00a859]',
      accentSoft: 'bg-[#00a859]/10',
      accentText: 'text-[#00a859]',
      accentBorder: 'border-[#00a859]/25',
      glow: 'rgba(16, 185, 129, 0.45)',
      glowSoft: 'rgba(16, 185, 129, 0.12)',
      ring: '#00a859',
      badge: 'References',
    },
    {
      icon: Brain,
      title: 'Pakistan Law Intelligence',
      description: 'Access AI-driven insights from Pakistan’s laws, precedents, and judicial trends. Get contextual analysis for faster, evidence-based legal research and decision-making.',
      features: ['Legal Insights', 'Law Analysis', 'Judicial Trends', 'Reasoning Support'],
      gradient: 'from-[#00a859] to-[#00a859]',
      accent: 'bg-[#00a859]',
      accentSoft: 'bg-[#00a859]/10',
      accentText: 'text-[#00a859]',
      accentBorder: 'border-[#00a859]/25',
      glow: 'rgba(16, 185, 129, 0.45)',
      glowSoft: 'rgba(16, 185, 129, 0.12)',
      ring: '#00a859',
      badge: 'Intelligence',
    },
  ];

  const marqueeChips = [
    { label: 'JudicialGPT AI Chatbot', star: 'text-[#00a859]' },
    { label: 'Case Prism — Research Tool', star: 'text-blue-500' },
    { label: 'Virtual Legal Consultant', star: 'text-violet-500' },
    { label: 'Real-time Legal Updates', star: 'text-[#00a859]' },
    { label: 'Case Law Database', star: 'text-sky-500' },
    { label: 'NLP', star: 'text-amber-500' },
    { label: 'Contextual Understanding', star: 'text-rose-500' },
    { label: 'Advanced Search Filters', star: 'text-indigo-500' },
    { label: 'Citation Analysis', star: 'text-cyan-500' },
    { label: 'Precedent Mapping', star: 'text-[#00a859]' },
    { label: 'Export Capabilities', star: 'text-orange-500' },
    { label: 'Outcome Prediction', star: 'text-violet-500' },
    { label: 'Strategy Suggestions', star: 'text-blue-600' },
    { label: 'Risk Assessment', star: 'text-rose-500' },
    { label: 'Available 24/7', star: 'text-[#00a859]' },
    { label: 'PLG', star: 'text-[#00a859]' },
  ];
  const marqueeItems = [...marqueeChips, ...marqueeChips];

  const cardHover = (glow: string) => ({
    y: -6,
    scale: 1.015,
    boxShadow: `0 20px 44px rgba(16, 185, 129, 0.22), 0 6px 16px rgba(16, 185, 129, 0.13)`,
    transition: { duration: 0.35, ease: 'easeOut' as const },
  });

  return (
    <section ref={sectionRef} id="ai-tools" className="py-6 lg:py-8 bg-[#F7FAF8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={SCROLL_VIEWPORT}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-3xl mb-10 lg:mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-5 bg-[#00a859]/10 text-[#00a859] border border-[#00a859]/25">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00a859] animate-pulse" />
            AI Tools
          </div>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-[3.15rem] font-semibold leading-[1.12] tracking-tight text-slate-900 mb-4">
            Integrated AI-Powered<br />
            <span className="text-[#00a859]">Legal Solutions</span>
          </h2>
          <p className="text-lg md:text-xl leading-[1.8] text-slate-500">
            Experience the power of AI tools designed specifically for legal professionals and individuals seeking legal guidance.
          </p>
        </motion.div>

        {/* Top bento: large featured + stacked side cards */}
        <div className="grid lg:grid-cols-3 gap-4 lg:gap-5 mb-4 lg:mb-5 lg:items-stretch">
          {/* Large featured — Core Tool */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={SCROLL_VIEWPORT}
            transition={{ duration: 0.5 }}
            whileHover={hasMounted ? cardHover(core.glow) : undefined}
            className="lg:col-span-2 relative rounded-[1.75rem] border border-[#00a859]/15 bg-white p-6 md:p-8 h-full"
            style={{ boxShadow: `0 10px 40px ${core.glowSoft}` }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.75rem]" aria-hidden>
              <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[#00a859]/10 blur-3xl" />
            </div>
            <div className="relative flex flex-col h-full min-h-[320px]">
              {/* Top: copy aligned to top */}
              <div className="flex flex-col gap-6 md:gap-8 items-start">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00a859]/10 border border-[#00a859]/15 text-[#00a859] text-[11px] font-bold uppercase tracking-wider mb-4 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00a859]" />
                    {core.badge}
                  </div>
                  <h3 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight mb-3">
                    {core.title}
                  </h3>
                  <p className="text-slate-500 text-base md:text-lg leading-[1.75]">
                    {core.description}
                  </p>
                </div>
              </div>

              {/* Features — full width under graph, 2 rows × 3 columns */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-6 content-center mt-6 pt-6 border-t border-slate-100">
                {core.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-2 h-2 rounded-full ${core.accent} shrink-0`} />
                    <p className="text-sm md:text-[0.95rem] font-semibold text-slate-700 leading-snug">
                      {feat}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Stacked side cards */}
          <div className="flex flex-col gap-4 lg:gap-5">
            {sideTools.map((tool, i) => (
              <motion.div
                key={tool.title}
                initial={{ opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={SCROLL_VIEWPORT}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                whileHover={hasMounted ? cardHover(tool.glow) : undefined}
                className="flex-1 rounded-[1.5rem] border border-slate-200 bg-white p-5 md:p-6"
                style={{ boxShadow: `0 4px 20px ${tool.glowSoft}` }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00a859] to-[#00a859] flex items-center justify-center shadow-md">
                    <tool.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${tool.accentSoft} ${tool.accentText}`}>
                    {tool.badge}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mb-1.5 leading-snug">{tool.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-3">{tool.description}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Equal feature cards — CSS grid rows lock feature-list Y position */}
        <div id="ai-tools-grid" className="grid md:grid-cols-3 gap-4 lg:gap-5 mb-2 md:items-stretch">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={SCROLL_VIEWPORT}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={hasMounted ? cardHover(tool.glow) : undefined}
              className="group relative grid grid-rows-[auto_1fr_auto] h-full rounded-[1.5rem] border border-slate-200 hover:border-[#00a859] bg-white px-5 py-6 overflow-hidden transition-colors duration-300"
              style={{ boxShadow: `0 6px 22px rgba(16, 185, 129, 0.10)` }}
            >
              {/* Animated green bottom line */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00a859] to-[#00a859] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-b-[1.5rem]" />

              <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${tool.accent}`} />

              {/* Row 1: header */}
              <div className="flex items-center gap-3 pb-4 min-h-[3rem]">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00a859] to-[#00a859] flex items-center justify-center shadow-md shrink-0">
                  <tool.icon className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-slate-900 leading-snug line-clamp-2">{tool.title}</h3>
                  <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${tool.accentText}`}>{tool.badge}</p>
                </div>
              </div>

              {/* Row 2: flexible-height description */}
              <p className="text-slate-500 text-sm leading-relaxed h-full pb-5">
                {tool.description}
              </p>

              {/* Row 3: feature lists aligned across all cards */}
              <div className={`pt-4 border-t ${tool.accentBorder}`}>
                <ul className="space-y-3.5">
                  {tool.features.map((feat, fi) => (
                    <li key={fi} className="flex items-center gap-3 text-[13px] sm:text-sm text-slate-700 whitespace-nowrap">
                      <div className={`w-[18px] h-[18px] rounded-full bg-gradient-to-br ${tool.gradient} flex items-center justify-center flex-shrink-0`}>
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                      <span className="leading-none">{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Marquee lowered with balanced spacing above & below — temporarily hidden
      <div className="mt-10 lg:mt-12 mb-2">
        <div className="bg-[#EFEFEA] border-y border-slate-200/70 py-4 overflow-hidden">
          <div className="flex w-max animate-trust-marquee">
            {marqueeItems.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 mx-2 px-4 py-2 rounded-full bg-white border border-slate-200/80 shadow-sm text-sm font-medium text-slate-600 whitespace-nowrap"
              >
                <Sparkles className={`w-3.5 h-3.5 shrink-0 ${item.star}`} fill="currentColor" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
      */}
    </section>
  );
};

// ============================================================================
// HOW IT WORKS SECTION
// ============================================================================
const HowItWorksSection = () => {
  const steps = [
    { number: '01', title: 'Create Your Account', description: 'Sign up in seconds and get instant access to our AI-powered legal platform. No credit card required.' },
    { number: '02', title: 'Describe Your Query', description: 'Simply type your legal question in natural language. Our AI understands context and legal terminology.' },
    { number: '03', title: 'AI Analyzes & Researches', description: 'Our advanced AI processes your query, searches through millions of documents, and analyzes relevant cases.' },
    { number: '04', title: 'Get Expert Insights', description: 'Receive comprehensive, accurate answers with citations to relevant laws, cases, and precedents.' },
  ];

  return (
    <section id="how-it-works" className="py-6 lg:py-8 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="How It Works"
          title={<>Your Legal Journey Simplified</>}
          subtitle="Getting legal assistance has never been easier. Follow these simple steps to access world-class legal AI."
        />

        <div className="relative max-w-3xl mx-auto mt-20">
          {/* Vertical Line */}
          <div className="absolute left-6 md:left-1/2 top-4 bottom-4 w-0.5 bg-[#00a859]/25 -translate-x-1/2" />

          <div className="space-y-16">
            {steps.map((step, i) => {
              const isEven = i % 2 === 0;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 32 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ ...SCROLL_VIEWPORT, margin: '-100px' }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                  className={`relative flex items-center ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} flex-row`}
                >
                  {/* Content */}
                  <div className={`w-full md:w-1/2 pl-20 md:pl-0 ${isEven ? 'md:pr-20 md:text-right' : 'md:pl-20 md:text-left'}`}>
                    <h3 className="text-xl font-bold text-slate-900 mb-3">{step.title}</h3>
                    <p className="text-slate-500 leading-relaxed text-sm md:text-base">{step.description}</p>
                  </div>

                  {/* Center Marker */}
                  <div className="absolute left-6 md:left-1/2 -translate-x-1/2 flex items-center justify-center">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold shadow-md transition-colors duration-300 ${isEven
                      ? 'bg-[#00a859] text-white shadow-[#00a859]/25'
                      : 'bg-slate-900 text-white shadow-slate-900/25'
                      }`}>
                      {step.number}
                    </div>
                  </div>

                  {/* Empty space for the other side on desktop */}
                  <div className="hidden md:block md:w-1/2" />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// PRICING SECTION
// ============================================================================
const PricingSection = () => {
  const plans = [
    {
      name: 'Free',
      price: 'Rs 0',
      period: 'forever',
      description: 'Perfect for individuals exploring legal AI',
      features: ['50 AI queries per month', 'Basic case research', 'Standard response time', 'Email support', 'Web access only'],
      cta: 'Get Started Free',
      popular: false,
      accentGradient: 'from-slate-600 to-slate-800',
    },
    {
      name: 'Professional',
      price: 'Rs 2,999',
      period: 'per month',
      description: 'Ideal for legal professionals',
      features: ['Unlimited AI queries', 'Advanced case research', 'Priority response time', 'Document analysis (50/mo)', 'Priority support', 'Multi-platform access', 'Export capabilities'],
      cta: 'Start Free Trial',
      popular: true,
      accentGradient: 'from-[#00a859] to-[#00a859]',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: 'contact us',
      description: 'For law firms and organizations',
      features: ['Everything in Professional', 'Custom AI training', 'Dedicated account manager', 'API access', 'White-label options', 'Team collaboration', 'Advanced analytics', 'SLA guarantee'],
      cta: 'Contact Sales',
      popular: false,
      accentGradient: 'from-slate-600 to-slate-800',
    },
  ];

  return (
    <section id="pricing" className="py-6 lg:py-8 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="Pricing"
          title={<>Simple, Transparent<br /><span className="text-[#00a859]">Pricing Plans</span></>}
          subtitle="Choose the plan that fits your needs. All plans include access to our core AI features with no hidden fees."
        />

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={SCROLL_VIEWPORT}
              transition={{ delay: i * 0.12, duration: 0.5 }}
              className={`relative ${plan.popular ? 'md:-mt-6' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 inset-x-0 flex justify-center z-10">
                  <span className="px-4 py-1.5 bg-gradient-to-r from-[#00a859] to-[#00a859] text-white text-xs font-bold rounded-full shadow-lg shadow-[#00a859]/30 uppercase tracking-wide">
                    Most Popular
                  </span>
                </div>
              )}
              <div className={`h-full rounded-3xl border overflow-hidden shadow-sm transition-all duration-300 ${plan.popular
                ? 'border-[#00a859] shadow-xl shadow-[#00a859]/12 hover:shadow-[#00a859]/20'
                : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}>
                <div className={`h-1.5 bg-gradient-to-r ${plan.accentGradient}`} />
                <div className="bg-white p-8 h-full flex flex-col">
                  <div className="mb-5">
                    <h3 className="text-xl font-extrabold text-slate-900 mb-1">{plan.name}</h3>
                    <p className="text-sm text-slate-500">{plan.description}</p>
                  </div>
                  <div className="pb-6 mb-6 border-b border-slate-100">
                    <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                    <span className="text-slate-400 text-sm ml-1.5">/ {plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((feat, fi) => (
                      <li key={fi} className="flex items-center gap-3 text-sm text-slate-600">
                        <div className="w-5 h-5 rounded-full bg-[#00a859]/15 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-[#00a859]" />
                        </div>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <button className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-300 ${plan.popular
                    ? 'bg-gradient-to-r from-[#00a859] to-[#00a859] text-white shadow-md shadow-[#00a859]/20 hover:shadow-[#00a859]/40 hover:from-[#00a859] hover:to-[#00a859]'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                    }`}>
                    {plan.cta}
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// TESTIMONIALS — Trusted by the Highest Offices
// ============================================================================
const StarRating = ({ rating, size = 'w-4 h-4' }: { rating: number; size?: string }) => (
  <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {Array.from({ length: 5 }).map((_, i) => {
      const fill = Math.min(1, Math.max(0, rating - i));
      return (
        <span key={i} className={`relative inline-block ${size}`}>
          <Star className={`${size} text-slate-200 fill-slate-200`} />
          <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
            <Star className={`${size} text-[#00a859] fill-emerald-500`} />
          </span>
        </span>
      );
    })}
  </div>
);

const TestimonialsSection = () => {
  const testimonials = [
    {
      initials: 'JS',
      name: 'Justice Safdar Saleem Shahid',
      quote: 'JudicialGPT represents a meaningful step toward modernizing legal research in Pakistan. Its ability to surface relevant case law and precedents can significantly support judicial officers and practitioners alike.',
    },
    {
      initials: 'BA',
      name: 'Bahadur Ali Khan',
      quote: 'Having served as Registrar of the Lahore High Court, I recognize the value of tools that streamline legal document analysis. JudicialGPT offers practical support for research and case preparation at the highest standards.',
    },
    {
      initials: 'DA',
      name: 'Dr. Abdul Nasir',
      quote: 'Efficient access to accurate legal information is essential for timely justice. JudicialGPT provides a reliable platform that assists courts and legal professionals in navigating complex legal research with confidence.',
    },
  ];

  return (
    <section id="testimonials" className="relative py-6 lg:py-8 bg-[#F7FAF8] overflow-hidden">
      <div className="absolute top-0 left-1/3 w-[420px] h-[420px] rounded-full bg-[#00a859]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[360px] h-[360px] rounded-full bg-[#00a859]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={SCROLL_VIEWPORT}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center max-w-3xl mx-auto mb-12 lg:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.16em] mb-6 bg-white text-[#00a859] border border-[#00a859]/25 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#00a859]" />
            Peer-Validated Intelligence
          </div>
          <h2 className="font-heading text-4xl sm:text-5xl md:text-[3.35rem] font-semibold text-slate-900 leading-[1.15] tracking-tight mb-5">
            Trusted by the{' '}
            <span className="italic font-medium bg-gradient-to-r from-[#00a859] via-[#00a859] to-[#00a859] bg-clip-text text-transparent">
              Highest Offices
            </span>
          </h2>
          <p className="font-body text-xl md:text-[1.35rem] text-slate-500 leading-[1.8] max-w-2xl mx-auto">
            Revolutionizing Pakistani legal research through the intersection of judicial wisdom and generative AI.
          </p>
        </motion.div>

        {/* 3-column grid for testimonials */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-8 lg:items-stretch">
          {testimonials.map((t, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={SCROLL_VIEWPORT}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={{
                y: -5,
                boxShadow: '0 16px 36px rgba(16, 185, 129, 0.20), 0 6px 16px rgba(16, 185, 129, 0.10)',
                transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] },
              }}
              className="group relative flex flex-col rounded-[1.25rem] border border-slate-100 hover:border-[#00a859]/25 bg-white p-8 md:p-10 gap-6 h-full overflow-hidden"
              style={{
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.07)',
                transition: 'box-shadow 0.38s ease, transform 0.38s ease',
              }}
            >
              {/* Animated green bottom line */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#00a859] to-[#00a859] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

              <div className="flex items-center gap-1 shrink-0">
                <StarRating rating={5} size="w-5 h-5" />
              </div>
              <p className="font-body text-sm md:text-base italic text-slate-500 leading-relaxed flex-1">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-4 mt-2 shrink-0">
                <div className="w-11 h-11 rounded-full bg-[#00a859] flex items-center justify-center text-white font-bold text-[13px] shrink-0">
                  {t.initials}
                </div>
                <p className="font-heading font-semibold text-slate-800 text-sm">{t.name}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// ANIMATED MISSION CHAT WIDGET
// ============================================================================
const AnimatedMissionChatWidget = () => {
  const [convoIndex, setConvoIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(false);
  const [buttonClicked, setButtonClicked] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [responseStream, setResponseStream] = useState('');

  const conversations = [
    {
      query: "How many legal documents has JudicialGPT analyzed so far?",
      response: "JudicialGPT has successfully analyzed over 2.4 million legal documents, helping users understand contracts, agreements, and legal paperwork faster and more accurately.",
    },
    {
      query: "How many users rely on JudicialGPT?",
      response: "We are incredibly proud to support a growing community of over 10,000 happy users, empowering them with instant and reliable legal intelligence.",
    },
  ];
  useEffect(() => {
    let isActive = true;

    const runSequence = async () => {
      while (isActive) {
        const current = conversations[convoIndex];

        setTypedText('');
        setShowResponse(false);
        setResponseStream('');
        setButtonClicked(false);
        setShowCursor(false);

        await new Promise((r) => setTimeout(r, 800));
        for (let i = 0; i <= current.query.length; i++) {
          if (!isActive) return;
          setTypedText(current.query.slice(0, i));
          await new Promise((r) => setTimeout(r, 20 + Math.random() * 30));
        }

        if (!isActive) return;
        await new Promise((r) => setTimeout(r, 400));
        setShowCursor(true);
        await new Promise((r) => setTimeout(r, 600));
        setButtonClicked(true);
        await new Promise((r) => setTimeout(r, 150));
        setButtonClicked(false);
        setShowCursor(false);

        await new Promise((r) => setTimeout(r, 300));
        if (!isActive) return;
        setShowResponse(true);

        for (let i = 0; i <= current.response.length; i++) {
          if (!isActive) return;
          setResponseStream(current.response.slice(0, i));
          await new Promise((r) => setTimeout(r, 15 + Math.random() * 20));
        }

        await new Promise((r) => setTimeout(r, 3000));

        if (!isActive) return;
        setConvoIndex((prev) => (prev + 1) % conversations.length);
      }
    };

    runSequence();
    return () => { isActive = false; };
  }, [convoIndex]);

  return (
    <div className="relative w-full max-w-2xl xl:max-w-3xl mx-auto bg-slate-900 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-[#00a859]/15 text-left">
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff1a_1px,transparent_1px)] [background-size:24px_24px] rounded-[2rem] opacity-20" />

      <div className="relative z-10 flex flex-col gap-8 min-h-[440px] overflow-hidden">
        {/* Search Input */}
        <div className="relative flex items-center bg-white rounded-2xl shadow-lg border border-slate-100 p-5 md:p-6 shrink-0">
          <Search className="w-7 h-7 text-slate-400 mr-4 shrink-0" />

          <div className="flex-1 text-slate-800 font-medium text-lg md:text-xl min-h-[2rem] flex items-center">
            <span className="whitespace-pre-wrap leading-snug">
              {typedText}
              {!showResponse && <span className="w-0.5 h-6 bg-[#00a859] animate-pulse ml-0.5 inline-block align-middle" />}
            </span>
          </div>

          <div className={`shrink-0 ml-5 w-12 h-12 rounded-full flex items-center justify-center transition-colors ${buttonClicked ? 'bg-slate-100' : 'bg-transparent'}`}>
            <ArrowRight className="w-7 h-7 text-slate-400" />
          </div>

          <AnimatePresence>
            {showCursor && (
              <motion.div
                initial={{ x: -100, y: 120, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="absolute right-4 bottom-1 z-50 pointer-events-none"
                style={{ originX: 0, originY: 0 }}
              >
                <svg width="32" height="32" viewBox="0 0 24 24" fill="black" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
                  <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.43c.45 0 .67-.54.35-.85L6.35 3.35a.5.5 0 00-.85.35z" fill="black" stroke="white" strokeWidth="1.5" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Results */}
        <div className="flex-1">
          <AnimatePresence mode="popLayout">
            {showResponse && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col gap-5"
              >
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00a859] to-[#00a859] flex items-center justify-center shrink-0 shadow-lg shadow-[#00a859]/30">
                    <Scale className="w-6 h-6 text-white" />
                  </div>
                  <div className="bg-white/10 backdrop-blur-md border border-white/10 text-white text-lg md:text-xl leading-relaxed p-6 md:p-8 rounded-2xl rounded-tl-sm shadow-inner min-h-[6rem]">
                    {responseStream}
                    {responseStream.length < conversations[convoIndex].response.length && (
                      <span className="w-2 h-5 bg-[#00a859] animate-pulse ml-1 inline-block align-middle" />
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ABOUT / MISSION SECTION
// ============================================================================
const AboutSection = () => (
  <section id="about" className="py-6 lg:py-8 bg-white">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={SCROLL_VIEWPORT}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] bg-[#00a859]/10 text-[#00a859] border border-[#00a859]/25 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00a859]" />
            Our Mission
          </div>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-[3.15rem] font-semibold text-slate-900 leading-[1.12] mb-6">
            Making Legal Help<br />
            <span className="text-[#00a859]">Accessible to All</span>
          </h2>
          <p className="text-slate-500 text-lg leading-relaxed mb-4">
            We believe that everyone deserves access to quality legal assistance. Our mission is to democratize legal knowledge by leveraging cutting-edge AI technology to make legal research, consultation, and document analysis accessible and affordable for everyone.
          </p>
          <p className="text-slate-500 text-lg leading-relaxed mb-8">
            Built by a team of legal experts, AI researchers, and software engineers, JudicialGPT combines the best of human expertise with artificial intelligence to deliver accurate, reliable, and instant legal support.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: Shield, label: 'Privacy First' },
              { icon: Clock, label: '24/7 Available' },
              { icon: Target, label: 'Highest Benchmark' },
              { icon: Users, label: 'Expert Support' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-[#00a859]/25 hover:bg-[#00a859]/10/40 transition-all duration-200">
                <div className="w-9 h-9 rounded-lg bg-[#00a859]/15 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-[#00a859]" />
                </div>
                <span className="text-slate-800 font-semibold text-sm">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Right — Animated Mission Chat */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={SCROLL_VIEWPORT}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          className="relative lg:pl-10"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-[#00a859]/20 to-[#00a859]/10 rounded-3xl blur-3xl" />
          <div className="relative">
            <AnimatedMissionChatWidget />
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

// ============================================================================
// LEGAL INTELLIGENCE DASHBOARD — above Team
// ============================================================================
const IntelligenceDashboardSection = () => {
  const hasMounted = useHasMounted();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.2, margin: '0px 0px -8% 0px' });
  const isInView = hasMounted && inView;

  const integrity = [
    { label: 'Highest Benchmark', value: 96, color: 'from-[#00a859] to-[#00a859]' },
    { label: 'Privacy First', value: 98, color: 'from-[#00a859] to-cyan-500' },
    { label: 'Expert Support', value: 92, color: 'from-blue-500 to-indigo-500' },
    { label: '24/7 Available', value: 99, color: 'from-violet-500 to-purple-500' },
  ];

  const i0 = useCountUp(isInView, integrity[0].value, 1200);
  const i1 = useCountUp(isInView, integrity[1].value, 1300);
  const i2 = useCountUp(isInView, integrity[2].value, 1400);
  const i3 = useCountUp(isInView, integrity[3].value, 1500);
  const integrityValues = [i0, i1, i2, i3];

  const distribution = [
    { label: 'Legal Research', pct: 36, color: '#00a859' },
    { label: 'Case Analysis', pct: 30, color: '#14b8a6' },
    { label: 'Document Review', pct: 20, color: '#3b82f6' },
    { label: 'Legal Analysis', pct: 14, color: '#8b5cf6' },
  ];

  const insights = [
    {
      title: 'JudicialGPT AI Chatbot',
      badge: 'Core Tool',
      status: 'Active',
      statusColor: 'bg-[#00a859]/10 text-[#00a859] border-[#00a859]/25',
      accent: 'bg-[#00a859]',
      text: 'Our AI chatbot is trained on an extensive database of legal cases and can fetch real-time updates including new judgments and amendments.',
    },
    {
      title: 'Case Prism — Research Tool',
      badge: 'Research',
      status: 'Live',
      statusColor: 'bg-blue-50 text-blue-700 border-blue-200',
      accent: 'bg-blue-500',
      text: 'Access our proprietary legal research tool for comprehensive case analysis. Search through millions of cases, statutes, and legal documents.',
    },
  ];

  // Documents Analyzed chart — values in hundreds of thousands (display as M)
  const chartPoints = [
    { label: 'Jan', research: 1.1, analysis: 0.7 },
    { label: 'Feb', research: 1.35, analysis: 0.85 },
    { label: 'Mar', research: 1.2, analysis: 0.95 },
    { label: 'Apr', research: 1.65, analysis: 1.1 },
    { label: 'May', research: 1.85, analysis: 1.25 },
    { label: 'Jun', research: 2.05, analysis: 1.4 },
    { label: 'Jul', research: 2.4, analysis: 1.55 },
  ];
  const chartW = 520;
  const chartH = 160;
  const padL = 48;
  const padR = 16;
  const padT = 22;
  const padB = 28;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const yMax = 2.5;
  const toX = (i: number) => padL + (i / (chartPoints.length - 1)) * plotW;
  const toY = (v: number) => padT + plotH * (1 - v / yMax);
  const researchCoords = chartPoints.map((p, i) => ({ x: toX(i), y: toY(p.research), v: p.research }));
  const analysisCoords = chartPoints.map((p, i) => ({ x: toX(i), y: toY(p.analysis), v: p.analysis }));
  const lineFrom = (coords: { x: number; y: number }[]) =>
    coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const areaFrom = (coords: { x: number; y: number }[]) => {
    const line = lineFrom(coords);
    const last = coords[coords.length - 1];
    const first = coords[0];
    return `${line} L${last.x.toFixed(1)},${(padT + plotH).toFixed(1)} L${first.x.toFixed(1)},${(padT + plotH).toFixed(1)} Z`;
  };
  const researchPath = lineFrom(researchCoords);
  const researchArea = areaFrom(researchCoords);
  const analysisPath = lineFrom(analysisCoords);
  const yTicks = [0.5, 1.0, 1.5, 2.0, 2.5];

  const cardHover = (glow: string) =>
    hasMounted
      ? {
        y: -5,
        scale: 1.01,
        boxShadow: `0 16px 36px rgba(16, 185, 129, 0.18), 0 4px 12px rgba(16, 185, 129, 0.10)`,
        transition: { duration: 0.35, ease: 'easeOut' as const },
      }
      : undefined;

  const donutR = 54;
  const donutC = 339.292; // 2 * Math.PI * 54, fixed for hydration safety
  let running = 0;
  const donutSegments = distribution.map((seg) => {
    const len = (seg.pct / 100) * donutC;
    const segment = { ...seg, len, offset: -running };
    running += len;
    return segment;
  });

  return (
    <section
      ref={sectionRef}
      id="intelligence"
      className="py-6 lg:py-8 bg-[#F7FAF8] relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full bg-[#00a859]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[360px] h-[360px] rounded-full bg-[#00a859]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={SCROLL_VIEWPORT}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-2xl mb-10 lg:mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-5 bg-[#00a859]/10 text-[#00a859] border border-[#00a859]/25">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00a859] animate-pulse" />
            AI-Powered Legal Intelligence Platform
          </div>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-[3.15rem] font-semibold leading-[1.12] tracking-tight text-slate-900 mb-4">
            Legal Intelligence<br />
            <span className="text-[#00a859]">Dashboard</span>
          </h2>
          <p className="text-lg leading-relaxed text-slate-500">
            Experience the power of AI tools designed specifically for legal professionals and individuals seeking legal guidance.
          </p>
        </motion.div>

        {/* Top row */}
        <div className="grid lg:grid-cols-3 gap-4 lg:gap-5 mb-4 lg:mb-5">
          {/* Large chart card */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={SCROLL_VIEWPORT}
            transition={{ duration: 0.5 }}
            whileHover={cardHover('rgba(16, 185, 129, 0.28)')}
            className="lg:col-span-2 relative rounded-[1.75rem] border border-[#00a859]/15 bg-white p-6 md:p-8 overflow-hidden"
            style={{ boxShadow: '0 10px 36px rgba(16, 185, 129, 0.08)' }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">Documents Analyzed</p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">2.4M</span>
                  <span className="text-sm font-semibold text-[#00a859] mb-1.5">Legal Documents</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00a859]" /> Legal Research
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#00a859]" /> Case Analysis
                </span>
              </div>
            </div>

            <div className="relative w-full">
              <svg
                viewBox={`0 0 ${chartW} ${chartH}`}
                className="w-full h-44 md:h-52"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label="Documents analyzed over time chart"
              >
                <defs>
                  <linearGradient id="intelArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00a859" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#00a859" stopOpacity="0" />
                  </linearGradient>
                  <clipPath id="intelClip">
                    <motion.rect
                      x={padL}
                      y={0}
                      height={chartH}
                      initial={{ width: 0 }}
                      animate={{ width: isInView ? plotW + padR : 0 }}
                      transition={{ duration: 1.45, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </clipPath>
                </defs>

                {/* Horizontal grid + Y-axis labels */}
                {yTicks.map((tick) => {
                  const y = toY(tick);
                  const tickLabel = Number.isInteger(tick) ? `${tick}M` : `${tick.toFixed(1)}M`;
                  return (
                    <g key={tick}>
                      <line
                        x1={padL}
                        x2={chartW - padR}
                        y1={y}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeWidth="1"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={padL - 10}
                        y={y + 3.5}
                        textAnchor="end"
                        fill="#94a3b8"
                        style={{ fontSize: 10, fontWeight: 600 }}
                      >
                        {tickLabel}
                      </text>
                    </g>
                  );
                })}

                {/* Clipped animated series (draws L→R) — lines & points only */}
                <g clipPath="url(#intelClip)">
                  <path d={researchArea} fill="url(#intelArea)" />
                  <path
                    d={analysisPath}
                    fill="none"
                    stroke="#2dd4bf"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="5 4"
                    opacity="0.9"
                  />
                  <path
                    d={researchPath}
                    fill="none"
                    stroke="#00a859"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {analysisCoords.map((c, i) => (
                    <circle
                      key={`a-${i}`}
                      cx={c.x}
                      cy={c.y}
                      r="3.5"
                      fill="#fff"
                      stroke="#2dd4bf"
                      strokeWidth="2"
                    />
                  ))}

                  {researchCoords.map((c, i) => (
                    <circle
                      key={`r-${i}`}
                      cx={c.x}
                      cy={c.y}
                      r="4.5"
                      fill="#fff"
                      stroke="#00a859"
                      strokeWidth="2.5"
                    />
                  ))}
                </g>

                {/* Value labels outside clipPath so they are never cropped */}
                {researchCoords.map((c, i) => {
                  const isFirst = i === 0;
                  const isLast = i === researchCoords.length - 1;
                  const label = `${c.v.toFixed(1)}M`;
                  // First point sits on the axis — nudge label right so "1.1M" / nearby "1M" stay readable
                  const lx = isFirst ? c.x + 10 : isLast ? c.x - 4 : c.x;
                  const anchor = isFirst ? 'start' : isLast ? 'end' : 'middle';
                  return (
                    <motion.text
                      key={`lbl-${i}`}
                      x={lx}
                      y={c.y - 11}
                      textAnchor={anchor}
                      fill="#0f172a"
                      style={{ fontSize: 11, fontWeight: 700 }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isInView ? 1 : 0 }}
                      transition={{ delay: 0.55 + i * 0.08, duration: 0.35, ease: 'easeOut' }}
                    >
                      {label}
                    </motion.text>
                  );
                })}

                {/* X-axis month labels */}
                {chartPoints.map((p, i) => (
                  <text
                    key={p.label}
                    x={toX(i)}
                    y={chartH - 8}
                    textAnchor="middle"
                    fill="#94a3b8"
                    style={{ fontSize: 10, fontWeight: 600 }}
                  >
                    {p.label}
                  </text>
                ))}
              </svg>
            </div>
          </motion.div>

          {/* Right stack */}
          <div className="flex flex-col gap-4 lg:gap-5">
            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={SCROLL_VIEWPORT}
              transition={{ duration: 0.5, delay: 0.08 }}
              whileHover={cardHover('rgba(20, 184, 166, 0.28)')}
              className="flex-1 rounded-[1.5rem] border border-slate-200 bg-white p-5 md:p-6"
              style={{ boxShadow: '0 8px 24px rgba(16, 185, 129, 0.08)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-extrabold text-slate-900">System Integrity</h3>
                <Target className="w-4 h-4 text-[#00a859]" />
              </div>
              <div className="space-y-3.5">
                {integrity.map((item, i) => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-medium text-slate-500">{item.label}</span>
                      <span className="text-xs font-bold tabular-nums text-slate-800">{integrityValues[i]}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                        style={{
                          width: isInView ? `${item.value}%` : '0%',
                          transition: hasMounted
                            ? `width ${1.1 + i * 0.12}s cubic-bezier(0.22, 1, 0.36, 1) ${0.1 + i * 0.08}s`
                            : 'none',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={SCROLL_VIEWPORT}
              transition={{ duration: 0.5, delay: 0.14 }}
              whileHover={cardHover('rgba(16, 185, 129, 0.28)')}
              className="rounded-[1.5rem] border border-[#00a859]/15 bg-white p-5 md:p-6"
              style={{ boxShadow: '0 8px 24px rgba(16, 185, 129, 0.10)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Platform Status</p>
                  <h3 className="text-2xl font-black text-slate-900">Operational</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00a859] to-[#00a859] flex items-center justify-center shadow-md">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                24/7 AI Availability — secure and confidential assistance for every legal query.
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#00a859]">
                <span className="w-2 h-2 rounded-full bg-[#00a859] animate-pulse" />
                Highest Accuracy Rate
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="grid lg:grid-cols-2 gap-4 lg:gap-5">
          {/* Donut distribution */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={SCROLL_VIEWPORT}
            transition={{ duration: 0.5, delay: 0.1 }}
            whileHover={cardHover('rgba(16, 185, 129, 0.18)')}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-6 md:p-8"
            style={{ boxShadow: '0 8px 24px rgba(16, 185, 129, 0.08)' }}
          >
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Case Distribution by Category</h3>
            <p className="text-sm text-slate-500 mb-6">Transforming Legal Research, Case Analysis, Document Review & Legal Analysis</p>

            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="relative w-40 h-40 shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={donutR} fill="none" stroke="#e2e8f0" strokeWidth="14" />
                  {donutSegments.map((seg) => (
                    <circle
                      key={seg.label}
                      cx="70"
                      cy="70"
                      r={donutR}
                      fill="none"
                      stroke={seg.color}
                      strokeWidth="14"
                      strokeLinecap="butt"
                      strokeDasharray={`${isInView ? seg.len : 0} ${donutC}`}
                      strokeDashoffset={seg.offset}
                      style={{
                        transition: hasMounted
                          ? 'stroke-dasharray 1.2s cubic-bezier(0.22, 1, 0.36, 1)'
                          : 'none',
                      }}
                    />
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-3">
                  <span className="text-2xl font-black text-slate-900">10K</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Users</span>
                </div>
              </div>

              <ul className="flex-1 w-full space-y-3">
                {distribution.map((seg) => (
                  <li key={seg.label} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-sm font-medium text-slate-700 truncate">{seg.label}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 tabular-nums">{seg.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Insights */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={SCROLL_VIEWPORT}
            transition={{ duration: 0.5, delay: 0.16 }}
            whileHover={cardHover('rgba(16, 185, 129, 0.18)')}
            className="rounded-[1.75rem] border border-slate-200 bg-white p-6 md:p-8"
            style={{ boxShadow: '0 8px 24px rgba(16, 185, 129, 0.08)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-extrabold text-slate-900">Critical AI Insights</h3>
              <Sparkles className="w-4 h-4 text-[#00a859]" />
            </div>
            <div className="space-y-4">
              {insights.map((item) => (
                <div
                  key={item.title}
                  className="relative rounded-2xl border border-slate-100 bg-slate-50/80 p-4 pl-5 overflow-hidden"
                >
                  <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${item.accent}`} />
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{item.title}</h4>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">{item.badge}</p>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide px-2.5 py-1 rounded-full border ${item.statusColor}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};


// ============================================================================
// TEAM SECTION — Matches Reference Design with Interactive Spotlight Card
// ============================================================================
const CornerFiligree = ({ position }: { position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) => {
  const rotation = {
    'top-left': '',
    'top-right': 'rotate-90',
    'bottom-left': '-rotate-90',
    'bottom-right': 'rotate-180',
  }[position];

  const posClass = {
    'top-left': 'top-2.5 left-2.5',
    'top-right': 'top-2.5 right-2.5',
    'bottom-left': 'bottom-2.5 left-2.5',
    'bottom-right': 'bottom-2.5 right-2.5',
  }[position];

  return (
    <div className={`absolute ${posClass} ${rotation} pointer-events-none text-[#d4af37]`}>
      <svg className="w-5 h-5 opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M4 12V4h8" />
        <path d="M4 4l6 6" />
        <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      </svg>
    </div>
  );
};

const FOUNDER_MEMBER = {
  id: 'usman',
  name: 'Prof. Dr. M. Usman Ghani Khan',
  role: 'Founder',
  badge: 'FOUNDER',
  tag: 'Founder & Vision',
  icon: Landmark,
  bio: 'Founded JudicialGPT to make quality legal assistance accessible through AI. Sets company strategy, product vision, and partnerships while guiding the team to build trustworthy and impactful solutions.',
  photoUrl: '/DR_Usman.jpeg',
};

const OTHER_MEMBERS = [
  {
    id: 'ayesha',
    name: 'Ayesha Azam',
    role: 'Team Lead',
    badge: 'TEAM LEAD',
    tag: 'Leadership & Strategy',
    icon: Users,
    bio: 'Coordinates engineering delivery, sprint planning, and cross-functional collaboration to ship reliable AI-powered legal features on time and at scale.',
    photoUrl: '/Ayesha.png',
  },
  {
    id: 'ali',
    name: 'Syed Ali Hassan',
    role: 'Lead Developer / AI Engineer',
    badge: 'LEAD DEVELOPER / AI ENGINEER',
    tag: 'AI Engineering & Development',
    icon: Code,
    bio: 'Architects the full-stack platform and fine-tunes AI models for legal document analysis, case summarization, and intelligent query responses.',
    photoUrl: '/ali.jpg',
  },
  {
    id: 'laiba',
    name: 'Laiba Saleem',
    role: 'Data Analyst',
    badge: 'DATA ANALYST',
    tag: 'Data Analysis & Insights',
    icon: BarChart3,
    bio: 'Analyzes user engagement metrics, legal dataset patterns, and AI model performance to drive data-informed product decisions and improvements.',
    photoUrl: '/laiba.png',
  },
  {
    id: 'zubaid',
    name: 'Zubaid Rasool',
    role: 'Full-Stack & DevOps Engineer',
    badge: 'FULL-STACK & DEVOPS',
    tag: 'Full-Stack & DevOps',
    icon: Cloud,
    bio: 'Builds and maintains frontend and backend features while managing CI/CD pipelines, server infrastructure, and deployment workflows on the cloud.',
    photoUrl: '/Zubaid.png',
  },
  {
    id: 'nasir',
    name: 'Dr. Abdul Nasir',
    role: 'Legal Domain Expert',
    badge: 'LEGAL DOMAIN EXPERT',
    tag: 'Legal Research & Domain Expertise',
    icon: Scale,
    bio: 'A legal practitioner providing judicial domain expertise to validate legal accuracy, guide court-relevant content, and ensure JudicialGPT meets professional standards.',
    photoUrl: '/dr_abdul_nasir.jpg',
  },
];

const TeamSection = () => {
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedMemberId((prev) => (prev === id ? null : id));
  };

  return (
    <section id="team" className="relative py-12 sm:py-16 bg-[#FBFBFA] border-t border-slate-200/80 overflow-hidden">
      {/* Background laurel subtle watermark */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-[#0c7a4b]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header matching reference */}
        <div className="text-center mb-10 sm:mb-12 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={SCROLL_VIEWPORT}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            {/* Top gold scales icon */}
            <div className="text-[#b89548] mb-1.5 flex items-center justify-center">
              <Scale className="w-5 h-5 stroke-[2]" />
            </div>

            {/* Eyebrow with gold bars and dots */}
            <div className="flex items-center justify-center gap-2 sm:gap-2.5 text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-[0.2em] text-[#054332] mb-2">
              <span className="w-6 sm:w-10 h-[1.5px] bg-[#b89548]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#b89548]" />
              <span>THE PEOPLE BEHIND JUDICIALGPT</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#b89548]" />
              <span className="w-6 sm:w-10 h-[1.5px] bg-[#b89548]" />
            </div>

            {/* Main title */}
            <h2 className="font-hero-serif text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Meet Our Team
            </h2>

            {/* Gold ornate flourish */}
            <div className="flex items-center justify-center gap-2 text-[#b89548] mt-2.5">
              <span className="w-10 h-[1px] bg-[#b89548]/50" />
              <span className="text-[10px]">❖</span>
              <span className="w-10 h-[1px] bg-[#b89548]/50" />
            </div>
          </motion.div>
        </div>

        {/* Main Content Layout: Left Founder Card + Right 5-Card Grid */}
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 items-stretch justify-center">
          
          {/* Left Column: Fixed Founder Green Card (Proportional & Spans Full Height) */}
          <div className="w-full lg:w-[270px] xl:w-[285px] shrink-0 flex">
            <div className="relative rounded-[22px] bg-gradient-to-b from-[#054332] via-[#043d2d] to-[#02281e] p-2.5 shadow-[0_16px_40px_rgba(4,61,45,0.22)] border-2 border-[#b89548]/40 w-full flex flex-col justify-between overflow-hidden">
              {/* Gold Corner Filigrees */}
              <CornerFiligree position="top-left" />
              <CornerFiligree position="top-right" />
              <CornerFiligree position="bottom-left" />
              <CornerFiligree position="bottom-right" />

              {/* Inner container */}
              <div className="border border-[#b89548]/35 rounded-[18px] p-4 sm:p-5 flex flex-col items-center text-center relative z-10 h-full justify-between">
                <div className="flex flex-col items-center w-full my-auto">
                  {/* Founder avatar photo */}
                  <div className="relative mb-3">
                    <div className="w-28 h-28 sm:w-30 sm:h-30 rounded-full overflow-hidden border-2 border-[#b89548]/70 shadow-xl bg-slate-900 p-0.5">
                      <img
                        src={FOUNDER_MEMBER.photoUrl}
                        alt={FOUNDER_MEMBER.name}
                        className="w-full h-full object-cover object-top rounded-full"
                      />
                    </div>
                  </div>

                  {/* Emblem */}
                  <div className="flex items-center justify-center text-[#d4af37] mb-1.5">
                    <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#b89548]/15 border border-[#b89548]/30">
                      <Landmark className="w-3.5 h-3.5 text-[#d4af37]" />
                    </div>
                  </div>

                  {/* Founder Name */}
                  <h3 className="font-hero-serif text-lg sm:text-[19px] font-bold text-white tracking-tight leading-snug mb-0.5">
                    {FOUNDER_MEMBER.name}
                  </h3>

                  {/* Role / Badge */}
                  <div className="text-[#d4af37] text-[10px] font-bold tracking-[0.2em] uppercase mb-2 flex items-center gap-1.5">
                    <span className="w-2.5 h-[1px] bg-[#d4af37]/60" />
                    <span>{FOUNDER_MEMBER.badge}</span>
                    <span className="w-2.5 h-[1px] bg-[#d4af37]/60" />
                  </div>

                  {/* Divider */}
                  <div className="w-12 h-[1px] bg-[#b89548]/40 mb-2.5 mx-auto" />

                  {/* Founder Bio Description */}
                  <p className="text-white/85 text-[11px] sm:text-[11.5px] leading-relaxed font-sans text-center">
                    {FOUNDER_MEMBER.bio}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 5 Member Cards Grid (Exact 3-Col Layout: Row 1 has 3 cards, Row 2 has 2 cards) */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {OTHER_MEMBERS.map((member) => {
              const IconComponent = member.icon;
              const isExpanded = expandedMemberId === member.id;

              return (
                <motion.div
                  key={member.id}
                  whileHover={{ y: -3 }}
                  className="group relative rounded-[20px] bg-white border border-slate-100/90 p-4 sm:p-4.5 flex flex-col items-center text-center transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-lg overflow-hidden min-h-[235px] max-h-[245px] justify-between cursor-pointer"
                  onClick={() => toggleExpand(member.id)}
                >
                  {/* ── DEFAULT STATE (Exact Match to Reference Picture) ── */}
                  <div className="flex flex-col items-center w-full h-full justify-between">
                    {/* Plus (+) Action Button on Top Right */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(member.id);
                      }}
                      aria-label={`View details of ${member.name}`}
                      className={`absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 shadow-sm z-10 ${
                        isExpanded
                          ? 'bg-[#0c7a4b] text-white'
                          : 'bg-[#0c7a4b]/10 text-[#0c7a4b] hover:bg-[#0c7a4b] hover:text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>

                    {/* Avatar with circular ring */}
                    <div className="relative mb-2">
                      <div className="w-20 h-20 sm:w-[84px] sm:h-[84px] rounded-full overflow-hidden border border-[#0c7a4b]/25 shadow-sm bg-slate-50 p-0.5">
                        <img
                          src={member.photoUrl}
                          alt={member.name}
                          className="w-full h-full object-cover object-top rounded-full"
                        />
                      </div>
                    </div>

                    {/* Name */}
                    <h3 className="font-hero-serif text-[14.5px] sm:text-[15px] font-bold text-slate-900 leading-snug group-hover:text-[#0c7a4b] transition-colors">
                      {member.name}
                    </h3>

                    {/* Role */}
                    <p className="text-[11px] sm:text-[11.5px] text-slate-500 font-medium mt-0.5 mb-2">
                      {member.role}
                    </p>

                    {/* Tag pill at bottom */}
                    <div className="mt-auto px-2.5 py-0.5 rounded-full bg-[#0c7a4b]/8 border border-[#0c7a4b]/15 text-[#0c7a4b] text-[10px] sm:text-[10.5px] font-semibold flex items-center gap-1">
                      <IconComponent className="w-3 h-3 shrink-0" />
                      <span>{member.tag}</span>
                    </div>
                  </div>

                  {/* ── EXPANDED / HOVER GREEN OVERLAY ── */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-b from-[#054332] via-[#043d2d] to-[#02281e] p-3.5 flex flex-col items-center justify-between text-center z-20 transition-all duration-300 ease-out border-2 border-[#b89548]/40 ${
                      isExpanded
                        ? 'opacity-100 translate-y-0 pointer-events-auto'
                        : 'opacity-0 translate-y-full group-hover:translate-y-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
                    }`}
                  >
                    {/* Corner filigrees */}
                    <CornerFiligree position="top-left" />
                    <CornerFiligree position="top-right" />
                    <CornerFiligree position="bottom-left" />
                    <CornerFiligree position="bottom-right" />

                    {/* Close button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedMemberId(null);
                      }}
                      className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-white/15 text-[#d4af37] hover:bg-white/25 flex items-center justify-center transition-colors z-30"
                      title="Close"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {/* Compact Member Header */}
                    <div className="flex items-center gap-2 w-full pr-5 pt-0.5">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-[#b89548]/60 shrink-0 shadow-md">
                        <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover object-top" />
                      </div>
                      <div className="text-left min-w-0">
                        <h4 className="font-hero-serif text-xs sm:text-[13px] font-bold text-white truncate leading-tight">
                          {member.name}
                        </h4>
                        <p className="text-[#d4af37] text-[9.5px] font-bold uppercase tracking-wider truncate">
                          {member.role}
                        </p>
                      </div>
                    </div>

                    {/* Bio Description */}
                    <div className="my-auto py-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-h-[110px]">
                      <p className="text-white/90 text-[10px] sm:text-[10.5px] leading-snug font-sans text-left">
                        {member.bio}
                      </p>
                    </div>

                    {/* Bottom Tag */}
                    <div className="px-2.5 py-0.5 rounded-full bg-[#b89548]/15 border border-[#b89548]/30 text-[#d4af37] text-[9.5px] font-semibold flex items-center gap-1 shrink-0">
                      <IconComponent className="w-2.5 h-2.5" />
                      <span>{member.tag}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

        </div>
      </div>
    </section>
  );
};

// ============================================================================
// CTA SECTION
// ============================================================================
const CTASection = () => {
  const router = useRouter();

  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={SCROLL_VIEWPORT}
          className="relative rounded-3xl overflow-hidden"
        >
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#00a859] via-[#00a859] to-[#00a859]" />
          <div className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.07) 1px, transparent 0)`,
              backgroundSize: '28px 28px',
            }}
          />
          <motion.div
            className="absolute top-[-30%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)' }}
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />

          <div className="relative z-10 text-center py-20 px-8 md:px-20">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={SCROLL_VIEWPORT}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 border border-white/25 text-white text-[11px] font-bold uppercase tracking-[0.15em] mb-6"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Get Started Today
            </motion.div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-5 leading-[1.1]">
              Ready to Transform Your<br />Legal Practice?
            </h2>
            <p className="text-white/80 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
              Join thousands of legal professionals who are already using JudicialGPT to work smarter, faster, and more efficiently.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <motion.button
                onClick={() => router.push('/signup')}
                whileHover={{ scale: 1.04, boxShadow: '0 20px 48px rgba(16, 185, 129, 0.35)' }}
                whileTap={{ scale: 0.96 }}
                className="px-8 py-4 bg-white text-[#00a859] font-extrabold rounded-xl text-base flex items-center gap-3 shadow-xl"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.2)' }}
                whileTap={{ scale: 0.96 }}
                className="px-8 py-4 bg-white/12 text-white font-semibold rounded-xl text-base border border-white/25 backdrop-blur-sm transition-all"
              >
                Schedule Demo
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ============================================================================
// VIDEO SECTION
// ============================================================================
const VideoSection = () => {
  const features = [
    'AI-powered legal research',
    'Instant legal document analysis',
    'Fast and reliable legal insights',
    'Secure and confidential assistance'
  ];

  return (
    <section className="py-24 lg:py-32 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

          {/* Left: Video */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={SCROLL_VIEWPORT}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="relative"
          >
            {/* Decorative background glows behind video */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#00a859]/20 to-[#00a859]/20 blur-2xl rounded-[2.5rem]" />

            <div className="relative rounded-3xl overflow-hidden border border-white/60 shadow-2xl shadow-slate-900/10 bg-white/50 backdrop-blur-md">
              <div className="relative w-full pb-[56.25%]"> {/* 16:9 Aspect Ratio */}
                <video
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover"
                  src="https://assets.mixkit.co/videos/preview/mixkit-abstract-technology-network-connection-background-24624-large.mp4"
                />
                {/* Glassmorphism overlay gradient on video to make it premium */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[#00a859]/20 to-transparent pointer-events-none" />
              </div>
            </div>
          </motion.div>

          {/* Right: Content */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={SCROLL_VIEWPORT}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#00a859]/10 border border-[#00a859]/15 text-[#00a859] text-[11px] font-bold uppercase tracking-[0.15em] mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              See JudicialGPT in Action
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
              Experience the Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00a859] to-[#00a859]">AI-Powered Legal Assistance</span>
            </h2>

            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              JudicialGPT combines advanced artificial intelligence with legal expertise to help users analyze legal documents, answer complex legal questions, and provide instant legal insights. Whether you're a lawyer, student, or individual seeking legal guidance, JudicialGPT makes legal information more accessible, accurate, and efficient.
            </p>

            <ul className="space-y-4">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#00a859]/15 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-[#00a859]" />
                  </div>
                  <span className="text-slate-700 font-medium text-base">{feature}</span>
                </li>
              ))}
            </ul>
          </motion.div>

        </div>
      </div>
    </section>
  );
};

// ============================================================================
// MAIN PAGE
// ============================================================================
export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.push('/chat');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080E1C]">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#00a859]" />
          <Scale className="absolute inset-0 m-auto w-5 h-5 text-[#00a859]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-body">
      <Header />
      <HeroSection />
      <TrustBarSection />
      <MiniStatsSection />
      <FeaturesSection />
      <AIToolsSection />
      <HowItWorksSection />
      {/* <PricingSection /> */}
      <TestimonialsSection />
      <AboutSection />
      {/* <IntelligenceDashboardSection /> */}
      <TeamSection />
      {/* <VideoSection /> */}
      <SiteFooter />
    </div>
  );
}

