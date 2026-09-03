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
  const [open, setOpen] = useState(false);

  const navItems = [
    { name: 'Features', href: '/#features' },
    { name: 'How It Works', href: '/#how-it-works' },
    { name: 'AI Tools', href: '/#ai-tools' },
    { name: 'Team', href: '/#team' },
    { name: 'About', href: '/about' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-[9999] pt-3 sm:pt-3.5 px-3 sm:px-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white/85 backdrop-blur-xl border border-white/90 shadow-[0_6px_24px_rgba(0,0,0,0.05)] rounded-[20px] sm:rounded-[22px] px-3.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between transition-all">
          {/* Logo */}
          <button
            type="button"
            className="flex items-center gap-2 sm:gap-2.5 cursor-pointer flex-shrink-0"
            onClick={() => router.push('/')}
          >
            <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-[10px] bg-[#0c7a4b] flex items-center justify-center text-white shadow-sm shrink-0">
              <Scale className="w-4.5 h-4.5 text-white stroke-[2.2]" />
            </div>
            <span className="text-lg sm:text-[19px] font-black tracking-tight text-slate-900">
              Judicial<span className="text-[#0c7a4b]">GPT</span>
            </span>
          </button>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-5 xl:gap-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href === '/about' && pathname === '/about');
              return (
                <Link
                  key={item.name}
                  href={item.href}
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
                    <div className="w-4 h-[3px] bg-[#0c7a4b] rounded-full mt-0.5" />
                  ) : (
                    <div className="w-4 h-[3px] bg-transparent rounded-full mt-0.5 group-hover:bg-[#0c7a4b]/30 transition-colors" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-[14px] font-semibold text-slate-700 hover:text-slate-900 px-2.5 py-1.5 transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => router.push('/signup')}
              className="px-4.5 sm:px-5 py-2 text-[13.5px] font-bold text-white bg-[#0c7a4b] hover:bg-[#09633c] rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Get Started Free
            </button>
          </div>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-xl text-slate-900 hover:bg-slate-100"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden mt-2 max-w-5xl mx-auto bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl p-4 shadow-xl">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm text-slate-700 font-medium rounded-lg hover:bg-[#0c7a4b]/10 hover:text-[#0c7a4b]"
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="flex-1 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => router.push('/signup')}
                className="flex-1 py-2 text-xs font-bold text-white bg-[#0c7a4b] rounded-lg"
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
    <footer className="relative bg-[#0c9344]/15">
      <svg
        viewBox="0 0 1440 90"
        preserveAspectRatio="none"
        className="block w-full h-10 md:h-14 -mb-px"
        aria-hidden="true"
      >
        <path
          d="M0,55 C280,10 500,0 760,25 C1040,52 1220,85 1440,35 L1440,90 L0,90 Z"
          fill="rgba(12,147,68,0.15)"
        />
      </svg>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FadeIn>
          <div className="pb-8 grid grid-cols-2 md:grid-cols-6 gap-x-8 gap-y-8">
            <div className="col-span-2 pr-4">
              <Link href="/" className="flex items-center gap-2.5 mb-3 w-fit">
                <div className="w-8 h-8 rounded-xl bg-[#0c9344] flex items-center justify-center shadow-sm shadow-[#0c9344]/25">
                  <Scale className="w-4 h-4 text-white" />
                </div>
                <span className="text-lg font-extrabold text-slate-900 tracking-tight">
                  Judicial<span className="text-[#0c9344]">GPT</span>
                </span>
              </Link>
              <p className="text-slate-600 text-sm mb-4 leading-relaxed max-w-xs">{SITE.description}</p>
              <div className="flex gap-2">
                {[Twitter, Linkedin, Github, Mail].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    aria-label={['Twitter', 'LinkedIn', 'GitHub', 'Email'][i]}
                    className="w-8 h-8 rounded-full bg-[#0c9344] flex items-center justify-center text-white hover:bg-[#0a7d3a] transition-colors duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {Object.entries(FOOTER_LINKS).map(([title, links]) => (
              <div key={title}>
                <h4 className="text-slate-900 font-bold text-sm mb-3">{title}</h4>
                <ul className="space-y-2">
                  {links.map((link) => (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        className="text-slate-600 text-sm hover:text-[#0c9344] transition-colors duration-200"
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

        <div className="py-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#0c9344]/15">
          <p className="text-slate-500 text-xs">© 2026 JudicialGPT. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              Next-Generation Judicial Technology
            </span>
          </div>
        </div>
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
          <Link href="/" className="hover:text-[#0c9344] transition-colors">
            Home
          </Link>
        </li>
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            {item.href && i < items.length - 1 ? (
              <Link href={item.href} className="hover:text-[#0c9344] transition-colors">
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
    <section className="relative pt-12 pb-16 md:pt-16 md:pb-20 overflow-hidden bg-[#0c9344]/5">
      <div className="absolute top-0 right-0 w-[420px] h-[420px] rounded-full bg-[#0c9344]/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[320px] h-[320px] rounded-full bg-[#0c9344]/10 blur-3xl pointer-events-none" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={crumbs} />
        <FadeIn>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-[0.15em] mb-5 bg-[#0c9344]/10 text-[#0c9344] border border-[#0c9344]/25">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0c9344] animate-pulse" />
            {eyebrow}
          </div>
          <h1 className="font-heading text-4xl md:text-5xl lg:text-[3.4rem] font-semibold leading-[1.1] tracking-tight text-slate-900 max-w-4xl mb-5">
            {title}
            {highlight ? (
              <>
                <br />
                <span className="text-[#0c9344]">{highlight}</span>
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
            <div className="absolute inset-0 bg-gradient-to-br from-[#0c9344] via-[#0c9344] to-[#0c9344]" />
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
                  className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-[#0c9344] font-extrabold rounded-xl shadow-xl hover:scale-[1.02] transition-transform"
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
