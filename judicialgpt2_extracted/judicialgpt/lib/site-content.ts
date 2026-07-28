/** Shared JudicialGPT content sourced from the website + JudicialGPT.pptx */

export const SITE = {
  name: 'JudicialGPT',
  tagline: 'AI Assists, Judges Decide',
  url: 'https://judicialgpt.org/',
  email: 'Usman.Ghani@kics.edu.pk',
  description:
    'AI-powered legal intelligence platform making legal assistance accessible and affordable for everyone.',
  stats: [
    { value: '2.4M', label: 'Legal Documents Analyzed' },
    { value: '10K', label: 'Active Users' },
    { value: '500+', label: 'Law Firms' },
    { value: '200+', label: 'Judges in Pilot Feedback' },
  ],
} as const;

export const PROBLEM = {
  title: 'Why JudicialGPT',
  points: [
    'Over 2.26 million pending cases nationwide; the backlog increases annually.',
    'Judges spend 60–70% of their time on research, drafting, and reviewing records.',
    'Rising volume of multilingual evidence (Urdu / English / scanned files).',
    'Generic tools like ChatGPT risk data breaches and high costs (estimated PKR 100M/year for ~1,600 judges).',
    'Cognitive overload risks inconsistency and delay — the problem is not lack of competence, but lack of judicial bandwidth.',
  ],
};

export const AIMS = {
  objective:
    'To reduce judicial cognitive load while preserving judicial independence.',
  aims: [
    'Assist judges in research, drafting, and comprehension.',
    'Ensure faster, well-reasoned, and consistent judgments.',
    'Keep all judicial data secure, local, and controlled.',
  ],
  vision: [
    'Empower judges with AI decision support.',
    'Reduce research time and enhance cognitive scalability.',
    'Provide bilingual legal intelligence (Urdu & English).',
    'Ensure ethical, transparent, and explainable AI in the judiciary.',
    'Support automation across the judicial system in Pakistan.',
  ],
};

export const CORE_FEATURES = [
  {
    title: 'QnA & Legal Research',
    description:
      'Ask complex legal questions in plain language and retrieve relevant precedents within minutes — with bilingual reasoning across Urdu and English.',
  },
  {
    title: 'Judgment Drafting',
    description:
      'Draft judgment skeletons covering facts, issues, and applicable law. Reduce drafting time significantly while keeping the judge firmly in control.',
  },
  {
    title: 'OCR Technology',
    description:
      'Extract and understand text from scanned Urdu and English documents so bulky paper records become searchable intelligence.',
  },
  {
    title: 'Voice Input',
    description:
      'Give instructions through voice mode with Whisper-powered transcription — built for judges, stenographers, and court staff.',
  },
  {
    title: 'File Attach & Summarization',
    description:
      'Attach case files, FIRs, and lengthy records. JudicialGPT summarizes bulky materials and helps analyze arguments side-by-side.',
  },
  {
    title: 'Web Search Integration',
    description:
      'Augment research with grounded web search when appropriate, while keeping judicial workflows citation-aware and traceable.',
  },
];

export const AI_TOOLS = [
  {
    slug: 'chatbot',
    title: 'JudicialGPT AI Chatbot',
    badge: 'Core Tool',
    description:
      'Trained on an extensive database of legal cases with real-time updates including new judgments and amendments. Personalized, human-like interactions for legal queries.',
    features: [
      'Real-time Legal Updates',
      'Case Law Database',
      'NLP',
      'Contextual Understanding',
      'PLG',
      'Instant Citation Support',
    ],
  },
  {
    slug: 'case-prism',
    title: 'Case Prism — Research Tool',
    badge: 'Research',
    description:
      'Proprietary legal research for comprehensive case analysis across millions of cases, statutes, and legal documents with advanced filtering and relevance ranking.',
    features: ['Advanced search filters', 'Citation analysis', 'Precedent mapping', 'Export capabilities'],
  },
  {
    slug: 'consultant',
    title: 'Virtual Legal Consultant',
    badge: 'Consultation',
    description:
      '24/7 AI-powered virtual consultation to understand your case better, explore potential outcomes, and get strategic recommendations without the wait.',
    features: ['Outcome prediction', 'Strategy suggestions', 'Risk assessment', 'Available 24/7'],
  },
];

export const DATA_SOURCES = [
  {
    title: 'Case Law Bulletins',
    detail: 'Updated every 15 days with summaries of Supreme Court & High Courts judgments.',
  },
  {
    title: 'Pakistan Law Books',
    detail: '15 key statutes covering civil, criminal, procedural, and commercial law.',
  },
  {
    title: 'Supreme Court Research Data',
    detail: 'Historical judgments and hearing records for deeper research context.',
  },
  {
    title: 'Judiciary Case Files',
    detail: '758+ files shared by judges — continuously growing for domain relevance.',
  },
  {
    title: 'Bilingual Data Preparation',
    detail: 'Q&A pairs in Urdu & English (JSONL) for AI training and evaluation.',
  },
];

export const TECH_STACK = {
  frontend: 'Next.js & Tailwind CSS',
  backend: 'Node.js + Express.js for authentication, API handling, and system logic',
  database: 'PostgreSQL (locally hosted) for case references, user data, and logs',
  models: [
    'GPT-oss 120B with in-context learning',
    'LLaMA 3.1 8B custom-trained on bilingual judicial data',
    'Whisper for voice-to-text',
    'Google Vision for scanned document reading',
    'Google Web Search API (when enabled)',
    'RAG implemented with guard railing',
  ],
};

export const SECURITY = [
  'HTTPS enforced with SSL/TLS and OV certificate',
  'Role-Level Security (RLS) for admin and user access',
  'Web Application Firewall, ModSecurity, and Cloudflare',
  'Protections against session hijacking, SQL injection, and XSS',
  'CSP, CORS restrictions, and security headers',
  'Restricted file uploads and input validation',
  'Bot protection, geo-blocking, and traffic filtering',
  'Local database hosting — AI models on private servers',
  'All data encrypted at rest and in transit',
  'No judicial data sent to foreign servers',
  'Activity logging, backups, and continuous vulnerability patching',
];

export const RELIABILITY = [
  'Model trained on relevant judicial and statutory data',
  'Retrieval-based answers (RAG) — no free-text guessing',
  'Mandatory citation of sources whenever possible',
  'Confidence scoring and uncertainty flags',
  'Extensive prompt engineering for judicial workflows',
  'Judges can always trace reasoning back to documents',
  'Prefer no answer over an incorrect answer',
  'Human-in-the-loop learning (RLHF) from judicial feedback',
];

export const IMPACT = {
  judges: [
    'Faster legal research and access to relevant precedents within minutes',
    'Significant reduction in drafting time through AI-assisted Judgment Writer',
    'Improved consistency and accuracy in legal reasoning and referencing',
    'Greater confidence handling multilingual evidence (Urdu, Punjabi, English)',
  ],
  staff: [
    'Efficient voice-to-text transcription in Urdu and regional languages',
    'Simplified editing and summarization of lengthy case documents',
    'Reduced workload and faster preparation of court proceedings',
  ],
  system: [
    'Enhanced data privacy — judicial data stays within Pakistan',
    'Greater accessibility through regional language support',
    'Quicker case processing and fewer delays',
    'Lower operational costs vs foreign AI subscriptions',
  ],
};

export const TEAM = [
  {
    name: 'Prof. Dr. M. Usman Ghani Khan',
    role: 'Founder',
    bio: 'Founded JudicialGPT to make quality legal assistance accessible through AI. Sets company strategy, product vision, and partnerships.',
  },
  {
    name: 'Ayesha Azam',
    role: 'Team Lead',
    bio: 'Coordinates engineering delivery, sprint planning, and cross-functional collaboration to ship reliable AI-powered legal features.',
  },
  {
    name: 'Syed Ali Hassan',
    role: 'Lead Developer / AI Engineer',
    bio: 'Architects the full-stack platform and fine-tunes AI models for legal document analysis and intelligent query responses.',
  },
  {
    name: 'Zubaid Rasool',
    role: 'Full-Stack & DevOps Engineer',
    bio: 'Builds frontend and backend features while managing CI/CD, infrastructure, and cloud deployment workflows.',
  },
  {
    name: 'Laiba Saleem',
    role: 'Data Analyst',
    bio: 'Analyzes engagement metrics, legal dataset patterns, and model performance to drive data-informed product decisions.',
  },
  {
    name: 'Dr. Abdul Nasir',
    role: 'Legal Domain Expert',
    bio: 'As Registrar of the Lahore High Court, validates legal accuracy and ensures JudicialGPT meets professional judicial standards.',
  },
];

export const FOOTER_LINKS = {
  Product: [
    { name: 'Features', href: '/features' },
    { name: 'AI Tools', href: '/ai-tools' },
    { name: 'API', href: '/api-platform' },
  ],
  Company: [
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Careers', href: '/careers' },
    { name: 'Contact', href: '/contact' },
  ],
  Legal: [
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Cookie Policy', href: '/cookies' },
  ],
  Support: [
    { name: 'Help Center', href: '/help' },
    { name: 'Documentation', href: '/docs' },
    { name: 'Community', href: '/community' },
  ],
} as const;

export const BLOG_POSTS = [
  {
    slug: 'why-judicialgpt',
    title: 'Why JudicialGPT: Bandwidth, Not Competence',
    category: 'Insight',
    date: 'March 12, 2026',
    excerpt:
      'Pakistan faces over 2.26 million pending cases. Judges spend most of their time on research and drafting. Here is how AI decision support can restore bandwidth without compromising independence.',
  },
  {
    slug: 'bilingual-legal-intelligence',
    title: 'Building Bilingual Legal Intelligence for Pakistan',
    category: 'Product',
    date: 'February 28, 2026',
    excerpt:
      'From Urdu OCR to bilingual Q&A pairs, JudicialGPT is designed for the multilingual reality of Pakistani courts — English, Urdu, and regional languages ahead.',
  },
  {
    slug: 'rag-not-guesswork',
    title: 'RAG, Citations, and Reducing Hallucination',
    category: 'Engineering',
    date: 'February 10, 2026',
    excerpt:
      'How retrieval-augmented generation, mandatory source citations, uncertainty flags, and judicial RLHF keep answers grounded in real documents.',
  },
  {
    slug: 'pja-pilot-feedback',
    title: 'Lessons from 200+ Judges in PJA Pilot Testing',
    category: 'Impact',
    date: 'January 22, 2026',
    excerpt:
      'Launched in Punjab Judicial Academy trainings, JudicialGPT is delivering faster research, improved drafting support, and weekly refinements from real courtroom workflows.',
  },
  {
    slug: 'security-by-design',
    title: 'Security by Design: Keeping Judicial Data in Pakistan',
    category: 'Security',
    date: 'January 8, 2026',
    excerpt:
      'Local hosting, private model deployment, encryption, WAF, and role-based access — the controls that keep sensitive judicial data under institutional control.',
  },
  {
    slug: 'judgment-writer',
    title: 'Inside the Judgment Writer Workflow',
    category: 'Product',
    date: 'December 18, 2025',
    excerpt:
      'How JudicialGPT helps draft judgment skeletons — facts, issues, and law — while ensuring the judge remains the final decision-maker.',
  },
];

export const CAREERS = [
  {
    title: 'AI Engineer — Legal NLP',
    type: 'Full-time',
    location: 'Lahore / Hybrid',
    summary:
      'Fine-tune bilingual models, improve RAG pipelines, and ship citation-aware features for judicial research and drafting.',
  },
  {
    title: 'Full-Stack Engineer',
    type: 'Full-time',
    location: 'Lahore / Hybrid',
    summary:
      'Build Next.js experiences and Node.js APIs that power secure legal workflows for judges, staff, and professionals.',
  },
  {
    title: 'Legal Domain Researcher',
    type: 'Full-time',
    location: 'Lahore',
    summary:
      'Curate statutes, precedents, and judgment structures. Partner with engineers to validate accuracy for high-stakes use.',
  },
  {
    title: 'DevOps / Security Engineer',
    type: 'Full-time',
    location: 'Lahore',
    summary:
      'Harden local infrastructure, CI/CD, WAF, monitoring, and compliance for privacy-first judicial deployments.',
  },
  {
    title: 'Product Designer',
    type: 'Full-time',
    location: 'Remote-friendly',
    summary:
      'Design clear, trustworthy interfaces for legal research, voice input, OCR review, and judgment drafting flows.',
  },
];

export const FAQ = [
  {
    q: 'What is JudicialGPT?',
    a: 'JudicialGPT is an AI-powered legal intelligence platform that assists with legal research, case analysis, document review, judgment drafting support, OCR, and bilingual Q&A — while keeping humans (and judges) firmly in control of decisions.',
  },
  {
    q: 'Is JudicialGPT a replacement for judges or lawyers?',
    a: 'No. Our principle is “AI Assists, Judges Decide.” The platform reduces cognitive load and research time; professional judgment and independence remain with the user.',
  },
  {
    q: 'How does JudicialGPT handle accuracy and hallucination?',
    a: 'Answers are retrieval-based (RAG), prefer cited sources, use guard rails, confidence/uncertainty signaling, and human-in-the-loop feedback. The system is designed to prefer no answer over an incorrect one.',
  },
  {
    q: 'Where is my data stored?',
    a: 'JudicialGPT emphasizes local/private infrastructure: locally hosted PostgreSQL, models on private servers, encryption in transit and at rest, and a design goal that judicial data is not sent to foreign servers.',
  },
  {
    q: 'Which languages are supported?',
    a: 'Current bilingual focus is English and Urdu, including OCR for scanned documents and voice input. Regional language expansion (Punjabi, Saraiki, Sindhi, Balochi) is part of the product roadmap.',
  },
  {
    q: 'Who has tested JudicialGPT?',
    a: 'JudicialGPT was launched in Punjab Judicial Academy trainings with 200+ judges providing favorable feedback, with weekly testing ongoing for refinements.',
  },
];
