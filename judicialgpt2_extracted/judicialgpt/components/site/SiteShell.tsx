'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Scale, Menu, X, Twitter, Linkedin, Github, Mail, Lock, Shield, ChevronRight, ArrowRight,
} from 'lucide-react';
import { FOOTER_LINKS, SITE } from '@/lib/site-content';

export const SCROLL_VIEWPORT = { once: true, amount: 0.28, margin: '0px 0px -12% 0px' } as const;

export function FadeIn({
  children,
  className = '',
  delay = 0,
  y = 32,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={SCROLL_VIEWPORT}
      transition={{ duration: 0.55, delay, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function SiteHeader({ light = true }: { light?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navItems = [
    { name: 'Features', href: '/features' },
    { name: 'AI Tools', href: '/ai-tools' },
    { name: 'About', href: '/about' },
    { name: 'Docs', href: '/docs' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled || !light
          ? 'bg-white/96 backdrop-blur-2xl shadow-sm shadow-slate-900/5 border-b border-slate-200/70'
          : 'bg-[#F2FBF6]/90 backdrop-blur-xl border-b border-emerald-100/60'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-[4.5rem]">
          <button
            type="button"
            className="flex items-center gap-2.5 cursor-pointer flex-shrink-0"
            onClick={() => router.push('/')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-600/30">
              <Scale className="w-[18px] h-[18px] text-white" />
            </div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Judicial<span className="text-emerald-500">GPT</span>
            </span>
          </button>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  pathname === item.href
                    ? 'text-emerald-700 bg-emerald-50'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-emerald-50/80'
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="px-4 py-2.5 text-sm font-semibold rounded-lg text-slate-700 hover:bg-emerald-50 transition-all"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => router.push('/signup')}
              className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/35 transition-all"
            >
              Get Started Free
            </button>
          </div>

          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-lg text-slate-900 hover:bg-emerald-50"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden bg-white/98 backdrop-blur-2xl border-b border-slate-200">
          <div className="px-4 py-6 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 text-slate-700 font-medium rounded-xl hover:bg-emerald-50 hover:text-emerald-700"
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-4 flex gap-2">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="flex-1 px-4 py-3 text-sm font-semibold rounded-xl border border-slate-200"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => router.push('/signup')}
                className="flex-1 px-4 py-3 text-sm font-bold text-white rounded-xl bg-emerald-500"
              >
                Get Started
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[#F9FAFB] text-slate-500 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="py-14 lg:py-16 grid grid-cols-2 md:grid-cols-6 gap-10 lg:gap-12">
            <div className="col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4 w-fit">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/25">
                  <Scale className="w-[18px] h-[18px] text-white" />
                </div>
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  Judicial<span className="text-emerald-500">GPT</span>
                </span>
              </Link>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed max-w-xs">{SITE.description}</p>
              <div className="flex gap-2.5">
                {[Twitter, Linkedin, Github, Mail].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    aria-label={['Twitter', 'LinkedIn', 'GitHub', 'Email'][i]}
                    className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-slate-900 font-bold text-sm mb-4">{title}</h4>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-slate-500 text-sm hover:text-emerald-600 transition-colors duration-200"
                      >
                        {link.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </FadeIn>

        <FadeIn delay={0.1} y={20}>
          <div className="py-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-transparent">
            <p className="text-slate-400 text-sm">© 2026 JudicialGPT. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                SSL Secured
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                SOC 2 Compliant
              </span>
            </div>
          </div>
        </FadeIn>
      </div>
    </footer>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        <li>
          <Link href="/" className="hover:text-emerald-600 transition-colors">
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="hover:text-emerald-600 transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-800 font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHero({
  eyebrow,
  title,
  highlight,
  description,
  crumbs,
  children,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description: string;
  crumbs: { label: string; href?: string }[];
  children?: React.ReactNode;
}) {
  return (
    <section className="relative pt-12 pb-16 md:pt-16 md:pb-20 overflow-hidden bg-[#F2FBF6]">
      <div className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full bg-emerald-400/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[320px] h-[320px] rounded-full bg-teal-400/10 blur-3xl pointer-events-none" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={crumbs} />
        <FadeIn>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-5 bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {eyebrow}
          </div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-[3.4rem] font-semibold leading-[1.1] tracking-tight text-slate-900 max-w-4xl mb-5">
            {title}
            {highlight ? (
              <>
                <br />
                <span className="text-emerald-600">{highlight}</span>
              </>
            ) : null}
          </h1>
          <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl mb-8">{description}</p>
          {children}
        </FadeIn>
      </div>
    </section>
  );
}

export function PageCTA({
  title = 'Ready to transform your legal work?',
  description = 'Join judges, lawyers, and professionals already using JudicialGPT for faster research, drafting support, and bilingual legal intelligence.',
}: {
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  return (
    <section className="py-20 lg:py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="relative rounded-3xl overflow-hidden px-8 py-14 md:px-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-900" />
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.12) 1px, transparent 0)',
                backgroundSize: '28px 28px',
              }}
            />
            <div className="relative z-10">
              <h2 className="font-heading text-3xl md:text-4xl font-semibold text-white mb-4">{title}</h2>
              <p className="text-white/80 text-lg max-w-2xl mx-auto mb-8">{description}</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => router.push('/signup')}
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-emerald-700 font-extrabold rounded-xl shadow-xl hover:scale-[1.02] transition-transform"
                >
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </button>
                <Link
                  href="/contact"
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-white/12 text-white font-semibold rounded-xl border border-white/25 hover:bg-white/20 transition-colors"
                >
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden font-body">
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
