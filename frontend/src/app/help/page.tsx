'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, HelpCircle, Shield, Target, Rocket, ArrowRight, MessageCircle } from 'lucide-react';
import { FadeIn, PageCTA, PageHero, SiteShell } from '@/components/site/SiteShell';
import { FAQ } from '@/lib/site-content';

type Category = 'All' | 'Product' | 'Security' | 'Accuracy' | 'Getting Started';

const CATEGORY_META: Record<Exclude<Category, 'All'>, { icon: typeof HelpCircle; color: string }> = {
  Product: { icon: HelpCircle, color: 'bg-blue-50 text-blue-700 border-blue-200' },
  Security: { icon: Shield, color: 'bg-[#00a859]/10 text-[#00a859] border-[#00a859]/25' },
  Accuracy: { icon: Target, color: 'bg-violet-50 text-violet-700 border-violet-200' },
  'Getting Started': { icon: Rocket, color: 'bg-amber-50 text-amber-700 border-amber-200' },
};

const FAQ_WITH_CATEGORY = FAQ.map((item, i) => {
  const categories: Exclude<Category, 'All'>[] = [
    'Getting Started',
    'Product',
    'Accuracy',
    'Security',
    'Product',
    'Getting Started',
  ];
  return { ...item, category: categories[i] ?? 'Product' };
});

const CHIPS: Category[] = ['All', 'Product', 'Security', 'Accuracy', 'Getting Started'];

export default function HelpPage() {
  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FAQ_WITH_CATEGORY.filter((item) => {
      const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
      const matchesQuery =
        !q ||
        item.q.toLowerCase().includes(q) ||
        item.a.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory]);

  return (
    <SiteShell>
      <PageHero
        eyebrow="Support · Help Center"
        title="How can we"
        highlight="help you?"
        description="Search answers about JudicialGPT — from getting started and product features to security, accuracy, and the PJA pilot program."
        crumbs={[{ label: 'Support', href: '/help' }, { label: 'Help Center' }]}
      >
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search FAQs — e.g. data storage, accuracy, languages…"
            className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-200 bg-white shadow-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#00a859]/30 focus:border-[#00a859]"
            aria-label="Search help articles"
          />
        </div>
      </PageHero>

      <section className="py-12 lg:py-16 bg-white border-b border-slate-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap gap-2 mb-2">
            {CHIPS.map((chip) => {
              const meta = chip !== 'All' ? CATEGORY_META[chip] : null;
              const Icon = meta?.icon;
              const active = activeCategory === chip;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => {
                    setActiveCategory(chip);
                    setOpenIndex(null);
                  }}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all ${
                    active
                      ? 'bg-[#00a859] text-white border-[#00a859] shadow-md shadow-[#00a859]/20'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-[#00a859]/25 hover:bg-[#00a859]/10/50'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  {chip}
                </button>
              );
            })}
          </div>
          <p className="text-sm text-slate-500">
            {filtered.length} {filtered.length === 1 ? 'result' : 'results'}
            {query ? ` for "${query}"` : ''}
          </p>
        </div>
      </section>

      <section className="py-12 lg:py-16 bg-[#F7FAF8]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {filtered.length === 0 ? (
            <FadeIn>
              <div className="text-center py-16 px-6 rounded-2xl border border-dashed border-slate-300 bg-white">
                <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h2 className="font-heading text-xl font-semibold text-slate-900 mb-2">No matches found</h2>
                <p className="text-slate-500 text-sm mb-6">
                  Try a different search term or browse all categories.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setActiveCategory('All');
                  }}
                  className="text-[#00a859] font-semibold text-sm hover:underline"
                >
                  Clear filters
                </button>
              </div>
            </FadeIn>
          ) : (
            <div className="space-y-3">
              {filtered.map((item, i) => {
                const meta = CATEGORY_META[item.category];
                const Icon = meta.icon;
                const isOpen = openIndex === i;
                return (
                  <FadeIn key={item.q} delay={i * 0.03}>
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:border-[#00a859]/25 transition-colors">
                      <button
                        type="button"
                        onClick={() => setOpenIndex(isOpen ? null : i)}
                        className="w-full flex items-start gap-4 p-5 md:p-6 text-left"
                        aria-expanded={isOpen}
                      >
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide border shrink-0 ${meta.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          {item.category}
                        </span>
                        <span className="flex-1 font-bold text-slate-900 pr-4">{item.q}</span>
                        <span
                          className={`text-[#00a859] text-xl leading-none transition-transform ${isOpen ? 'rotate-45' : ''}`}
                        >
                          +
                        </span>
                      </button>
                      {isOpen && (
                        <div className="px-5 md:px-6 pb-5 md:pb-6 -mt-1">
                          <p className="text-slate-600 text-sm leading-relaxed pl-0 md:pl-[calc(7rem+1rem)]">
                            {item.a}
                          </p>
                        </div>
                      )}
                    </div>
                  </FadeIn>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <FadeIn>
            <div className="grid md:grid-cols-2 gap-5">
              <Link
                href="/docs"
                className="group p-6 rounded-2xl border border-slate-200 hover:border-[#00a859]/25 hover:shadow-lg hover:shadow-[#00a859]/5 transition-all"
              >
                <h3 className="font-bold text-slate-900 mb-2 group-hover:text-[#00a859] transition-colors">
                  Documentation
                </h3>
                <p className="text-slate-500 text-sm mb-3">
                  Architecture, features, security controls, and reliability design.
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#00a859]">
                  Browse docs <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
              <Link
                href="/contact"
                className="group p-6 rounded-2xl border border-[#00a859]/25 bg-[#00a859]/10/50 hover:bg-[#00a859]/10 transition-all"
              >
                <MessageCircle className="w-6 h-6 text-[#00a859] mb-3" />
                <h3 className="font-bold text-slate-900 mb-2">Still need help?</h3>
                <p className="text-slate-500 text-sm mb-3">
                  Contact our team for institutional deployments, pilot access, or technical support.
                </p>
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-[#00a859]">
                  Contact us <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            </div>
          </FadeIn>
        </div>
      </section>

      <PageCTA
        title="Ready to get started?"
        description="Create a free account or reach out for Punjab Judicial Academy pilot onboarding and institutional deployment."
      />
    </SiteShell>
  );
}
