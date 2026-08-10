'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  Scale, ArrowRight, FileText, Users, MessageSquare, Star, Twitter, Linkedin,
  Github, Mail, Brain, Clock, Target, Award, Sparkles, Lock, Globe, MessageCircle,
  FileSearch, Bot, Headphones, ChevronDown, ChevronLeft, ChevronRight, Menu, X, Check, Lightbulb, Shield,
  Search, BookOpen, ShieldCheck, Zap, DollarSign, MapPin, Landmark, Briefcase
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
          className="absolute w-1 h-1 rounded-full bg-[#0c9344]/35"
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
    <div className="absolute inset-0 bg-[#F4FBF8]" />

    {/* Animated image layer — constant gentle parallax float, no fade */}
    <motion.div
      // animate={{
      //   scale: [1.04, 1.08, 1.04],
      //   x: [0, 16, 0],
      //   y: [0, -18, 0],
      // }}
      transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
      className="absolute inset-0 w-full h-full"
    >
      <img
        src="/hero-scale-ai.png"
        alt=""
        className="w-full h-full object-cover object-center opacity-55"
        style={{ filter: 'grayscale(1) contrast(1.0) brightness(1.0)' }}
        draggable={false}
      />
    </motion.div>

    {/* Green colour tint (mix-blend-mode: color) */}
    <div
      className="absolute inset-0"
      style={{ background: 'rgb(130,280,210)', mixBlendMode: 'color' }}
    />

    {/* White readability gradient: strong on left where text lives, fades right */}
    <div
      className="absolute inset-0"
      style={{
        background:
          'linear-gradient(108deg, rgba(255,255,255,0.82) 0%, rgba(240,253,249,0.55) 36%, rgba(204,251,241,0.20) 60%, transparent 100%)',
      }}
    />

    {/* Soft emerald glow — upper right */}
    <div
      className="absolute -top-20 -right-20 w-[55%] h-[70%] rounded-full"
      style={{
        background:
          'radial-gradient(ellipse at 65% 28%, rgba(52,211,153,0.26) 0%, rgba(16,185,129,0.10) 48%, transparent 72%)',
        filter: 'blur(36px)',
      }}
    />

    {/* Soft emerald glow — lower left */}
    <div
      className="absolute -bottom-10 -left-10 w-[45%] h-[55%] rounded-full"
      style={{
        background:
          'radial-gradient(ellipse at 28% 72%, rgba(52,211,153,0.16) 0%, rgba(16,185,129,0.06) 58%, transparent 80%)',
        filter: 'blur(28px)',
      }}
    />

    {/* Bottom fade so the hero blends into the next section */}
    <div
      className="absolute bottom-0 inset-x-0 h-48"
      style={{ background: 'linear-gradient(to bottom, transparent, #F8FCFB)' }}
    />
  </div>
);

/** Hero background — image spans behind navbar → hero bottom */
const HeroBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Base page colour (visible while image loads) */}
    <div className="absolute inset-0 bg-[#F4FBF8]" />
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
      ? 'bg-[#0c9344]/15 text-[#0c9344] border border-[#0c9344]/25'
      : 'bg-[#0c9344]/10 text-[#0c9344] border border-[#0c9344]/25'
      }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${light ? 'bg-[#0c9344]' : 'bg-[#0c9344]'} animate-pulse`} />
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
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 0);
    handleScroll(); // set on mount in case page loads mid-scroll
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { name: 'Features', href: '#features' },
    { name: 'How It Works', href: '#how-it-works' },
    { name: 'AI Tools', href: '#ai-tools' },
    // { name: 'Pricing', href: '#pricing' },
    { name: 'Team', href: '#team' },
    { name: 'About', href: '#about' },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[9999]"
      style={{
        backgroundColor: isScrolled ? '#ffffff' : 'transparent',
        boxShadow: isScrolled ? '0 1px 6px rgba(0,0,0,0.08)' : 'none',
        borderBottom: isScrolled ? '1px solid rgba(226,232,240,0.7)' : '1px solid transparent',
        transition: 'background-color 0.35s ease, box-shadow 0.35s ease, border-color 0.35s ease',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-[4.5rem]">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
            whileHover={{ scale: 1.02 }}
            onClick={() => router.push('/')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0c9344] to-[#0c9344] flex items-center justify-center shadow-lg shadow-[#0c9344]/30">
              <Scale className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900 transition-colors duration-300">
              Judicial<span className="text-[#0c9344]">GPT</span>
            </span>
          </motion.div>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="px-3.5 py-2 text-sm font-semibold rounded-lg transition-all duration-200 text-slate-800 hover:text-[#0c9344] hover:bg-white/60"
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-3">
            <motion.button
              onClick={() => router.push('/login')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg transition-all text-slate-700 hover:bg-[#0c9344]/10"
            >
              Sign In
            </motion.button>
            <motion.button
              onClick={() => router.push('/signup')}
              whileHover={{ scale: 1.03, boxShadow: '0 8px 28px rgba(16,185,129,0.4)' }}
              whileTap={{ scale: 0.97 }}
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-[#0c9344] to-[#0c9344] rounded-lg shadow-md shadow-[#0c9344]/25 transition-all"
            >
              Get Started Free
            </motion.button>
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg transition-colors text-slate-900 hover:bg-[#0c9344]/10"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white/98 backdrop-blur-2xl border-b border-slate-200"
          >
            <div className="px-4 py-6 space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="block px-4 py-3 text-slate-700 font-medium rounded-xl hover:bg-[#0c9344]/10 hover:text-[#0c9344] transition-colors"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <div className="pt-4 space-y-2.5 border-t border-slate-100 mt-4">
                <button
                  onClick={() => { router.push('/login'); setIsMobileMenuOpen(false); }}
                  className="w-full py-3 text-sm font-semibold text-center text-slate-700 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => { router.push('/signup'); setIsMobileMenuOpen(false); }}
                  className="w-full py-3 text-sm font-bold text-center text-white bg-gradient-to-r from-[#0c9344] to-[#0c9344] rounded-xl"
                >
                  Get Started Free
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

// ============================================================================
// ANIMATED CHAT WIDGET — multilingual (EN → UR → AR → ZH → SD), cycling
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
      'Under Pakistani law, breaching a contract exposes the defaulting party to two primary remedies: compensatory damages under Section 73 of the Contract Act 1872, or a decree of specific performance under the Specific Relief Act 1877. Damages are awarded when the loss is a natural consequence of the breach or was foreseeable at the time the contract was formed. Specific performance, which compels the breaching party to fulfil their exact obligations, is granted when monetary compensation is inadequate, such as in contracts for immovable property or unique goods. ',
  },
  {
    lang: 'اردو',
    code: 'ur',
    dir: 'rtl' as const,
    flag: '🇵🇰',
    question:
      'پاکستان میں معاہدے کی خلاف ورزی کے قانونی نتائج کیا ہیں، اور کیا عدالت مخصوص کارکردگی کا حکم دے سکتی ہے؟',
    answer:
      'پاکستانی قانون کے تحت، معاہدے کی خلاف ورزی پر دو بنیادی تدارکات دستیاب ہیں: معاہدہ ایکٹ 1872 کی دفعہ 73 کے تحت معاوضاتی نقصانات، یا اسپیسیفک ریلیف ایکٹ 1877 کے تحت مخصوص کارکردگی کا ڈگری۔ نقصانات اس وقت دیے جاتے ہیں جب نقصان خلاف ورزی کا فطری نتیجہ ہو یا معاہدے کے وقت قابل پیش بینی تھا۔ مخصوص کارکردگی، جس میں عدالت خلاف ورزی کرنے والے کو معاہدہ پورا کرنے پر مجبور کرتی ہے، اس وقت دی جاتی ہے جب مالی معاوضہ ناکافی ہو، جیسے غیر منقولہ جائیداد کے معاملات میں۔ سپریم کورٹ آف پاکستان نے PLD 2023 SC 145 میں واضح کیا کہ یہ اختیار احتیاط سے استعمال کیا جائے۔',
  },
  {
    lang: 'بلوچی',
    code: 'bal',
    dir: 'rtl' as const,
    flag: '🇵🇰',
    question:
      'پاکستان ءَ معاہدے شکستی چے قانونی نتیجہ انت، و آیا عدالت خاص اجرا ءِ حکم دئے سکیت؟',
    answer:
      'پاکستانی قانون طبق، معاہدے شکست ءَ دو اصلی علاج دست انت: معاہدہ ایکٹ 1872 ءِ دفعہ 73 طبق نقصانی تاوان، یا اسپیسیفک ریلیف ایکٹ 1877 طبق خاص اجرا ءِ ڈگری۔ تاوان هما وختا دئیگ بیت کہ نقصان شکست ءِ طبیعی نتیجہ بوت یا معاہدے وختا پیش بینی بوتگ بیت۔ خاص اجرا، کہ عدالت شکست کننگ ءِ جانبا معاہدہ پورا کرنا مجبور کنت، هما وختا دئیگ بیت کہ مالی تاوان کم بیت، جیئن غیر منقولہ جائیداد ءِ معاملات ءَ۔ سپریم کورٹ آف پاکستان PLD 2023 SC 145 ءَ واضح کرت کہ این اختیار احتیاط سرا استعمال بیت۔',
  },
  {
    lang: 'پنجابی',
    code: 'pa',
    dir: 'rtl' as const,
    flag: '🇵🇰',
    question:
      'پاکستان وچ معاہدے دی خلاف ورزی دے کیہ قانونی نتیجے ہوندے نیں، تے کیہ عدالت خاص کارکردگی دا حکم دے سکدی اے؟',
    answer:
      'پاکستانی قانون دے مطابق، معاہدے دی خلاف ورزی اُتے دو مُکھ اپائے ملدے نیں: کنٹریکٹ ایکٹ 1872 دی دفعہ 73 تحت ہرجانہ، یا اسپیسیفک ریلیف ایکٹ 1877 تحت خاص کارکردگی دا ڈگری۔ ہرجانہ اودوں دتا جاندا اے جدوں نقصان خلاف ورزی دا قدرتی نتیجہ ہووے یا معاہدے ویلے پیشگی اندازہ لایا جا سکدا ہووے۔ خاص کارکردگی، جس وچ عدالت خلاف ورزی کرن والے نوں معاہدہ پورا کرن اُتے مجبور کردی اے، اودوں دتی جاندی اے جدوں مالی ہرجانہ ناکافی ہووے، جویں غیر منقولہ جائیداد دے معاملیاں وچ۔ سپریم کورٹ آف پاکستان نے PLD 2023 SC 145 وچ واضح کیتا کہ ایہ اختیار سوچ سمجھ کے ورتیا جاوے۔',
  },
  {
    lang: 'سنڌي',
    code: 'sd',
    dir: 'rtl' as const,
    flag: '🌙',
    question:
      'پاڪستان ۾ معاهدي جي ڀڃڪڙي جا قانوني نتيجا ڇا آهن، ۽ ڇا عدالت مخصوص ڪارگذاري جو حڪم ڏئي سگهي ٿي؟',
    answer:
      'پاڪستاني قانون موجب، معاهدي جي ڀڃڪڙي تي ٻه بنيادي اپاءَ موجود آهن: معاهدو ايڪٽ 1872 جي دفعي 73 تحت هاڃي جو تاوان، يا اسپيسفڪ ريلف ايڪٽ 1877 تحت مخصوص ڪارگذاري جو حڪمنامو. هاڃي جو تاوان تڏهن ملندو آهي جڏهن نقصان ڀڃڪڙي جو قدرتي نتيجو هجي يا معاهدي جي وقت اڳ ۾ ئي سمجهي سگهجي. مخصوص ڪارگذاري، جنهن ۾ عدالت ڀڃڻ واري کي معاهدو پورو ڪرڻ تي مجبور ڪري ٿي، اها تڏهن ڏني ويندي آهي جڏهن مالي تاوان ناڪافي هجي، جيئن غير منقوله ملڪيت جي معاملن ۾. سپريم ڪورٽ آف پاڪستان PLD 2023 SC 145 ۾ چيو ته هي اختيار سوچ سمجهه سان استعمال ٿيڻ گهرجي.',
  },
];

const AnimatedChatWidget = () => {
  const [langIndex, setLangIndex] = useState(0);
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(false);
  const [buttonClicked, setButtonClicked] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [responseStream, setResponseStream] = useState('');
  const isRunning = useRef(false);

  const current = LEGAL_QA_LANGUAGES[langIndex];
  const isRtl = current.dir === 'rtl';
  // Nastaliq script: Urdu, Sindhi, Punjabi (Shahmukhi), Balochi
  const NASTALIQ_CODES = new Set(['ur', 'sd', 'pa', 'bal']);
  const isNastaliq = NASTALIQ_CODES.has(current.code);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (isRunning.current) return;
      isRunning.current = true;

      // Reset
      setTypedText('');
      setShowResponse(false);
      setResponseStream('');
      setButtonClicked(false);
      setShowCursor(false);

      await new Promise((r) => setTimeout(r, 700));
      if (cancelled) return;

      // Type the question
      const q = LEGAL_QA_LANGUAGES[langIndex].question;
      for (let i = 0; i <= q.length; i++) {
        if (cancelled) return;
        setTypedText(q.slice(0, i));
        await new Promise((r) => setTimeout(r, 22 + Math.random() * 28));
      }

      if (cancelled) return;
      await new Promise((r) => setTimeout(r, 350));
      setShowCursor(true);
      await new Promise((r) => setTimeout(r, 600));
      setButtonClicked(true);
      await new Promise((r) => setTimeout(r, 140));
      setButtonClicked(false);
      setShowCursor(false);

      await new Promise((r) => setTimeout(r, 280));
      if (cancelled) return;
      setShowResponse(true);

      // Stream the answer
      const a = LEGAL_QA_LANGUAGES[langIndex].answer;
      for (let i = 0; i <= a.length; i++) {
        if (cancelled) return;
        setResponseStream(a.slice(0, i));
        await new Promise((r) => setTimeout(r, 12 + Math.random() * 16));
      }

      // Pause before next language
      await new Promise((r) => setTimeout(r, 4200));
      if (cancelled) return;

      isRunning.current = false;
      setLangIndex((prev) => (prev + 1) % LEGAL_QA_LANGUAGES.length);
    };

    run();
    return () => { cancelled = true; isRunning.current = false; };
  }, [langIndex]);

  return (
    <div className="relative w-full max-w-xl xl:max-w-2xl mx-auto bg-white/80 backdrop-blur-xl border border-[#0c9344]/15 rounded-3xl shadow-xl shadow-[#0c9344]/5 text-left overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(#05966914_1px,transparent_1px)] [background-size:20px_20px] rounded-3xl opacity-60 pointer-events-none" />

      {/* Language indicator pills */}
      <div className="relative z-10 flex items-center gap-1.5 px-5 pt-4 pb-3 border-b border-[#0c9344]/15/60">
        {LEGAL_QA_LANGUAGES.map((l, i) => (
          <motion.div
            key={l.code}
            animate={{
              backgroundColor: i === langIndex ? '#10b981' : '#f0fdf4',
              color: i === langIndex ? '#ffffff' : '#6b7280',
              borderColor: i === langIndex ? '#10b981' : '#d1fae5',
              scale: i === langIndex ? 1 : 0.92,
            }}
            transition={{ duration: 0.3 }}
            className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold border select-none"
          >
            {l.flag} {l.lang}
          </motion.div>
        ))}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <Scale className="w-3 h-3 text-[#0c9344]" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#0c9344]">JudicialGPT</span>
        </div>
      </div>

      <div className="relative z-10 flex flex-col gap-5 p-5 md:p-6">
        {/* Search / Question Input */}
        <div
          className="relative flex items-start bg-white rounded-2xl shadow-lg border border-slate-100 px-4 py-3.5 shrink-0"
          dir={isRtl ? 'rtl' : 'ltr'}
        >
          <Search className={`w-5 h-5 text-slate-400 mt-0.5 shrink-0 ${isRtl ? 'ml-3' : 'mr-3'}`} />
          <div
            className={`flex-1 text-slate-800 font-medium flex items-start pt-0.5 ${isNastaliq
              ? 'nastaliq-question'
              : 'text-[13px] md:text-sm leading-snug'
              }`}
            style={{
              minHeight: '5.5rem',
              ...(!isNastaliq && isRtl ? { direction: 'rtl', textAlign: 'right' } : {}),
            }}
          >
            <span className="whitespace-pre-wrap w-full">
              {typedText}
              {!showResponse && (
                <span className={`w-0.5 h-4 bg-[#0c9344] animate-pulse inline-block align-middle ${isRtl ? 'mr-0.5' : 'ml-0.5'}`} />
              )}
            </span>
          </div>

          {/* Send button */}
          <div
            className={`shrink-0 ${isRtl ? 'mr-3' : 'ml-3'} mt-0.5 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${buttonClicked ? 'bg-[#0c9344]/15' : 'bg-slate-50'
              }`}
          >
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </div>

          {/* Animated cursor */}
          <AnimatePresence>
            {showCursor && (
              <motion.div
                initial={{ x: isRtl ? 80 : -80, y: 100, opacity: 0 }}
                animate={{ x: 0, y: 0, opacity: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.55, ease: 'easeOut' }}
                className={`absolute bottom-0 z-50 pointer-events-none ${isRtl ? 'left-3' : 'right-3'}`}
                style={{ originX: 0, originY: 0 }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-md">
                  <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86a.5.5 0 01.35-.15h6.43c.45 0 .67-.54.35-.85L6.35 3.35a.5.5 0 00-.85.35z" fill="black" stroke="white" strokeWidth="1.5" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Answer area — fixed height so card never resizes between languages */}
        <div className="overflow-hidden h-[15rem]">
          <AnimatePresence mode="wait">
            {showResponse && (
              <motion.div
                key={langIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="flex items-start gap-3"
                dir={isRtl ? 'rtl' : 'ltr'}
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0c9344] to-[#0c9344] flex items-center justify-center shadow-md shadow-[#0c9344]/30 shrink-0 mt-0.5">
                  <Scale className="w-[16px] h-[16px] text-white" />
                </div>
                <div
                  className={`flex-1 bg-[#0c9344]/10/90 border border-[#0c9344]/15 text-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm ${isNastaliq
                    ? 'nastaliq-text'
                    : 'text-[13px] leading-relaxed'
                    }`}
                  style={!isNastaliq && isRtl ? { direction: 'rtl', textAlign: 'right', lineHeight: '1.85' } : {}}
                >
                  {responseStream}
                  {responseStream.length < current.answer.length && (
                    <span className={`w-1 h-3.5 bg-[#0c9344] animate-pulse inline-block align-middle ${isRtl ? 'mr-0.5' : 'ml-0.5'}`} />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1.5 justify-center pt-1">
          {LEGAL_QA_LANGUAGES.map((_, i) => (
            <motion.div
              key={i}
              animate={{
                width: i === langIndex ? 22 : 6,
                backgroundColor: i === langIndex ? '#10b981' : '#d1fae5',
              }}
              transition={{ duration: 0.35 }}
              className="h-1.5 rounded-full"
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HERO SECTION
// ============================================================================
const HeroSection = () => {
  const router = useRouter();
  const [currentTopic, setCurrentTopic] = useState(0);
  const statsRef = useRef<HTMLDivElement>(null);
  const hasMounted = useHasMounted();
  const statsInView = useInView(statsRef, { once: true, amount: 0.45 });
  const statsActive = hasMounted && statsInView;

  // Count-up targets (formatted for display)
  const docsCount = useCountUp(statsActive, 24, 2600);   // → 2.4M
  const usersCount = useCountUp(statsActive, 10, 2400);  // → 10K
  const availCount = useCountUp(statsActive, 24, 2500);  // → 24/7

  const heroTopics = [
    { title: 'Legal Research', description: 'Search case law, statutes, and precedents in seconds. Our AI surfaces relevant authorities from millions of legal documents with precision.' },
    { title: 'Case Analysis', description: 'Break down complex cases with AI-driven insights. Identify key facts, precedents, and arguments to strengthen your legal strategy faster.' },
    { title: 'Document Review', description: 'Review contracts and legal documents in minutes, not hours. AI highlights risks, critical clauses, and compliance gaps with remarkable accuracy.' },
    { title: 'Legal Analysis', description: 'Turn intricate legal questions into clear, structured analysis. Get issue breakdowns, applicable law, and actionable guidance instantly.' },
  ];

  useEffect(() => {
    const interval = setInterval(() => setCurrentTopic((p) => (p + 1) % heroTopics.length), 3000);
    return () => clearInterval(interval);
  }, [heroTopics.length]);

  const heroStats = [
    {
      value: statsActive ? `${(docsCount / 10).toFixed(1)}M` : '0M',
      label: 'Legal Documents',
    },
    {
      value: statsActive ? `${usersCount}K` : '0K',
      label: 'Active Users',
    },
    {
      value: 'Highest',
      label: 'Benchmark Accuracy',
      small: true,
      static: true,
    },
    {
      value: statsActive ? `${availCount}/7` : '0/7',
      label: 'AI Availability',
    },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <HeroBackground />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 lg:pt-20 pb-8 lg:pb-10 grid lg:grid-cols-2 gap-6 lg:gap-4 items-center text-center lg:text-left">
        {/* Left Column: Content */}
        <div className="flex flex-col items-center lg:items-start">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-[#0c9344]/25 bg-white/70 backdrop-blur-sm mb-3 lg:mb-4 shadow-sm shadow-[#0c9344]/5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#0c9344]" />
            <span className="text-[#0c9344] text-sm font-medium">AI-Powered Judicial Intelligence Platform</span>
            <span className="w-2 h-2 rounded-full bg-[#0c9344] animate-pulse" />
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="w-full flex flex-col items-center text-center font-heading text-4xl sm:text-5xl md:text-6xl lg:text-5xl xl:text-[3.75rem] font-semibold text-slate-900 leading-[1.12] tracking-tight mb-2 lg:mb-3"
          >
            <span>JudicialGPT</span>
            <span className="text-3xl sm:text-4xl font-normal tracking-wide my-0.5">for</span>
            <span className="relative w-full flex justify-center mt-2 min-h-[1.2em]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentTopic}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -28 }}
                  transition={{ duration: 0.45 }}
                  className="absolute bg-gradient-to-r from-[#0c9344] via-[#0c9344] to-[#0c9344] bg-clip-text text-transparent whitespace-nowrap"
                >
                  {heroTopics[currentTopic].title}
                </motion.span>
              </AnimatePresence>
            </span>
          </motion.h1>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="w-full max-w-2xl mx-auto mb-4 lg:mb-6 min-h-[4rem] md:min-h-[3rem] flex items-center justify-center text-center"
          >
            <AnimatePresence mode="wait">
              <motion.p
                key={currentTopic}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4 }}
                className="font-body text-lg md:text-xl text-slate-600 leading-relaxed text-center"
              >
                {heroTopics[currentTopic].description}
              </motion.p>
            </AnimatePresence>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.6 }}
            className="w-full flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 lg:mb-8"
          >
            <motion.button
              onClick={() => router.push('/chat')}
              whileHover={{ scale: 1.04, boxShadow: '0 20px 48px rgba(16,185,129,0.35)' }}
              whileTap={{ scale: 0.96 }}
              className="px-8 py-4 bg-gradient-to-r from-[#0c9344] to-[#0c9344] text-white font-bold rounded-xl text-base flex items-center gap-3 shadow-xl shadow-[#0c9344]/25"
            >
              <Bot className="w-5 h-5" />
              Try AI Assistant Free
              <ArrowRight className="w-4 h-4" />
            </motion.button>
          </motion.div>

          {/* Stats */}
          <motion.div
            ref={statsRef}
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6 }}
            className="grid grid-cols-2 md:grid-cols-4 w-full max-w-3xl mx-auto lg:mx-0 rounded-2xl overflow-hidden border border-[#0c9344]/15 divide-x divide-y md:divide-y-0 divide-emerald-100 bg-white/70 shadow-sm shadow-[#0c9344]/5"
          >
            {heroStats.map((stat, i) => (
              <div key={i} className="backdrop-blur-sm px-3 py-4 md:py-3.5 text-center flex flex-col items-center justify-center relative">
                <div className={`font-extrabold text-slate-900 mb-0.5 tabular-nums ${stat.small ? 'text-lg md:text-xl leading-snug' : 'text-2xl md:text-3xl'}`}>
                  {stat.value}
                </div>
                <div className="text-[10px] md:text-[11px] text-slate-500 font-medium uppercase tracking-wider">{stat.label}</div>
                {(stat as any).badge && (
                  <div className="mt-1.5 px-2 py-0.5 rounded-full bg-[#0c9344]/15 border border-[#0c9344]/25 text-[#0c9344] text-[9px] font-bold uppercase tracking-wider shadow-sm">
                    {(stat as any).badge}
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        </div>

        {/* Right Column: Multilingual Legal Q&A Card */}
        <div className="hidden lg:block w-full relative z-10">
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            <AnimatedChatWidget />
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.4 }}
        className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-400"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="flex flex-col items-center gap-1"
        >
          <span className="text-[9px] uppercase tracking-[0.25em] font-semibold">Scroll to explore</span>
          <ChevronDown className="w-4 h-4" />
        </motion.div>
      </motion.div>
    </section>
  );
};

// ============================================================================
// TRUST BAR + AUDIENCE MARQUEE (directly below Hero)
// ============================================================================
const TrustBarSection = () => {
  const trustItems = [
    { icon: Shield, title: 'Open to All', subtitle: 'Ask Legal Questions', color: 'bg-[#0c9344]' },
    { icon: Scale, title: 'All-in-One', subtitle: 'Judicial AI Platform', color: 'bg-[#0c9344]' },
    { icon: Globe, title: 'Multi-language', subtitle: 'Coverage', color: 'bg-[#0c9344]' },
    { icon: ShieldCheck, title: 'Safe & Secure', subtitle: 'Ad-Free', color: 'bg-[#0c9344]' },
    { icon: Zap, title: 'Learn Smarter,', subtitle: 'Not Harder', color: 'bg-[#0c9344]' },
    { icon: DollarSign, title: 'Affordable', subtitle: 'Premium Access', color: 'bg-[#0c9344]' },
  ];

  const audiences = [
    { label: 'General Public / Citizens', star: 'text-orange-500' },
    { label: 'Judges', star: 'text-[#0c9344]' },
    { label: 'Justice Sector Institutions', star: 'text-violet-500' },
    { label: 'Police Investigation Officers (IO)', star: 'text-sky-500' },
    { label: 'Prosecution', star: 'text-rose-500' },
    { label: 'Prisons & Correctional Facilities', star: 'text-amber-500' },
    { label: 'Lawyers', star: 'text-orange-500' },
    { label: 'Revenue & Land Records', star: 'text-[#0c9344]' },
    { label: 'Tax & Revenue Authorities', star: 'text-violet-500' },
    { label: 'Banking & Financial Institutions', star: 'text-sky-500' },
    { label: 'District Judiciary', star: 'text-rose-500' },
    { label: "Prosecutor General's Office", star: 'text-amber-500' },
    { label: 'Corporate & Commercial Sector', star: 'text-orange-500' },
    { label: 'E-Governance & Public Administration', star: 'text-[#0c9344]' },
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
    { icon: Brain, title: 'AI Legal Assistant', description: 'Get instant answers to complex legal questions. Our AI breaks down legal jargon into simple, actionable advice.', gradient: 'from-[#0c9344] to-[#0c9344]', glow: 'rgba(16, 185, 129, 0.18)' },
    { icon: FileSearch, title: 'Case Research Tool', description: 'Access millions of case precedents and legal documents instantly. Find relevant cases in seconds, not hours.', gradient: 'from-[#0c9344] to-[#0c9344]', glow: 'rgba(15, 23, 42, 0.18)' },
    { icon: MessageCircle, title: 'Virtual Consultation', description: '24/7 AI-powered consultation to understand your case, predict outcomes, and provide strategic guidance.', gradient: 'from-[#0c9344] to-[#0c9344]', glow: 'rgba(148, 163, 184, 0.18)' },
    { icon: FileText, title: 'Document Analysis', description: 'Upload contracts and legal documents for instant AI analysis. Identify risks, obligations, and key clauses.', gradient: 'from-[#0c9344] to-[#0c9344]', glow: 'rgba(16, 185, 129, 0.18)' },
    { icon: Shield, title: 'Privacy Protected', description: 'All conversations are encrypted and private. Option for temporary chats that are never stored.', gradient: 'from-[#0c9344] to-[#0c9344]', glow: 'rgba(15, 23, 42, 0.18)' },
    { icon: Globe, title: 'Multi-Platform Access', description: 'Access from any device — web, mobile, or desktop. Seamless experience across all platforms.', gradient: 'from-[#0c9344] to-[#0c9344]', glow: 'rgba(148, 163, 184, 0.18)' },
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
    'absolute top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white border border-slate-200 text-slate-600 shadow-md shadow-slate-900/8 flex items-center justify-center transition-all duration-300 hover:border-[#0c9344]/25 hover:text-[#0c9344] hover:shadow-lg hover:shadow-[#0c9344]/15 disabled:opacity-35 disabled:pointer-events-none disabled:shadow-none';

  return (
    <section id="features" className="py-6 lg:py-8 bg-slate-50/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SectionHeading
          label="Features"
          title={<>Innovative Features That<br /><span className="text-[#0c9344]">Redefine Legal Assistance</span></>}
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
      title: 'JudicialGPT AI Chatbot',
      description: 'Our AI chatbot is trained on an extensive database of legal cases and can fetch real-time updates including new judgments and amendments. Get personalized, human-like interactions for all your legal queries.',
      features: [
        'Real-time Legal Updates',
        'Case Law Database',
        'NLP',
        'Contextual Understanding',
      ],
      gradient: 'from-[#0c9344] to-[#0c9344]',
      accent: 'bg-[#0c9344]',
      accentSoft: 'bg-[#0c9344]/10',
      accentText: 'text-[#0c9344]',
      accentBorder: 'border-[#0c9344]/25',
      glow: 'rgba(16, 185, 129, 0.45)',
      glowSoft: 'rgba(16, 185, 129, 0.12)',
      ring: '#10b981',
      badge: 'Core Tool',
    },
    {
      icon: FileSearch,
      title: 'Case Prism — Research Tool',
      description: 'Access our proprietary legal research tool for comprehensive case analysis. Search through millions of cases, statutes, and legal documents with advanced filtering and relevance ranking.',
      features: ['Advanced search filters', 'Citation analysis', 'Precedent mapping', 'Export capabilities'],
      gradient: 'from-[#0c9344] to-[#0c9344]',
      accent: 'bg-slate-800',
      accentSoft: 'bg-slate-100',
      accentText: 'text-slate-800',
      accentBorder: 'border-slate-200',
      glow: 'rgba(15, 23, 42, 0.45)',
      glowSoft: 'rgba(15, 23, 42, 0.12)',
      ring: '#0f172a',
      badge: 'Research',
      bars: [
        { label: 'Advanced search filters', target: 94 },
        { label: 'Citation analysis', target: 87 },
      ],
    },
    {
      icon: Headphones,
      title: 'Virtual Legal Consultant',
      description: '24/7 AI-powered virtual consultation service. Understand your case better, explore potential outcomes, and get strategic recommendations without the wait.',
      features: ['Outcome prediction', 'Strategy suggestions', 'Risk assessment', 'Available 24/7'],
      gradient: 'from-[#0c9344] to-[#0c9344]',
      accent: 'bg-slate-500',
      accentSoft: 'bg-slate-50',
      accentText: 'text-slate-600',
      accentBorder: 'border-slate-200',
      glow: 'rgba(148, 163, 184, 0.45)',
      glowSoft: 'rgba(148, 163, 184, 0.12)',
      ring: '#64748b',
      badge: 'Consultation',
      bars: [
        { label: 'Outcome prediction', target: 91 },
        { label: 'Strategy suggestions', target: 89 },
      ],
    },
  ];

  const core = tools[0];
  const sideTools = tools.slice(1);

  const bar1 = useCountUp(isInView, 94, 1300);
  const bar2 = useCountUp(isInView, 87, 1400);
  const bar3 = useCountUp(isInView, 91, 1500);
  const bar4 = useCountUp(isInView, 89, 1600);
  const barValues = [bar1, bar2, bar3, bar4];

  const marqueeChips = [
    { label: 'JudicialGPT AI Chatbot', star: 'text-[#0c9344]' },
    { label: 'Case Prism — Research Tool', star: 'text-blue-500' },
    { label: 'Virtual Legal Consultant', star: 'text-violet-500' },
    { label: 'Real-time Legal Updates', star: 'text-[#0c9344]' },
    { label: 'Case Law Database', star: 'text-sky-500' },
    { label: 'NLP', star: 'text-amber-500' },
    { label: 'Contextual Understanding', star: 'text-rose-500' },
    { label: 'Advanced Search Filters', star: 'text-indigo-500' },
    { label: 'Citation Analysis', star: 'text-cyan-500' },
    { label: 'Precedent Mapping', star: 'text-[#0c9344]' },
    { label: 'Export Capabilities', star: 'text-orange-500' },
    { label: 'Outcome Prediction', star: 'text-violet-500' },
    { label: 'Strategy Suggestions', star: 'text-blue-600' },
    { label: 'Risk Assessment', star: 'text-rose-500' },
    { label: 'Available 24/7', star: 'text-[#0c9344]' },
    { label: 'PLG', star: 'text-[#0c9344]' },
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-5 bg-[#0c9344]/10 text-[#0c9344] border border-[#0c9344]/25">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0c9344] animate-pulse" />
            AI Tools
          </div>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-[3.15rem] font-semibold leading-[1.12] tracking-tight text-slate-900 mb-4">
            Integrated AI-Powered<br />
            <span className="text-[#0c9344]">Legal Solutions</span>
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
            className="lg:col-span-2 relative rounded-[1.75rem] border border-[#0c9344]/15 bg-white p-6 md:p-8 h-full"
            style={{ boxShadow: `0 10px 40px ${core.glowSoft}` }}
          >
            <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.75rem]" aria-hidden>
              <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[#0c9344]/10 blur-3xl" />
            </div>
            <div className="relative flex flex-col h-full min-h-[320px]">
              {/* Top: copy aligned to top */}
              <div className="flex flex-col gap-6 md:gap-8 items-start">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0c9344]/10 border border-[#0c9344]/15 text-[#0c9344] text-[11px] font-bold uppercase tracking-wider mb-4 w-fit">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0c9344]" />
                    {core.badge}
                  </div>
                  <h3 className="font-heading text-2xl md:text-3xl font-semibold text-slate-900 tracking-tight mb-3">
                    {core.title}
                  </h3>
                  <p className="text-slate-500 text-base md:text-lg leading-[1.75] mb-4">
                    {core.description}
                  </p>
                  <p className="text-slate-600 text-base leading-[1.75]">
                    Ask complex legal questions in plain language and receive structured, citation-aware answers built for research, case prep, and everyday legal guidance.
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
            {sideTools.map((tool, i) => {
              const barOffset = i * 2;
              return (
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
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-md`}>
                      <tool.icon className="w-5 h-5 text-white" />
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${tool.accentSoft} ${tool.accentText}`}>
                      {tool.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-1.5 leading-snug">{tool.title}</h3>
                  <p className="text-slate-500 text-xs leading-relaxed mb-4 line-clamp-3">{tool.description}</p>
                  <div className="space-y-3">
                    {tool.bars?.map((bar, fi) => (
                      <div key={bar.label}>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <p className="text-[10px] font-semibold text-slate-500 truncate">{bar.label}</p>
                          <span className={`text-[11px] font-bold tabular-nums ${tool.accentText}`}>
                            {barValues[barOffset + fi]}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${tool.gradient}`}
                            style={{
                              width: isInView ? `${bar.target}%` : '0%',
                              transition: hasMounted
                                ? `width ${1.2 + fi * 0.15}s cubic-bezier(0.22, 1, 0.36, 1) ${0.15 + i * 0.1 + fi * 0.08}s`
                                : 'none',
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Bottom three equal feature cards — CSS grid rows lock feature-list Y position */}
        <div id="ai-tools-grid" className="grid md:grid-cols-3 gap-4 lg:gap-5 mb-2 md:items-stretch">
          {tools.map((tool, i) => (
            <motion.div
              key={tool.title}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={SCROLL_VIEWPORT}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              whileHover={hasMounted ? cardHover(tool.glow) : undefined}
              className="group relative grid grid-rows-[auto_1fr_auto] h-full rounded-[1.5rem] border border-slate-200 hover:border-[#0c9344] bg-white px-5 py-6 overflow-hidden transition-colors duration-300"
              style={{ boxShadow: `0 6px 22px rgba(16, 185, 129, 0.10)` }}
            >
              {/* Animated green bottom line */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#0c9344] to-[#0c9344] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left rounded-b-[1.5rem]" />

              <div className={`absolute left-0 top-4 bottom-4 w-1 rounded-full ${tool.accent}`} />

              {/* Row 1: header */}
              <div className="flex items-center gap-3 pb-4 min-h-[3rem]">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${tool.gradient} flex items-center justify-center shadow-md shrink-0`}>
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
          <div className="absolute left-6 md:left-1/2 top-4 bottom-4 w-0.5 bg-[#0c9344]/25 -translate-x-1/2" />

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
                      ? 'bg-[#0c9344] text-white shadow-[#0c9344]/25'
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
      accentGradient: 'from-[#0c9344] to-[#0c9344]',
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
          title={<>Simple, Transparent<br /><span className="text-[#0c9344]">Pricing Plans</span></>}
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
                  <span className="px-4 py-1.5 bg-gradient-to-r from-[#0c9344] to-[#0c9344] text-white text-xs font-bold rounded-full shadow-lg shadow-[#0c9344]/30 uppercase tracking-wide">
                    Most Popular
                  </span>
                </div>
              )}
              <div className={`h-full rounded-3xl border overflow-hidden shadow-sm transition-all duration-300 ${plan.popular
                ? 'border-[#0c9344] shadow-xl shadow-[#0c9344]/12 hover:shadow-[#0c9344]/20'
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
                        <div className="w-5 h-5 rounded-full bg-[#0c9344]/15 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-[#0c9344]" />
                        </div>
                        {feat}
                      </li>
                    ))}
                  </ul>
                  <button className={`w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-300 ${plan.popular
                    ? 'bg-gradient-to-r from-[#0c9344] to-[#0c9344] text-white shadow-md shadow-[#0c9344]/20 hover:shadow-[#0c9344]/40 hover:from-[#0c9344] hover:to-[#0c9344]'
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
            <Star className={`${size} text-[#0c9344] fill-emerald-500`} />
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
      <div className="absolute top-0 left-1/3 w-[420px] h-[420px] rounded-full bg-[#0c9344]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[360px] h-[360px] rounded-full bg-[#0c9344]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={SCROLL_VIEWPORT}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="text-center max-w-3xl mx-auto mb-12 lg:mb-16"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.16em] mb-6 bg-white text-[#0c9344] border border-[#0c9344]/25 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#0c9344]" />
            Peer-Validated Intelligence
          </div>
          <h2 className="font-heading text-4xl sm:text-5xl md:text-[3.35rem] font-semibold text-slate-900 leading-[1.15] tracking-tight mb-5">
            Trusted by the{' '}
            <span className="italic font-medium bg-gradient-to-r from-[#0c9344] via-[#0c9344] to-[#0c9344] bg-clip-text text-transparent">
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
              className="group relative flex flex-col rounded-[1.25rem] border border-slate-100 hover:border-[#0c9344]/25 bg-white p-8 md:p-10 gap-6 h-full overflow-hidden"
              style={{
                boxShadow: '0 4px 18px rgba(16, 185, 129, 0.07)',
                transition: 'box-shadow 0.38s ease, transform 0.38s ease',
              }}
            >
              {/* Animated green bottom line */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#0c9344] to-[#0c9344] scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

              <div className="flex items-center gap-1 shrink-0">
                <StarRating rating={5} size="w-5 h-5" />
              </div>
              <p className="font-body text-sm md:text-base italic text-slate-500 leading-relaxed flex-1">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-4 mt-2 shrink-0">
                <div className="w-11 h-11 rounded-full bg-[#10b981] flex items-center justify-center text-white font-bold text-[13px] shrink-0">
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
    <div className="relative w-full max-w-2xl xl:max-w-3xl mx-auto bg-slate-900 backdrop-blur-xl border border-slate-800 rounded-[2rem] p-8 md:p-10 shadow-2xl shadow-[#0c9344]/15 text-left">
      <div className="absolute inset-0 bg-[radial-gradient(#ffffff1a_1px,transparent_1px)] [background-size:24px_24px] rounded-[2rem] opacity-20" />

      <div className="relative z-10 flex flex-col gap-8 min-h-[440px] overflow-hidden">
        {/* Search Input */}
        <div className="relative flex items-center bg-white rounded-2xl shadow-lg border border-slate-100 p-5 md:p-6 shrink-0">
          <Search className="w-7 h-7 text-slate-400 mr-4 shrink-0" />

          <div className="flex-1 text-slate-800 font-medium text-lg md:text-xl min-h-[2rem] flex items-center">
            <span className="whitespace-pre-wrap leading-snug">
              {typedText}
              {!showResponse && <span className="w-0.5 h-6 bg-[#0c9344] animate-pulse ml-0.5 inline-block align-middle" />}
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
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#0c9344] to-[#0c9344] flex items-center justify-center shrink-0 shadow-lg shadow-[#0c9344]/30">
                    <Scale className="w-6 h-6 text-white" />
                  </div>
                  <div className="bg-white/10 backdrop-blur-md border border-white/10 text-white text-lg md:text-xl leading-relaxed p-6 md:p-8 rounded-2xl rounded-tl-sm shadow-inner min-h-[6rem]">
                    {responseStream}
                    {responseStream.length < conversations[convoIndex].response.length && (
                      <span className="w-2 h-5 bg-[#0c9344] animate-pulse ml-1 inline-block align-middle" />
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
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] bg-[#0c9344]/10 text-[#0c9344] border border-[#0c9344]/25 mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0c9344]" />
            Our Mission
          </div>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-[3.15rem] font-semibold text-slate-900 leading-[1.12] mb-6">
            Making Legal Help<br />
            <span className="text-[#0c9344]">Accessible to All</span>
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
              <div key={i} className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-[#0c9344]/25 hover:bg-[#0c9344]/10/40 transition-all duration-200">
                <div className="w-9 h-9 rounded-lg bg-[#0c9344]/15 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-[#0c9344]" />
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
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c9344]/20 to-[#0c9344]/10 rounded-3xl blur-3xl" />
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
    { label: 'Highest Benchmark', value: 96, color: 'from-[#0c9344] to-[#0c9344]' },
    { label: 'Privacy First', value: 98, color: 'from-[#0c9344] to-cyan-500' },
    { label: 'Expert Support', value: 92, color: 'from-blue-500 to-indigo-500' },
    { label: '24/7 Available', value: 99, color: 'from-violet-500 to-purple-500' },
  ];

  const i0 = useCountUp(isInView, integrity[0].value, 1200);
  const i1 = useCountUp(isInView, integrity[1].value, 1300);
  const i2 = useCountUp(isInView, integrity[2].value, 1400);
  const i3 = useCountUp(isInView, integrity[3].value, 1500);
  const integrityValues = [i0, i1, i2, i3];

  const distribution = [
    { label: 'Legal Research', pct: 36, color: '#10b981' },
    { label: 'Case Analysis', pct: 30, color: '#14b8a6' },
    { label: 'Document Review', pct: 20, color: '#3b82f6' },
    { label: 'Legal Analysis', pct: 14, color: '#8b5cf6' },
  ];

  const insights = [
    {
      title: 'JudicialGPT AI Chatbot',
      badge: 'Core Tool',
      status: 'Active',
      statusColor: 'bg-[#0c9344]/10 text-[#0c9344] border-[#0c9344]/25',
      accent: 'bg-[#0c9344]',
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
      <div className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full bg-[#0c9344]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[360px] h-[360px] rounded-full bg-[#0c9344]/10 blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={SCROLL_VIEWPORT}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="max-w-2xl mb-10 lg:mb-12"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-5 bg-[#0c9344]/10 text-[#0c9344] border border-[#0c9344]/25">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0c9344] animate-pulse" />
            AI-Powered Legal Intelligence Platform
          </div>
          <h2 className="font-heading text-4xl md:text-5xl lg:text-[3.15rem] font-semibold leading-[1.12] tracking-tight text-slate-900 mb-4">
            Legal Intelligence<br />
            <span className="text-[#0c9344]">Dashboard</span>
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
            className="lg:col-span-2 relative rounded-[1.75rem] border border-[#0c9344]/15 bg-white p-6 md:p-8 overflow-hidden"
            style={{ boxShadow: '0 10px 36px rgba(16, 185, 129, 0.08)' }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-2">Documents Analyzed</p>
                <div className="flex items-end gap-3">
                  <span className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">2.4M</span>
                  <span className="text-sm font-semibold text-[#0c9344] mb-1.5">Legal Documents</span>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0c9344]" /> Legal Research
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#0c9344]" /> Case Analysis
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
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
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
                    stroke="#10b981"
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
                      stroke="#10b981"
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
                <Target className="w-4 h-4 text-[#0c9344]" />
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
              className="rounded-[1.5rem] border border-[#0c9344]/15 bg-white p-5 md:p-6"
              style={{ boxShadow: '0 8px 24px rgba(16, 185, 129, 0.10)' }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">Platform Status</p>
                  <h3 className="text-2xl font-black text-slate-900">Operational</h3>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0c9344] to-[#0c9344] flex items-center justify-center shadow-md">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed mb-4">
                24/7 AI Availability — secure and confidential assistance for every legal query.
              </p>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#0c9344]">
                <span className="w-2 h-2 rounded-full bg-[#0c9344] animate-pulse" />
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
              <Sparkles className="w-4 h-4 text-[#0c9344]" />
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


// TEAM SECTION
// ============================================================================
const TeamSection = () => {
  const teamMembers = [
    { name: 'Prof. Dr. M. Usman Ghani Khan', role: 'Founder', badge: 'Founder', bio: 'Founded JudicialGPT to make quality legal assistance accessible through AI. Sets company strategy, product vision, and partnerships while guiding the team to build trustworthy legal technology.', photoUrl: '/DR_Usman.jpeg', gradient: 'from-[#0c9344] to-[#0c9344]', initials: 'UG' },
    { name: 'Ayesha Azam', role: 'Team Lead', badge: 'Leadership', bio: 'Coordinates engineering delivery, sprint planning, and cross-functional collaboration to ship reliable AI-powered legal features on time and at scale.', photoUrl: '/Ayesha.png', gradient: 'from-[#0c9344] to-[#0c9344]', initials: 'AA' },
    { name: 'Syed Ali Hassan', role: 'Lead Developer / AI Engineer', badge: 'Engineering & AI', bio: 'Architects the full-stack platform and fine-tunes AI models for legal document analysis, case summarization, and intelligent query responses.', photoUrl: '/ali.jpg', gradient: 'from-blue-500 to-indigo-600', initials: 'AH' },
    { name: 'Laiba Saleem', role: 'Data Analyst', badge: 'Data & Analytics', bio: 'Analyzes user engagement metrics, legal dataset patterns, and AI model performance to drive data-informed product decisions and improvements.', photoUrl: '/laiba.png', gradient: 'from-rose-500 to-pink-600', initials: 'LS' },
    { name: 'Zubaid Rasool', role: 'Full-Stack & DevOps Engineer', badge: 'Dev & DevOps', bio: 'Builds and maintains frontend and backend features while managing CI/CD pipelines, server infrastructure, and deployment workflows on the cloud.', photoUrl: '/Zubaid.png', gradient: 'from-purple-500 to-violet-600', initials: 'ZR' },
    { name: 'Dr. Abdul Nasir', role: 'Legal Domain Expert', badge: 'Domain Expert', bio: "A legal practitioner for providing judicial domain expertise to validate legal accuracy, guide court-relevant content, and ensure JudicialGPT meets professional standards.", photoUrl: '/dr_abdul_nasir.jpg', icon: Scale, gradient: 'from-amber-500 to-orange-600', initials: 'AN' },
  ];

  return (
    <section id="team" className="relative py-6 lg:py-8 bg-slate-50 border-t border-slate-200">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-6 lg:mb-8 flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={SCROLL_VIEWPORT}
            className="flex flex-col items-center"
          >
            <div className="mb-4 bg-white p-3 rounded-2xl shadow-sm border border-slate-200 inline-flex items-center justify-center">
              <Users className="w-8 h-8 text-slate-700" />
            </div>
            <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
              Meet Our Team
            </h2>
          </motion.div>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 justify-items-center">
          {teamMembers.map((member, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={SCROLL_VIEWPORT}
              transition={{ delay: idx * 0.1, duration: 0.5 }}
              className="group relative w-full max-w-[420px] h-[164px] shrink-0 rounded-[4rem] bg-white shadow-sm hover:shadow-md border border-slate-200 overflow-hidden cursor-pointer flex items-center p-3 transition-shadow duration-300"
            >
              {/* Default State - Image & Basic Info */}
              <div className="flex items-center gap-4 w-full h-full relative z-10">
                {/* Circular Avatar */}
                <div className="w-[116px] h-[116px] shrink-0 rounded-full overflow-hidden border border-slate-100 shadow-sm bg-slate-100">
                  {member.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${member.gradient}`}>
                      <span className="text-3xl font-black text-white">{member.initials}</span>
                    </div>
                  )}
                </div>
                {/* Basic Info */}
                <div className="flex flex-col min-w-0 pr-4">
                  <h3 className="text-[17px] md:text-lg font-bold text-slate-900 leading-tight mb-1 text-balance">{member.name}</h3>
                  <p className="text-slate-500 text-[13px] md:text-sm font-medium leading-snug">{member.role}</p>
                </div>
              </div>

              {/* Hover Overlay (Slides from left) */}
              <div className="absolute inset-0 bg-[#0c9344]/90 backdrop-blur-sm transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500 ease-out z-20 pointer-events-none rounded-[4rem]" />

              {/* Hover Content (Fades in) — starts from left with the avatar visible */}
              <div className="absolute inset-0 z-30 flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-[50ms] pl-4 pr-5 py-4 pointer-events-auto gap-4">
                {/* Avatar stays visible on hover */}
                <div className="w-[108px] h-[108px] shrink-0 rounded-full overflow-hidden border-2 border-white/40 shadow-md bg-slate-100">
                  {member.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover object-top" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${member.gradient}`}>
                      <span className="text-2xl font-black text-white">{member.initials}</span>
                    </div>
                  )}
                </div>
                {/* Text content */}
                <div className="flex flex-col h-full justify-center min-w-0 flex-1">
                  <p className="text-white font-bold text-[14px] leading-tight mb-0.5">{member.name}</p>
                  <p className="text-white/80 text-[12px] font-semibold mb-2 leading-snug">{member.role}</p>
                  <div className="overflow-y-auto flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    <p className="text-white/90 text-[12px] leading-relaxed text-pretty pb-1">
                      {member.bio}
                    </p>
                  </div>
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
          <div className="absolute inset-0 bg-gradient-to-br from-[#0c9344] via-[#0c9344] to-[#0c9344]" />
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
                className="px-8 py-4 bg-white text-[#0c9344] font-extrabold rounded-xl text-base flex items-center gap-3 shadow-xl"
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
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#0c9344]/20 to-[#0c9344]/20 blur-2xl rounded-[2.5rem]" />

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
                <div className="absolute inset-0 bg-gradient-to-tr from-[#0c9344]/20 to-transparent pointer-events-none" />
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
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#0c9344]/10 border border-[#0c9344]/15 text-[#0c9344] text-[11px] font-bold uppercase tracking-[0.15em] mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              See JudicialGPT in Action
            </div>

            <h2 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-slate-900 mb-6 leading-tight tracking-tight">
              Experience the Future of <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0c9344] to-[#0c9344]">AI-Powered Legal Assistance</span>
            </h2>

            <p className="text-slate-600 text-lg leading-relaxed mb-8">
              JudicialGPT combines advanced artificial intelligence with legal expertise to help users analyze legal documents, answer complex legal questions, and provide instant legal insights. Whether you're a lawyer, student, or individual seeking legal guidance, JudicialGPT makes legal information more accessible, accurate, and efficient.
            </p>

            <ul className="space-y-4">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-[#0c9344]/15 flex items-center justify-center shrink-0">
                    <Check className="w-4 h-4 text-[#0c9344]" />
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
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#0c9344]" />
          <Scale className="absolute inset-0 m-auto w-5 h-5 text-[#0c9344]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-body">
      <Header />
      <HeroSection />
      <TrustBarSection />
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

