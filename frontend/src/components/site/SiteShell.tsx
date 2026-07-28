import React from 'react';

export const SiteFooter = () => {
  return (
    <footer className="w-full py-6 text-center text-slate-500 bg-white border-t border-slate-100">
      <p>&copy; {new Date().getFullYear()} JudicialGPT. All rights reserved.</p>
    </footer>
  );
};
