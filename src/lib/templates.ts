import type { Template } from '../types';

export interface SeedTemplateTask {
  department_name: string;
  sub_name: string;
  group_name?: string;
  task_title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimate_min: number;
  subtasks?: string;
}

export const SEED_TEMPLATES: SeedTemplateTask[] = [
  // ─── Top-level general tasks (sub_name empty) ───
  { department_name: 'Tech', sub_name: '', group_name: 'General', task_title: 'Architecture review & technical spec doc', description: 'Review system design, data flows, and infrastructure requirements.', priority: 'high', estimate_min: 90, subtasks: 'Draft architecture diagram | Review API payload contracts | Estimate infrastructure capacity' },
  { department_name: 'Tech', sub_name: '', group_name: 'General', task_title: 'Setup repository, linting, & CI/CD workflow', description: 'Configure monorepo tooling, ESLint, Prettier, and GitHub Actions.', priority: 'high', estimate_min: 60, subtasks: 'Configure ESLint & Prettier | Setup pre-commit hooks | Write GitHub Actions CI workflow' },
  { department_name: 'Tech', sub_name: '', group_name: 'General', task_title: 'Security audit & vulnerability dependency scan', description: 'Run automated vulnerability audits and check third-party licenses.', priority: 'urgent', estimate_min: 60, subtasks: 'Run npm audit / dependency scan | Review environment variable access | Update outdated packages' },
  { department_name: 'Tech', sub_name: '', group_name: 'General', task_title: 'Sprint retrospective & technical debt backlog pruning', priority: 'medium', estimate_min: 45 },
  { department_name: 'Tech', sub_name: '', group_name: 'General', task_title: 'System performance monitoring & alert thresholds', priority: 'medium', estimate_min: 45 },

  { department_name: 'Marketing', sub_name: '', group_name: 'General', task_title: 'Define target audience personas and value proposition', description: 'Document key persona profiles, pain points, and messaging pillars.', priority: 'high', estimate_min: 90, subtasks: 'Conduct customer interview research | Outline core ICP personas | Draft differentiated value prop' },
  { department_name: 'Marketing', sub_name: '', group_name: 'General', task_title: 'Competitive landscape & positioning benchmark', priority: 'high', estimate_min: 75 },
  { department_name: 'Marketing', sub_name: '', group_name: 'General', task_title: 'Quarterly marketing OKRs & channel allocation', priority: 'urgent', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: '', group_name: 'General', task_title: 'Brand tone of voice & messaging guidelines document', priority: 'medium', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: '', group_name: 'General', task_title: 'Weekly cross-channel growth metrics review', priority: 'medium', estimate_min: 45 },

  { department_name: 'HR', sub_name: '', group_name: 'General', task_title: 'Quarterly headcount planning & hiring forecast', priority: 'high', estimate_min: 60 },
  { department_name: 'HR', sub_name: '', group_name: 'General', task_title: 'Employee engagement pulse survey & sentiment analysis', priority: 'medium', estimate_min: 45 },
  { department_name: 'HR', sub_name: '', group_name: 'General', task_title: 'Performance review cadence & evaluation templates', priority: 'high', estimate_min: 90 },
  { department_name: 'HR', sub_name: '', group_name: 'General', task_title: 'Team building event & offsite planning', priority: 'low', estimate_min: 45 },
  { department_name: 'HR', sub_name: '', group_name: 'General', task_title: 'Update company org chart & role definitions', priority: 'medium', estimate_min: 30 },

  { department_name: 'Finance', sub_name: '', group_name: 'General', task_title: 'Annual operating budget model & cash flow projections', priority: 'urgent', estimate_min: 120 },
  { department_name: 'Finance', sub_name: '', group_name: 'General', task_title: 'Monthly bank reconciliation & balance audit', priority: 'high', estimate_min: 60 },
  { department_name: 'Finance', sub_name: '', group_name: 'General', task_title: 'Tax compliance filing & documentation review', priority: 'urgent', estimate_min: 90 },
  { department_name: 'Finance', sub_name: '', group_name: 'General', task_title: 'SaaS subscription spend audit & vendor contract renegotiation', priority: 'medium', estimate_min: 60 },
  { department_name: 'Finance', sub_name: '', group_name: 'General', task_title: 'Investor update deck & financial metrics report', priority: 'high', estimate_min: 90 },

  { department_name: 'Design', sub_name: '', group_name: 'General', task_title: 'Design team sprint planning & asset intake queue', priority: 'high', estimate_min: 45 },
  { department_name: 'Design', sub_name: '', group_name: 'General', task_title: 'Design critique session & cross-functional feedback', priority: 'medium', estimate_min: 60 },
  { department_name: 'Design', sub_name: '', group_name: 'General', task_title: 'Figma component library audit & accessibility check', priority: 'high', estimate_min: 90 },
  { department_name: 'Design', sub_name: '', group_name: 'General', task_title: 'Design token alignment between Figma and Tailwind CSS', priority: 'high', estimate_min: 60 },
  { department_name: 'Design', sub_name: '', group_name: 'General', task_title: 'Creative inspiration moodboard & visual trends study', priority: 'low', estimate_min: 45 },

  { department_name: 'Operations', sub_name: '', group_name: 'General', task_title: 'Standard operating procedures (SOP) documentation', priority: 'high', estimate_min: 90 },
  { department_name: 'Operations', sub_name: '', group_name: 'General', task_title: 'Workspace tools and SaaS account access audit', priority: 'medium', estimate_min: 45 },
  { department_name: 'Operations', sub_name: '', group_name: 'General', task_title: 'Business continuity & data backup verification', priority: 'urgent', estimate_min: 60 },
  { department_name: 'Operations', sub_name: '', group_name: 'General', task_title: 'Company handbook & security compliance updates', priority: 'medium', estimate_min: 60 },
  { department_name: 'Operations', sub_name: '', group_name: 'General', task_title: 'Weekly operational bottleneck sync and resolution', priority: 'high', estimate_min: 45 },

  { department_name: 'Research', sub_name: '', group_name: 'General', task_title: 'Research problem framing & methodology outline', priority: 'high', estimate_min: 60 },
  { department_name: 'Research', sub_name: '', group_name: 'General', task_title: 'Secondary literature review & synthesis report', priority: 'medium', estimate_min: 90 },
  { department_name: 'Research', sub_name: '', group_name: 'General', task_title: 'Research repository tagging & insight organization', priority: 'low', estimate_min: 45 },
  { department_name: 'Research', sub_name: '', group_name: 'General', task_title: 'Executive summary & actionable insights presentation', priority: 'high', estimate_min: 60 },

  // ─── Tech Sub-departments ───
  // Tech > Design
  { department_name: 'Tech', sub_name: 'Design', group_name: 'Tokens & Foundations', task_title: 'Finalize design system typography and component tokens', priority: 'high', estimate_min: 90 },
  { department_name: 'Tech', sub_name: 'Design', group_name: 'Tokens & Foundations', task_title: 'Establish 8pt spacing grid and elevation shadows', priority: 'medium', estimate_min: 45 },
  { department_name: 'Tech', sub_name: 'Design', group_name: 'Tokens & Foundations', task_title: 'Create dark mode color variable mappings', priority: 'medium', estimate_min: 60 },
  { department_name: 'Tech', sub_name: 'Design', group_name: 'Components & Wireframes', task_title: 'Build interactive wireframes for task detail modal', priority: 'high', estimate_min: 60 },
  { department_name: 'Tech', sub_name: 'Design', group_name: 'Components & Wireframes', task_title: 'Design responsive tablet & mobile bottom navigation', priority: 'high', estimate_min: 60 },
  { department_name: 'Tech', sub_name: 'Design', group_name: 'Components & Wireframes', task_title: 'Prototype drag and drop pipeline card states', priority: 'urgent', estimate_min: 60 },
  { department_name: 'Tech', sub_name: 'Design', group_name: 'Micro-interactions', task_title: 'Define Framer Motion spring physics curves', priority: 'medium', estimate_min: 45 },
  { department_name: 'Tech', sub_name: 'Design', group_name: 'Micro-interactions', task_title: 'Design task completion celebration pulse effect', priority: 'low', estimate_min: 30 },

  // Tech > Frontend
  { department_name: 'Tech', sub_name: 'Frontend', group_name: 'Core UI', task_title: 'Implement Kanban drag-and-drop board with @dnd-kit', priority: 'urgent', estimate_min: 120 },
  { department_name: 'Tech', sub_name: 'Frontend', group_name: 'Core UI', task_title: 'Optimize mobile touch gestures and responsive tab strips', priority: 'high', estimate_min: 90 },
  { department_name: 'Tech', sub_name: 'Frontend', group_name: 'Core UI', task_title: 'Build shared TaskDetail modal with subtasks & notes', priority: 'urgent', estimate_min: 120 },
  { department_name: 'Tech', sub_name: 'Frontend', group_name: 'Performance', task_title: 'Optimize React Query cache invalidation & optimistic UI', priority: 'high', estimate_min: 60 },
  { department_name: 'Tech', sub_name: 'Frontend', group_name: 'Performance', task_title: 'Audit bundle size and configure code splitting', priority: 'medium', estimate_min: 45 },
  { department_name: 'Tech', sub_name: 'Frontend', group_name: 'Accessibility', task_title: 'Add keyboard navigation & focus trapping for modals', priority: 'high', estimate_min: 60 },
  { department_name: 'Tech', sub_name: 'Frontend', group_name: 'Accessibility', task_title: 'Screen reader aria-labels for icon buttons & stats', priority: 'medium', estimate_min: 45 },
  { department_name: 'Tech', sub_name: 'Frontend', group_name: 'State Management', task_title: 'Wire URL query parameters (?task=ID) for deeplinking', priority: 'high', estimate_min: 45 },

  // Tech > Backend
  { department_name: 'Tech', sub_name: 'Backend', group_name: 'API Endpoints', task_title: 'Write Apps Script batch update and CRUD endpoints', priority: 'urgent', estimate_min: 90 },
  { department_name: 'Tech', sub_name: 'Backend', group_name: 'API Endpoints', task_title: 'Implement batchDelete endpoint in Code.gs', priority: 'urgent', estimate_min: 60 },
  { department_name: 'Tech', sub_name: 'Backend', group_name: 'API Endpoints', task_title: 'Configure CORS-free text/plain payload handler', priority: 'high', estimate_min: 45 },
  { department_name: 'Tech', sub_name: 'Backend', group_name: 'Data Integrity', task_title: 'Enforce schema column header validation in setup()', priority: 'high', estimate_min: 45 },
  { department_name: 'Tech', sub_name: 'Backend', group_name: 'Data Integrity', task_title: 'Add database row locks / concurrency guard', priority: 'medium', estimate_min: 60 },
  { department_name: 'Tech', sub_name: 'Backend', group_name: 'Data Integrity', task_title: 'Implement automated spreadsheet backup trigger', priority: 'medium', estimate_min: 45 },
  { department_name: 'Tech', sub_name: 'Backend', group_name: 'Auth & Security', task_title: 'Script Properties API token authentication check', priority: 'urgent', estimate_min: 45 },
  { department_name: 'Tech', sub_name: 'Backend', group_name: 'Auth & Security', task_title: 'Rate-limiting & error payload normalization', priority: 'medium', estimate_min: 45 },

  // Tech > QA
  { department_name: 'Tech', sub_name: 'QA', group_name: 'Automated Testing', task_title: 'End-to-end Playwright tests for drag-and-drop board', priority: 'high', estimate_min: 90 },
  { department_name: 'Tech', sub_name: 'QA', group_name: 'Automated Testing', task_title: 'Test optimistic rollback when backend returns 500', priority: 'urgent', estimate_min: 60 },
  { department_name: 'Tech', sub_name: 'QA', group_name: 'Manual Verification', task_title: 'Cross-browser verification (Chrome, Firefox, Safari, Edge)', priority: 'medium', estimate_min: 60 },
  { department_name: 'Tech', sub_name: 'QA', group_name: 'Manual Verification', task_title: 'Mobile viewport audit on 390px, 414px, and 768px screens', priority: 'high', estimate_min: 60 },
  { department_name: 'Tech', sub_name: 'QA', group_name: 'Edge Cases', task_title: 'Validate rapid consecutive task completions', priority: 'medium', estimate_min: 45 },
  { department_name: 'Tech', sub_name: 'QA', group_name: 'Edge Cases', task_title: 'Offline mode simulation and reconnection synchronization', priority: 'high', estimate_min: 60 },
  { department_name: 'Tech', sub_name: 'QA', group_name: 'Edge Cases', task_title: 'Inspect browser console for zero unhandled exceptions', priority: 'urgent', estimate_min: 30 },
  { department_name: 'Tech', sub_name: 'QA', group_name: 'Edge Cases', task_title: 'Verify undo toast countdown and state restoration', priority: 'high', estimate_min: 45 },

  // Tech > Deployment
  { department_name: 'Tech', sub_name: 'Deployment', group_name: 'PWA & Build', task_title: 'Configure PWA service worker precaching and web manifest', priority: 'high', estimate_min: 45 },
  { department_name: 'Tech', sub_name: 'Deployment', group_name: 'PWA & Build', task_title: 'Verify production build bundle size and chunk splits', priority: 'medium', estimate_min: 45 },
  { department_name: 'Tech', sub_name: 'Deployment', group_name: 'PWA & Build', task_title: 'Generate standalone app icons (192px, 512px, maskable)', priority: 'low', estimate_min: 30 },
  { department_name: 'Tech', sub_name: 'Deployment', group_name: 'Hosting & CDN', task_title: 'Deploy preview environments with custom domain', priority: 'high', estimate_min: 60 },
  { department_name: 'Tech', sub_name: 'Deployment', group_name: 'Hosting & CDN', task_title: 'Configure HTTP cache headers and Brotli compression', priority: 'medium', estimate_min: 45 },
  { department_name: 'Tech', sub_name: 'Deployment', group_name: 'Monitoring', task_title: 'Setup error tracking and Core Web Vitals telemetry', priority: 'high', estimate_min: 45 },
  { department_name: 'Tech', sub_name: 'Deployment', group_name: 'Monitoring', task_title: 'Create rollback procedure documentation', priority: 'medium', estimate_min: 30 },
  { department_name: 'Tech', sub_name: 'Deployment', group_name: 'Monitoring', task_title: 'Smoke test live deployment checklist pass', priority: 'urgent', estimate_min: 30 },

  // ─── Marketing Sub-departments ───
  // Marketing > SEO
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'On-page', task_title: 'Keyword research & search intent mapping', description: 'Identify high-intent primary and secondary search queries and cluster by intent.', priority: 'high', estimate_min: 60, subtasks: 'Identify 10 seed keyword queries | Run competitor keyword ranking gap analysis | Cluster queries into intent groups | Assign target keywords to content pages' },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'On-page', task_title: 'Title tags and SERP snippet optimization', description: 'Review and refine title tags for click-through rate under 60 characters.', priority: 'medium', estimate_min: 45, subtasks: 'Audit current SERP snippet truncations | Draft engaging CTR hook variants | Validate brand name suffix format' },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'On-page', task_title: 'Meta descriptions & click-through optimization', description: 'Write compelling meta descriptions with active call-to-actions under 155 characters.', priority: 'low', estimate_min: 30, subtasks: 'Draft meta descriptions for top 5 pages | Verify character counts under 155 | Include primary keyword in copy' },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'On-page', task_title: 'H1-H3 heading structure & semantic tags', description: 'Fix nested heading hierarchy and semantic HTML structure.', priority: 'medium', estimate_min: 45, subtasks: 'Verify exactly one H1 per page | Ensure sequential heading order | Add semantic HTML5 section wrappers' },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'On-page', task_title: 'Internal linking architecture & anchor text', priority: 'high', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'On-page', task_title: 'Image alt text, lossless compression, and WebP', priority: 'low', estimate_min: 40 },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'On-page', task_title: 'URL structure & slug canonicalization', priority: 'medium', estimate_min: 30 },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'On-page', task_title: 'JSON-LD Schema markup & rich snippet validation', description: 'Implement Organization, SoftwareApplication, and FAQ schema markup.', priority: 'high', estimate_min: 60, subtasks: 'Add JSON-LD script to page head | Validate using Schema Validator tool | Test Google rich result eligibility' },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'On-page', task_title: 'Landing page content optimization & keyword density', priority: 'high', estimate_min: 90 },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'Off-page', task_title: 'Comprehensive backlink profile audit & toxic disavow', priority: 'medium', estimate_min: 75 },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'Off-page', task_title: 'High-authority guest post pitches & outreach', priority: 'high', estimate_min: 120 },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'Off-page', task_title: 'Digital PR outreach & brand mention acquisition', priority: 'high', estimate_min: 90 },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'Technical', task_title: 'XML sitemap validation & Search Console submission', description: 'Generate fresh XML sitemap index and submit to Google Search Console.', priority: 'medium', estimate_min: 30, subtasks: 'Generate XML sitemap file | Verify lastmod timestamps | Submit URL to Google Search Console' },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'Technical', task_title: 'Robots.txt rules and crawl budget optimization', priority: 'medium', estimate_min: 30 },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'Technical', task_title: 'Core Web Vitals optimization (LCP, FID, CLS)', priority: 'urgent', estimate_min: 120 },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'Local', task_title: 'Google Business profile optimization & citation audit', priority: 'medium', estimate_min: 45 },
  { department_name: 'Marketing', sub_name: 'SEO', group_name: 'Analytics', task_title: 'Setup GA4 custom exploration reports & goal conversions', priority: 'high', estimate_min: 60 },

  // Marketing > Sales
  { department_name: 'Marketing', sub_name: 'Sales', group_name: 'Lead Generation', task_title: 'Define ICP profile and lead qualification scoring rubric', priority: 'high', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: 'Sales', group_name: 'Lead Generation', task_title: 'Update core product pitch deck and customer slides', priority: 'high', estimate_min: 90 },
  { department_name: 'Marketing', sub_name: 'Sales', group_name: 'Lead Generation', task_title: 'Map CRM pipeline stages and conversion milestones', priority: 'medium', estimate_min: 45 },
  { department_name: 'Marketing', sub_name: 'Sales', group_name: 'Outbound', task_title: 'Write 4-stage outbound email sequence for warm leads', priority: 'high', estimate_min: 90 },
  { department_name: 'Marketing', sub_name: 'Sales', group_name: 'Outbound', task_title: 'Automate demo booking calendar links and follow-up emails', priority: 'medium', estimate_min: 45 },
  { department_name: 'Marketing', sub_name: 'Sales', group_name: 'Closing', task_title: 'Draft objection handling matrix and competitor comparison', priority: 'high', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: 'Sales', group_name: 'Closing', task_title: 'Establish tiered pricing proposals and contract terms', priority: 'urgent', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: 'Sales', group_name: 'Review', task_title: 'Weekly sales pipeline forecast and review cadence', priority: 'medium', estimate_min: 30 },

  // Marketing > Social Media
  { department_name: 'Marketing', sub_name: 'Social Media', group_name: 'Strategy', task_title: 'Monthly social content theme and publication schedule', priority: 'high', estimate_min: 90 },
  { department_name: 'Marketing', sub_name: 'Social Media', group_name: 'Strategy', task_title: 'Write product teaser thread with animated highlights', priority: 'high', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: 'Social Media', group_name: 'Production', task_title: 'Draft weekly thought leadership article on LinkedIn', priority: 'medium', estimate_min: 75 },
  { department_name: 'Marketing', sub_name: 'Social Media', group_name: 'Production', task_title: 'Record 3 feature micro-demo screen videos', priority: 'high', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: 'Social Media', group_name: 'Community', task_title: 'Community reply bank for common user questions', priority: 'low', estimate_min: 45 },
  { department_name: 'Marketing', sub_name: 'Social Media', group_name: 'Community', task_title: 'Social brand keyword monitoring & competitor alerts', priority: 'low', estimate_min: 30 },
  { department_name: 'Marketing', sub_name: 'Social Media', group_name: 'Outreach', task_title: 'Curate list of 20 niche creators for shoutouts', priority: 'medium', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: 'Social Media', group_name: 'Analytics', task_title: 'Review weekly social analytics and top impressions', priority: 'medium', estimate_min: 45 },

  // Marketing > SMM (paid ads)
  { department_name: 'Marketing', sub_name: 'SMM', group_name: 'Setup', task_title: 'Set up campaign tracking URLs with standard UTM parameters', priority: 'high', estimate_min: 45 },
  { department_name: 'Marketing', sub_name: 'SMM', group_name: 'Setup', task_title: 'Verify Meta & LinkedIn conversion tracking events', priority: 'urgent', estimate_min: 45 },
  { department_name: 'Marketing', sub_name: 'SMM', group_name: 'Creative', task_title: 'Write 5 ad copy headline and body variations for A/B testing', priority: 'high', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: 'SMM', group_name: 'Creative', task_title: 'Export ad banners in 1:1 square and 9:16 story formats', priority: 'medium', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: 'SMM', group_name: 'Targeting', task_title: 'Configure custom website visitor retargeting audience', priority: 'high', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: 'SMM', group_name: 'Budget', task_title: 'Set daily budget caps and target cost-per-acquisition (CPA)', priority: 'high', estimate_min: 45 },
  { department_name: 'Marketing', sub_name: 'SMM', group_name: 'Optimization', task_title: 'Check ROAS and prune underperforming ad sets', priority: 'high', estimate_min: 30 },
  { department_name: 'Marketing', sub_name: 'SMM', group_name: 'Optimization', task_title: 'Rotate creative angles to prevent audience ad fatigue', priority: 'medium', estimate_min: 45 },

  // Marketing > Content
  { department_name: 'Marketing', sub_name: 'Content', group_name: 'Long-form', task_title: 'Write comprehensive launch pillar blog post (1,500 words)', priority: 'high', estimate_min: 120 },
  { department_name: 'Marketing', sub_name: 'Content', group_name: 'Long-form', task_title: 'Interview customer for in-depth workflow case study', priority: 'medium', estimate_min: 90 },
  { department_name: 'Marketing', sub_name: 'Content', group_name: 'Announcements', task_title: 'Format release notes and changelog announcement', priority: 'medium', estimate_min: 45 },
  { department_name: 'Marketing', sub_name: 'Content', group_name: 'Visuals', task_title: 'Design visual comparison chart and infographic asset', priority: 'medium', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: 'Content', group_name: 'Video', task_title: 'Write video demo narrative script with timing markers', priority: 'high', estimate_min: 90 },
  { department_name: 'Marketing', sub_name: 'Content', group_name: 'Lead Magnets', task_title: 'Create downloadable PDF checklist lead magnet', priority: 'high', estimate_min: 120 },
  { department_name: 'Marketing', sub_name: 'Content', group_name: 'Newsletter', task_title: 'Curate bi-weekly industry newsletter dispatch', priority: 'medium', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: 'Content', group_name: 'Repurposing', task_title: 'Repurpose top blog findings into multi-slide deck', priority: 'low', estimate_min: 45 },

  // Marketing > Email
  { department_name: 'Marketing', sub_name: 'Email', group_name: 'Automations', task_title: 'Build 4-part automated onboarding email welcome journey', priority: 'urgent', estimate_min: 90 },
  { department_name: 'Marketing', sub_name: 'Email', group_name: 'Automations', task_title: 'Write win-back email sequence for 30-day inactive users', priority: 'high', estimate_min: 60 },
  { department_name: 'Marketing', sub_name: 'Email', group_name: 'Templates', task_title: 'Design clean responsive product announcement template', priority: 'medium', estimate_min: 45 },
  { department_name: 'Marketing', sub_name: 'Email', group_name: 'Deliverability', task_title: 'Verify transactional email trigger hooks and sender address', priority: 'high', estimate_min: 45 },
  { department_name: 'Marketing', sub_name: 'Email', group_name: 'Deliverability', task_title: 'Check SPF, DKIM, and DMARC DNS email deliverability records', priority: 'urgent', estimate_min: 30 },
  { department_name: 'Marketing', sub_name: 'Email', group_name: 'Testing', task_title: 'A/B test email subject lines with curiosity vs benefit hooks', priority: 'medium', estimate_min: 30 },
  { department_name: 'Marketing', sub_name: 'Email', group_name: 'Compliance', task_title: 'Configure subscription preference center and unsubscribe logic', priority: 'medium', estimate_min: 45 },
  { department_name: 'Marketing', sub_name: 'Email', group_name: 'List Hygiene', task_title: 'Clean unengaged subscribers to protect inbox sender score', priority: 'low', estimate_min: 30 },

  // ─── HR Sub-departments ───
  // HR > Recruitment
  { department_name: 'HR', sub_name: 'Recruitment', group_name: 'Planning', task_title: 'Draft job description and skill requirement rubric', priority: 'high', estimate_min: 60 },
  { department_name: 'HR', sub_name: 'Recruitment', group_name: 'Planning', task_title: 'Build structured interview question bank and grading rubric', priority: 'high', estimate_min: 60 },
  { department_name: 'HR', sub_name: 'Recruitment', group_name: 'Sourcing', task_title: 'Source top candidate profiles across specialist channels', priority: 'medium', estimate_min: 75 },
  { department_name: 'HR', sub_name: 'Recruitment', group_name: 'Sourcing', task_title: 'Review inbound resume submissions and screen candidates', priority: 'medium', estimate_min: 60 },
  { department_name: 'HR', sub_name: 'Recruitment', group_name: 'Offers', task_title: 'Prepare standardized offer letter package and benefits summary', priority: 'urgent', estimate_min: 45 },
  { department_name: 'HR', sub_name: 'Recruitment', group_name: 'Offers', task_title: 'Conduct background and professional reference checks', priority: 'high', estimate_min: 45 },
  { department_name: 'HR', sub_name: 'Recruitment', group_name: 'Process', task_title: 'Update hiring pipeline stages in applicant tracking system', priority: 'low', estimate_min: 30 },
  { department_name: 'HR', sub_name: 'Recruitment', group_name: 'Process', task_title: 'Candidate experience survey and feedback review', priority: 'low', estimate_min: 30 },

  // HR > Onboarding
  { department_name: 'HR', sub_name: 'Onboarding', group_name: 'Pre-boarding', task_title: 'Assemble new team member Welcome Guide and account kit', priority: 'high', estimate_min: 60 },
  { department_name: 'HR', sub_name: 'Onboarding', group_name: 'Pre-boarding', task_title: 'Set up software tool licenses and workspace permissions', priority: 'urgent', estimate_min: 45 },
  { department_name: 'HR', sub_name: 'Onboarding', group_name: 'First Week', task_title: 'Schedule 1-on-1 welcome sync with team leads', priority: 'medium', estimate_min: 30 },
  { department_name: 'HR', sub_name: 'Onboarding', group_name: 'First Week', task_title: 'Introduce buddy system and coffee chat pairings', priority: 'low', estimate_min: 30 },
  { department_name: 'HR', sub_name: 'Onboarding', group_name: 'Goal Setting', task_title: 'Establish 30-60-90 day milestone alignment doc', priority: 'medium', estimate_min: 45 },
  { department_name: 'HR', sub_name: 'Onboarding', group_name: 'Goal Setting', task_title: 'First month onboarding check-in and feedback session', priority: 'high', estimate_min: 45 },
  { department_name: 'HR', sub_name: 'Onboarding', group_name: 'Admin', task_title: 'Complete payroll enrollment and direct deposit forms', priority: 'urgent', estimate_min: 30 },
  { department_name: 'HR', sub_name: 'Onboarding', group_name: 'Admin', task_title: 'Confirm equipment delivery and hardware setup', priority: 'medium', estimate_min: 30 },

  // HR > Policies
  { department_name: 'HR', sub_name: 'Policies', group_name: 'Handbooks', task_title: 'Publish remote work, equipment, and personal stipend policy', priority: 'low', estimate_min: 60 },
  { department_name: 'HR', sub_name: 'Policies', group_name: 'Handbooks', task_title: 'Update code of conduct and workplace safety guidelines', priority: 'high', estimate_min: 60 },
  { department_name: 'HR', sub_name: 'Policies', group_name: 'Benefits', task_title: 'Annual benefits open enrollment communication memo', priority: 'medium', estimate_min: 45 },
  { department_name: 'HR', sub_name: 'Policies', group_name: 'Benefits', task_title: 'PTO tracking, sick leave, and parental leave procedures', priority: 'high', estimate_min: 45 },
  { department_name: 'HR', sub_name: 'Policies', group_name: 'Compliance', task_title: 'Mandatory cybersecurity and data privacy employee training', priority: 'urgent', estimate_min: 60 },
  { department_name: 'HR', sub_name: 'Policies', group_name: 'Compliance', task_title: 'Non-disclosure (NDA) and intellectual property agreements', priority: 'high', estimate_min: 45 },
  { department_name: 'HR', sub_name: 'Policies', group_name: 'Reviews', task_title: 'Annual policy review against revised employment laws', priority: 'medium', estimate_min: 60 },
  { department_name: 'HR', sub_name: 'Policies', group_name: 'Reviews', task_title: 'Publish updated employee FAQ document in company wiki', priority: 'low', estimate_min: 30 },

  // ─── Finance Sub-departments ───
  // Finance > Budgeting
  { department_name: 'Finance', sub_name: 'Budgeting', group_name: 'Forecasting', task_title: 'Departmental quarterly budget intake & variance analysis', priority: 'high', estimate_min: 90 },
  { department_name: 'Finance', sub_name: 'Budgeting', group_name: 'Forecasting', task_title: 'Runway calculation & scenario sensitivity modeling', priority: 'urgent', estimate_min: 75 },
  { department_name: 'Finance', sub_name: 'Budgeting', group_name: 'CapEx', task_title: 'Hardware & capital expenditure budget allocation', priority: 'medium', estimate_min: 45 },
  { department_name: 'Finance', sub_name: 'Budgeting', group_name: 'Review', task_title: 'Monthly budget vs actuals management presentation', priority: 'high', estimate_min: 60 },

  // Finance > Invoicing
  { department_name: 'Finance', sub_name: 'Invoicing', group_name: 'Accounts Receivable', task_title: 'Issue monthly customer recurring subscription invoices', priority: 'urgent', estimate_min: 45 },
  { department_name: 'Finance', sub_name: 'Invoicing', group_name: 'Accounts Receivable', task_title: 'Follow up on 30+ day overdue client receivables', priority: 'high', estimate_min: 45 },
  { department_name: 'Finance', sub_name: 'Invoicing', group_name: 'Operations', task_title: 'Stripe / merchant payout fee reconciliation', priority: 'medium', estimate_min: 45 },
  { department_name: 'Finance', sub_name: 'Invoicing', group_name: 'Operations', task_title: 'Update invoice template branding & payment terms', priority: 'low', estimate_min: 30 },

  // Finance > Expenses
  { department_name: 'Finance', sub_name: 'Expenses', group_name: 'Reimbursements', task_title: 'Audit employee travel & team expense submissions', priority: 'medium', estimate_min: 45 },
  { department_name: 'Finance', sub_name: 'Expenses', group_name: 'Corporate Cards', task_title: 'Corporate credit card statement reconciliation', priority: 'high', estimate_min: 60 },
  { department_name: 'Finance', sub_name: 'Expenses', group_name: 'Controls', task_title: 'Set approval workflows for purchases above $1,000', priority: 'high', estimate_min: 30 },
  { department_name: 'Finance', sub_name: 'Expenses', group_name: 'Controls', task_title: 'Identify duplicate or unused software licenses', priority: 'medium', estimate_min: 45 },

  // Finance > Reporting
  { department_name: 'Finance', sub_name: 'Reporting', group_name: 'Financial Statements', task_title: 'Compile monthly Profit & Loss (P&L) statement', priority: 'urgent', estimate_min: 90 },
  { department_name: 'Finance', sub_name: 'Reporting', group_name: 'Financial Statements', task_title: 'Balance sheet reconciliation & asset depreciation update', priority: 'high', estimate_min: 60 },
  { department_name: 'Finance', sub_name: 'Reporting', group_name: 'KPIs', task_title: 'Calculate Gross Margin, CAC, and LTV metrics', priority: 'high', estimate_min: 60 },
  { department_name: 'Finance', sub_name: 'Reporting', group_name: 'KPIs', task_title: 'Prepare board meeting financial summary packet', priority: 'high', estimate_min: 90 },

  // ─── Design Sub-departments ───
  // Design > Branding
  { department_name: 'Design', sub_name: 'Branding', group_name: 'Guidelines', task_title: 'Brand identity style guide & logo usage rules', priority: 'high', estimate_min: 90 },
  { department_name: 'Design', sub_name: 'Branding', group_name: 'Guidelines', task_title: 'Color palette accessibility contrast verification', priority: 'high', estimate_min: 45 },
  { department_name: 'Design', sub_name: 'Branding', group_name: 'Assets', task_title: 'Vector logo package exports (SVG, PNG, EPS, monochrome)', priority: 'medium', estimate_min: 45 },
  { department_name: 'Design', sub_name: 'Branding', group_name: 'Assets', task_title: 'Business card and slide deck corporate templates', priority: 'medium', estimate_min: 60 },

  // Design > UI/UX
  { department_name: 'Design', sub_name: 'UI/UX', group_name: 'Prototypes', task_title: 'High-fidelity Figma prototype for core dashboard', priority: 'urgent', estimate_min: 120 },
  { department_name: 'Design', sub_name: 'UI/UX', group_name: 'Prototypes', task_title: 'Interactive mobile drawer & bottom sheet specifications', priority: 'high', estimate_min: 75 },
  { department_name: 'Design', sub_name: 'UI/UX', group_name: 'User Testing', task_title: 'Run 5 usability test sessions on task navigation', priority: 'high', estimate_min: 90 },
  { department_name: 'Design', sub_name: 'UI/UX', group_name: 'User Testing', task_title: 'Synthesize usability test friction points into backlog', priority: 'medium', estimate_min: 60 },

  // Design > Graphics
  { department_name: 'Design', sub_name: 'Graphics', group_name: 'Marketing Assets', task_title: 'Hero illustration set for marketing homepage', priority: 'high', estimate_min: 90 },
  { department_name: 'Design', sub_name: 'Graphics', group_name: 'Marketing Assets', task_title: 'Social media announcement preview graphics (1200x630)', priority: 'medium', estimate_min: 45 },
  { department_name: 'Design', sub_name: 'Graphics', group_name: 'Iconography', task_title: 'Custom iconography set in 24px and 16px sizes', priority: 'medium', estimate_min: 60 },
  { department_name: 'Design', sub_name: 'Graphics', group_name: 'Iconography', task_title: 'Email newsletter header banner graphics', priority: 'low', estimate_min: 30 },

  // Design > Video
  { department_name: 'Design', sub_name: 'Video', group_name: 'Product Demos', task_title: '30-second product walkthrough motion teaser', priority: 'high', estimate_min: 120 },
  { department_name: 'Design', sub_name: 'Video', group_name: 'Product Demos', task_title: 'Feature spotlight GIF animations for changelog', priority: 'medium', estimate_min: 60 },
  { department_name: 'Design', sub_name: 'Video', group_name: 'Production', task_title: 'Audio mixing and sound effects for launch video', priority: 'medium', estimate_min: 60 },
  { department_name: 'Design', sub_name: 'Video', group_name: 'Production', task_title: 'Render video subtitles and multi-aspect ratio cuts', priority: 'low', estimate_min: 45 },

  // ─── Operations Sub-departments ───
  // Operations > Processes
  { department_name: 'Operations', sub_name: 'Processes', group_name: 'Documentation', task_title: 'Standardize customer onboarding process map', priority: 'high', estimate_min: 75 },
  { department_name: 'Operations', sub_name: 'Processes', group_name: 'Documentation', task_title: 'Cross-functional incident response runbook', priority: 'urgent', estimate_min: 60 },
  { department_name: 'Operations', sub_name: 'Processes', group_name: 'Automation', task_title: 'Zapier / webhook automation for new lead notifications', priority: 'medium', estimate_min: 45 },
  { department_name: 'Operations', sub_name: 'Processes', group_name: 'Automation', task_title: 'Automate weekly KPI rollup report to Slack', priority: 'medium', estimate_min: 45 },

  // Operations > Vendors
  { department_name: 'Operations', sub_name: 'Vendors', group_name: 'Vendor Management', task_title: 'Vendor SLA compliance and uptime tracking', priority: 'medium', estimate_min: 45 },
  { department_name: 'Operations', sub_name: 'Vendors', group_name: 'Vendor Management', task_title: 'Annual vendor contract renewal terms review', priority: 'high', estimate_min: 60 },
  { department_name: 'Operations', sub_name: 'Vendors', group_name: 'Procurement', task_title: 'Compare 3 IT equipment procurement suppliers', priority: 'medium', estimate_min: 60 },
  { department_name: 'Operations', sub_name: 'Vendors', group_name: 'Procurement', task_title: 'Establish vendor risk assessment checklist', priority: 'high', estimate_min: 45 },

  // Operations > Admin & Legal
  { department_name: 'Operations', sub_name: 'Admin & Legal', group_name: 'Compliance', task_title: 'GDPR / CCPA privacy policy & data processing agreements', priority: 'urgent', estimate_min: 90 },
  { department_name: 'Operations', sub_name: 'Admin & Legal', group_name: 'Compliance', task_title: 'Trademark and intellectual property registration check', priority: 'high', estimate_min: 60 },
  { department_name: 'Operations', sub_name: 'Admin & Legal', group_name: 'Corporate', task_title: 'Annual state corporation report filing', priority: 'urgent', estimate_min: 45 },
  { department_name: 'Operations', sub_name: 'Admin & Legal', group_name: 'Corporate', task_title: 'Maintain corporate records and cap table updates', priority: 'high', estimate_min: 45 },

  // ─── Research Sub-departments ───
  // Research > Planning
  { department_name: 'Research', sub_name: 'Planning', group_name: 'Scoping', task_title: 'Draft research plan with objectives & research questions', priority: 'high', estimate_min: 60 },
  { department_name: 'Research', sub_name: 'Planning', group_name: 'Scoping', task_title: 'Define participant screener criteria and quota', priority: 'high', estimate_min: 45 },
  { department_name: 'Research', sub_name: 'Planning', group_name: 'Logistics', task_title: 'Prepare participant consent forms and incentives', priority: 'medium', estimate_min: 30 },
  { department_name: 'Research', sub_name: 'Planning', group_name: 'Logistics', task_title: 'Test research interview recording setup & script', priority: 'medium', estimate_min: 30 },

  // Research > Data Collection
  { department_name: 'Research', sub_name: 'Data Collection', group_name: 'Interviews', task_title: 'Conduct 6 remote customer discovery interviews', priority: 'urgent', estimate_min: 180 },
  { department_name: 'Research', sub_name: 'Data Collection', group_name: 'Surveys', task_title: 'Launch quantitative product feedback survey (100+ responses)', priority: 'high', estimate_min: 90 },
  { department_name: 'Research', sub_name: 'Data Collection', group_name: 'Analytics', task_title: 'Analyze in-app user session recordings & drop-off paths', priority: 'medium', estimate_min: 60 },
  { department_name: 'Research', sub_name: 'Data Collection', group_name: 'Transcripts', task_title: 'Clean and transcribe interview audio recordings', priority: 'low', estimate_min: 60 },

  // Research > Analysis
  { department_name: 'Research', sub_name: 'Analysis', group_name: 'Synthesis', task_title: 'Affinity diagramming & recurring theme clustering', priority: 'high', estimate_min: 90 },
  { department_name: 'Research', sub_name: 'Analysis', group_name: 'Synthesis', task_title: 'Journey map of current user friction points', priority: 'high', estimate_min: 75 },
  { department_name: 'Research', sub_name: 'Analysis', group_name: 'Scoring', task_title: 'Quantify user willingness to pay and feature rankings', priority: 'medium', estimate_min: 60 },
  { department_name: 'Research', sub_name: 'Analysis', group_name: 'Scoring', task_title: 'Cross-tabulate survey results by customer company size', priority: 'medium', estimate_min: 45 },

  // Research > Reporting
  { department_name: 'Research', sub_name: 'Reporting', group_name: 'Deliverables', task_title: 'Synthesize research deck with video highlight clips', priority: 'urgent', estimate_min: 90 },
  { department_name: 'Research', sub_name: 'Reporting', group_name: 'Deliverables', task_title: 'Share actionable recommendations with product team', priority: 'high', estimate_min: 60 },
  { department_name: 'Research', sub_name: 'Reporting', group_name: 'Follow-up', task_title: 'Follow-up workshop to convert insights to backlog tasks', priority: 'high', estimate_min: 60 },
  { department_name: 'Research', sub_name: 'Reporting', group_name: 'Archive', task_title: 'Archive raw notes and recordings in research repository', priority: 'low', estimate_min: 30 },
];

export const INITIAL_MOCK_TEMPLATES: Template[] = SEED_TEMPLATES.map((tmpl, idx) => ({
  id: `tmpl_${idx + 1}`,
  department_name: tmpl.department_name,
  sub_name: tmpl.sub_name,
  group_name: tmpl.group_name || 'General',
  task_title: tmpl.task_title,
  description: tmpl.description || '',
  priority: tmpl.priority,
  estimate_min: tmpl.estimate_min,
  order: idx + 1,
  subtasks: tmpl.subtasks || '',
}));
