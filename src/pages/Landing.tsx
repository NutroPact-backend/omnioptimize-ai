import { useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Cpu,
  Crosshair,
  Database,
  Eye,
  FileSearch,
  GitBranch,
  Layers,
  LineChart,
  Menu,
  MessageSquare,
  Network,
  Radio,
  Search,
  Shield,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/* ───── Section anchors ───── */
const SECTIONS = [
  { id: "architecture", label: "Architecture" },
  { id: "analysis", label: "Analysis" },
  { id: "workflows", label: "Workflows" },
  { id: "accuracy", label: "Accuracy" },
  { id: "comparison", label: "Comparison" },
] as const;

/* ───── Easing constant ───── */
const EASE = [0.22, 1, 0.36, 1] as const;

/* ───── Reusable helpers ───── */
const fadeInUp = {
  initial: { opacity: 0, y: 32 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.6, ease: EASE },
};

const stagger = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.5, ease: EASE },
};

function SectionHeading({ number, title, subtitle }: { number: string; title: string; subtitle?: string }) {
  return (
    <motion.div className="mb-12 md:mb-16" {...fadeInUp}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-accent text-sm font-mono font-semibold tracking-widest">{number}</span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-3">
        {title}
      </h2>
      {subtitle && (
        <p className="text-lg text-muted-foreground max-w-3xl leading-relaxed">{subtitle}</p>
      )}
    </motion.div>
  );
}

function SpecCard({
  icon: Icon,
  title,
  children,
  className = "",
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div {...stagger}>
      <Card className={`group relative overflow-hidden border-border/60 bg-card p-6 md:p-8 transition-all duration-300 hover:shadow-lg hover:shadow-accent/5 hover:border-accent/20 hover:-translate-y-0.5 ${className}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-accent/[0.03] to-transparent rounded-bl-full pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-foreground mb-2">{title}</h3>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-1.5">
              {children}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

function InlineDownload({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

/* ───── Hero background ───── */
function HeroBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      {/* Soft gradient orbs */}
      <div className="absolute -top-48 -right-48 w-[600px] h-[600px] rounded-full bg-accent/[0.03] blur-3xl" />
      <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full bg-accent/[0.02] blur-3xl" />
      {/* Subtle grid */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}

/* ───── Architecture pillar card ───── */
type PillarMeta = {
  icon: React.ElementType;
  label: string;
  desc: string;
};
const ARCH_PILLARS: PillarMeta[] = [
  { icon: Brain, label: "Orchestrator", desc: "Meta-agent that decomposes goals, schedules sub-agents, and merges results" },
  { icon: Search, label: "Scout Agents", desc: "Crawl, audit, extract entities, analyze competitors, research keywords" },
  { icon: Zap, label: "Optimizer Agents", desc: "Generate schema, rewrite content, build entity links, tune for LLM extraction" },
  { icon: Shield, label: "Validator Agents", desc: "Run compliance, test extractions, benchmark KPIs, flag regressions" },
];

/* ───── Workflow pillar data ───── */
type WorkflowPillar = {
  id: string;
  icon: React.ElementType;
  accentClass: string;
  dotClass: string;
  label: string;
  desc: string;
  items: [string, string][];
};
const WORKFLOWS: WorkflowPillar[] = [
  {
    id: "seo",
    icon: Search,
    accentClass: "bg-blue-500/10 text-blue-500",
    dotClass: "bg-blue-500",
    label: "SEO Engine",
    desc: "Classic search optimization, supercharged by AI.",
    items: [
      ["Technical Audit Agent", "Scans for Core Web Vitals failures, mobile-rendering issues, crawl budget leaks, and structured-data errors. Auto-generates fix tickets with priority scores."],
      ["Content Gap Filler", "Compares existing content against competitor keyword clusters. Produces briefs for missing topics with target word count, suggested headings, and internal-linking candidates."],
      ["On-Page Optimizer", "Rewrites title tags, meta descriptions, H1s, and alt text to improve CTR and keyword alignment. A/B tests variations via Google Search Console data when available."],
      ["Link Equity Optimizer", "Analyzes internal link distribution and suggests link additions from high-authority pages to orphaned or low-visibility pages. Detects and flags toxic backlinks."],
    ],
  },
  {
    id: "aeo",
    icon: MessageSquare,
    accentClass: "bg-amber-500/10 text-amber-500",
    dotClass: "bg-amber-500",
    label: "AEO Engine",
    desc: "Optimizing for direct answers in AI Overviews, featured snippets, and answer engines.",
    items: [
      ["Snippet Magnet Agent", "Identifies pages where a concise 40–60 word direct-answer paragraph can be inserted. Generates the answer paragraph + surrounding context optimized for extraction."],
      ["FAQ Schema Generator", "For every page with implicit Q&A content, generates FAQPage schema with proper @id chains. Validates against Google's structured-data testing tool."],
      ["List & Table Structurer", "Converts dense prose paragraphs into scannable bullet lists and comparison tables — formats proven to increase AI citation rates by 2-3x."],
      ["Zero-Click Recovery Agent", "For keywords where the AI answer already exists but cites a competitor, produces a delta-analysis and suggests specific factual additions to flip the citation."],
    ],
  },
  {
    id: "geo",
    icon: Brain,
    accentClass: "bg-purple-500/10 text-purple-500",
    dotClass: "bg-purple-500",
    label: "GEO Engine",
    desc: "Generative Engine Optimization — getting cited inside ChatGPT, Perplexity, and Gemini answers.",
    items: [
      ["Entity Authority Builder", "Ensures every person, brand, product, and concept on the site has a stable @id URI and is linked to Wikidata/Wikipedia where possible. Generates Organization + Person + Article schema clusters."],
      ["Citation Magnet Agent", "Analyzes which factual claims on the site are most likely to be extracted by RAG systems. Rewrites weak claims with verifiable data points, primary-source citations, and temporal freshness markers."],
      ["Conversational Context Optimizer", "Restructures content to mimic the Q&A format that LLMs prefer: direct answer → supporting evidence → deeper context. Runs extracted passages through a RAG simulator to check citation likelihood."],
      ["Multi-Format Syndicator", "Generates alternate content representations (tables, lists, definitions, summaries) from the same source content, increasing the surface area for AI extraction."],
    ],
  },
  {
    id: "llmo",
    icon: Cpu,
    accentClass: "bg-emerald-500/10 text-emerald-500",
    dotClass: "bg-emerald-500",
    label: "LLMO Engine",
    desc: "Large Language Model Optimization — tuning content for how models internalize and recall information.",
    items: [
      ["Prompt Alignment Agent", "Analyzes how the site's content is represented when an LLM is prompted with brand-related queries. Identifies hallucination risks, misattributions, and incomplete representations."],
      ["Knowledge Boundary Mapper", "Defines what the LLM should and should not say about the brand. Generates machine-readable brand guidelines (brand tone, factual assertions, disallowed claims) embedded as JSON-LD."],
      ["Training Signal Optimizer", "Ensures content follows patterns that positive-training-signal research has identified: high claim density, low ambiguity, clear temporal markers, and structured attributions."],
      ["Multilingual Consistency Agent", "For sites in multiple languages, ensures entity names, product descriptions, and brand claims are consistent across languages to prevent LLM confusion in cross-lingual retrieval."],
    ],
  },
];

/* ───── Comparison table data ───── */
const COMPARISON_ROWS: [string, string, string, string][] = [
  ["Autonomous multi-agent planning", "✅ Full orchestration with sub-agent dispatch", "⚠️ Manual campaign setup", "❌ Mostly manual"],
  ["Deep semantic crawl (JS rendered)", "✅ Headless browser + content fingerprinting", "⚠️ Basic XML sitemap crawl", "⚠️ Partial JS support"],
  ["Entity graph construction", "✅ Full @id graph with Wikidata cross-ref", "❌ Not available", "❌ Not available"],
  ["Schema markup generation", "✅ Auto-generates + validates JSON-LD", "❌ Not available", "⚠️ Basic generation"],
  ["AEO – Answer snippet optimization", "✅ Dedicated Snippet Magnet agent + RAG simulator", "❌ Not available", "❌ Not available"],
  ["GEO – LLM citation optimization", "✅ Multi-model RAG simulator + citation tracker", "✅ AI visibility tracking", "⚠️ Limited tracking"],
  ["LLMO – Prompt alignment", "✅ Hallucination audit + knowledge boundaries", "❌ Not available", "❌ Not available"],
  ["Multi-model citation tracking", "✅ ChatGPT, Gemini, Perplexity, Copilot, Claude", "✅ ChatGPT, Perplexity, Gemini", "⚠️ 1–2 models"],
  ["Self-healing rollback", "✅ Automated rollback on validation failure", "❌ Not available", "❌ Not available"],
  ["Real-time KPI dashboard", "✅ Live citation rate, schema health, entity coverage", "⚠️ Delayed reporting", "⚠️ Delayed reporting"],
  ["Competitor gap analysis", "✅ Automated + delta recommendations", "⚠️ Manual comparison", "⚠️ Basic gap analysis"],
  ["CI/CD integration", "✅ Webhooks + API-first design", "❌ Not available", "❌ Not available"],
  ["Multilingual consistency", "✅ Cross-language entity alignment", "❌ Not available", "❌ Not available"],
];

/* ───── Main component ───── */
export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-accent/20 selection:text-accent">
      <HeroBackground />

      {/* ─── Sticky Nav ─── */}
      <motion.header
        className="sticky top-0 z-50 w-full border-b border-transparent bg-background/80 supports-[backdrop-filter]:bg-background/60"
        style={{
          backdropFilter: useTransform(scrollYProgress, [0, 0.05], ["blur(0px)", "blur(8px)"]),
        }}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex items-center justify-between h-14 md:h-16">
          <a href="#" className="flex items-center gap-2.5 text-sm font-semibold tracking-tight">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="hidden sm:inline">Optimus</span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-secondary"
              >
                {s.label}
              </a>
            ))}
            <a
              href="#comparison"
              className="ml-3 inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              View Spec <ArrowRight className="w-3 h-3" />
            </a>
          </nav>

          {/* Mobile toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Mobile nav */}
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-border bg-card px-4 py-3 flex flex-col gap-1"
          >
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary transition-colors"
              >
                {s.label}
              </a>
            ))}
          </motion.div>
        )}
      </motion.header>

      <main className="relative">
        {/* ═══════════════════ HERO ═══════════════════ */}
        <section className="relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-4xl">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: EASE }}
              >
                <div className="flex items-center gap-2 mb-6">
                  <Badge variant="outline" className="text-xs font-mono tracking-wider text-accent border-accent/30 bg-accent/[0.04]">
                    v2.0 Specification
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-mono tracking-wider">
                    Agentic AI
                  </Badge>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.08] text-foreground mb-6">
                  The Agentic OS for{" "}
                  <span className="text-accent">AI-powered Visibility</span>
                </h1>

                <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-8">
                  A unified autonomous system that analyzes, optimizes, and validates every dimension of your
                  web presence&mdash;SEO, AEO, GEO, and LLMO&mdash;with surgical precision and zero human intervention.
                </p>

                <div className="flex flex-wrap items-center gap-3">
                  <a href="#architecture">
                    <Button size="lg" className="rounded-full text-sm gap-2">
                      Read the Spec <ArrowRight className="w-4 h-4" />
                    </Button>
                  </a>
                  <a href="#comparison">
                    <Button variant="outline" size="lg" className="rounded-full text-sm">
                      vs Grocliq.ai
                    </Button>
                  </a>
                </div>
              </motion.div>

              {/* Feature capsules */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
                className="mt-12 flex flex-wrap gap-2"
              >
                {[
                  "Autonomous Planning",
                  "Deep Crawl + Audit",
                  "Entity Graph Builder",
                  "Schema Generation",
                  "LLM Citation Tracking",
                  "Real-time Validation",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full bg-secondary text-secondary-foreground border border-border/50"
                  >
                    <CheckCircle2 className="w-3 h-3 text-accent" />
                    {tag}
                  </span>
                ))}
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ CORE ARCHITECTURE ═══════════════════ */}
        <section id="architecture" className="py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              number="01"
              title="Core Architecture"
              subtitle="An agentic AI framework that autonomously plans, executes, verifies, and learns across all four optimization domains."
            />

            {/* ── Framework diagram (visual) ── */}
            <motion.div {...fadeInUp} className="mb-14">
              <Card className="border-border/60 bg-card p-6 md:p-10">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
                  {ARCH_PILLARS.map(({ icon: Icon, label, desc }) => (
                    <div key={label} className="relative flex flex-col items-center text-center p-4 md:p-6 rounded-xl bg-secondary/50 border border-border/40">
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                        <Icon className="w-6 h-6 text-accent" />
                      </div>
                      <h4 className="text-sm font-semibold text-foreground mb-1.5">{label}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                    </div>
                  ))}
                </div>
                <div className="hidden md:flex justify-center mt-2 -mb-2">
                  <div className="flex gap-6 text-[10px] font-mono text-muted-foreground/50 tracking-wider uppercase">
                    <span>Parse →</span>
                    <span>Analyze →</span>
                    <span>Optimize →</span>
                    <span>Validate →</span>
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* ── Detail cards ── */}
            <div className="grid gap-6 md:grid-cols-2">
              <SpecCard icon={Cpu} title="Orchestrator Agent (Meta-Controller)">
                <ul className="space-y-1.5 list-disc pl-4 marker:text-accent/60">
                  <li>Receives a target URL or sitemap and produces an optimization plan with ranked milestones</li>
                  <li>Decomposes each milestone into parallel sub-tasks dispatched to Scout, Optimizer, and Validator agents</li>
                  <li>Maintains a shared state ledger — every agent reads/writes to a unified knowledge store (entity registry, content fingerprints, schema diff log)</li>
                  <li>Re-plans on failure: if a Validator flags a compliance violation, the Orchestrator re-queues with adjusted constraints</li>
                </ul>
              </SpecCard>

              <SpecCard icon={GitBranch} title="Feedback Loop & Self-Learning">
                <ul className="space-y-1.5 list-disc pl-4 marker:text-accent/60">
                  <li>After each optimization cycle, a meta-reviewer agent scores outcome deltas (citation rate delta, answer-box presence change, schema error count)</li>
                  <li>High-performing strategies are reinforced via an internal prompt-weight buffer; low-performing ones are retired</li>
                  <li>Weekly cross-domain coherence audit: ensures SEO title tags don&apos;t contradict LLMO entity assertions</li>
                  <li>All decisions are traceable — every mutation includes a provenance record (agent_id, timestamp, before/after hash)</li>
                </ul>
              </SpecCard>

              <SpecCard icon={Network} title="Multi-Model Connector Layer">
                <ul className="space-y-1.5 list-disc pl-4 marker:text-accent/60">
                  <li>Abstracts over OpenAI, Anthropic, Google Gemini, and open-source models (Llama, Mistral) for content generation &amp; extraction testing</li>
                  <li>Each model gets a citation-behavior profile — the system knows which models prefer bullet lists, which favor data tables, which penalize certain schema</li>
                  <li>Model-agnostic output normalizer ensures all generated content meets a baseline quality standard regardless of the underlying LLM</li>
                </ul>
              </SpecCard>

              <SpecCard icon={Radio} title="Real-Time Event Bus">
                <ul className="space-y-1.5 list-disc pl-4 marker:text-accent/60">
                  <li>All agents communicate through an event-driven bus (Redis Streams / NATS) for horizontal scalability</li>
                  <li>Progress events: <code className="text-xs bg-secondary px-1 rounded">crawl.page_discovered</code>, <code className="text-xs bg-secondary px-1 rounded">entity.extracted</code>, <code className="text-xs bg-secondary px-1 rounded">schema.generated</code>, <code className="text-xs bg-secondary px-1 rounded">validation.failed</code></li>
                  <li>External webhook hooks allow CI/CD pipelines to trigger re-optimization on deployment</li>
                </ul>
              </SpecCard>
            </div>
          </div>
        </section>

        {/* ═══════════════════ ANALYSIS PHASE ═══════════════════ */}
        <section id="analysis" className="py-16 md:py-24 border-t border-border/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              number="02"
              title="Analysis Phase"
              subtitle="The tool never acts on guesswork. Every optimization is preceded by a deep, multi-dimensional audit of the website, its content, its competitors, and the AI landscape."
            />

            <div className="grid gap-6 md:grid-cols-3 mb-12">
              <SpecCard icon={FileSearch} title="Deep Crawl & Content Audit">
                <ul className="space-y-1.5 list-disc pl-4 marker:text-accent/60">
                  <li>Headless-browser crawl with JS rendering — captures dynamic SPAs, lazy-loaded content, and client-side schema</li>
                  <li>Content fingerprinting via semantic hash: detects duplicate, thin, or orphaned pages</li>
                  <li>Readability scoring (Flesch–Kincaid, Dale–Chall) per page — AI models penalize impenetrable prose</li>
                  <li>Internal link-graph analysis: identifies link equity sinks, broken paths, and orphan content clusters</li>
                </ul>
              </SpecCard>

              <SpecCard icon={Crosshair} title="Competitor & SERP Intelligence">
                <ul className="space-y-1.5 list-disc pl-4 marker:text-accent/60">
                  <li>For each primary keyword, the tool fetches top-20 organic results plus AI Overview snippets via a SERP API</li>
                  <li>Extracts content patterns from competitors: average word count, heading structure, schema types used, entity density</li>
                  <li>AI answer audit: queries ChatGPT, Perplexity, Gemini, and Copilot with target questions and records which sources are cited and how</li>
                  <li>Identifies &ldquo;citation gaps&rdquo; — topics where competitors are cited but the target site is absent</li>
                </ul>
              </SpecCard>

              <SpecCard icon={Database} title="Entity Extraction & Knowledge Graph">
                <ul className="space-y-1.5 list-disc pl-4 marker:text-accent/60">
                  <li>Uses NLP pipelines (spaCy + custom NER fine-tuned on SEO/AEO entities) to extract people, places, products, concepts, and brand terms</li>
                  <li>Builds a site-level entity graph with <code className="text-xs bg-secondary px-1 rounded">@id</code> URIs, relationship edges, and salience scores</li>
                  <li>Cross-references extracted entities against Wikidata and Google Knowledge Graph to establish external authority signals</li>
                  <li>Entity coverage ratio: (% of known brand entities present on site) — used to score content completeness</li>
                </ul>
              </SpecCard>
            </div>

            {/* Analysis pipeline visual */}
            <motion.div {...fadeInUp}>
              <Card className="border-border/60 bg-card/50 p-6 md:p-8">
                <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-accent" />
                  Pre-Optimization Report — Generated for Every Target
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  {([
                    ["Pages crawled", "248", "All pages indexed + rendered"],
                    ["Entities found", "1,342", "87 with external KB matches"],
                    ["Schema errors", "23", "12 missing @id, 11 invalid JSON-LD"],
                    ["Citation score", "42/100", "Cited in 3 of 20 AI queries"],
                    ["Readability avg", "58.2", "Flesch: Fairly difficult"],
                    ["Keyword coverage", "67%", "Only 201 of 300 target KW covered"],
                    ["Competitor gap", "31 topics", "Cited by AI, absent from site"],
                    ["Link equity loss", "14%", "Pages with 0 internal links"],
                  ] as const).map(([label, value, detail]) => (
                    <div key={label} className="p-3 rounded-lg bg-secondary/40 border border-border/30">
                      <div className="text-muted-foreground mb-1">{label}</div>
                      <div className="text-lg font-semibold text-foreground">{value}</div>
                      <div className="text-muted-foreground/70 mt-0.5">{detail}</div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════ AUTOMATION WORKFLOWS ═══════════════════ */}
        <section id="workflows" className="py-16 md:py-24 border-t border-border/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              number="03"
              title="Automation Workflows"
              subtitle="Four specialized optimization engines, each with its own agent team, running in parallel and coordinated by the Orchestrator."
            />

            {WORKFLOWS.map((pillar) => (
              <motion.div key={pillar.id} {...fadeInUp} className="mb-14 last:mb-0">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`w-9 h-9 rounded-lg ${pillar.accentClass} flex items-center justify-center`}>
                    <pillar.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{pillar.label}</h3>
                    <p className="text-sm text-muted-foreground">{pillar.desc}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {pillar.items.map(([agent, detail]) => (
                    <Card key={agent} className="border-border/50 bg-card p-5 transition-all duration-300 hover:border-accent/20 hover:shadow-sm">
                      <h4 className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${pillar.dotClass}`} />
                        {agent}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{detail}</p>
                    </Card>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ═══════════════════ ACCURACY & PERFORMANCE ═══════════════════ */}
        <section id="accuracy" className="py-16 md:py-24 border-t border-border/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              number="04"
              title="Accuracy &amp; Performance"
              subtitle="Multi-layer validation guarantees that every change is correct, compliant, and measurable. The system never publishes blind."
            />

            <div className="grid gap-6 md:grid-cols-2 mb-12">
              <SpecCard icon={Shield} title="Validation Loops (Zero-Tolerance for Errors)">
                <ul className="space-y-1.5 list-disc pl-4 marker:text-accent/60">
                  <li><strong>Syntactic validation</strong> — every generated schema is run through a JSON-LD validator. Malformed output is rejected before any write operation.</li>
                  <li><strong>Semantic validation</strong> — after schema is deployed, a headless browser re-renders the page and confirms the structured data appears in the DOM and resolves correctly.</li>
                  <li><strong>Extraction validation</strong> — a RAG simulator re-crawls the optimized page and checks that target entities and answers are extractable. If extraction fails, the change is rolled back.</li>
                  <li><strong>Compliance validation</strong> — the tool checks against Google Webmaster Guidelines, OpenAI content policy, and accessibility (WCAG 2.2) to ensure no violations are introduced.</li>
                </ul>
              </SpecCard>

              <SpecCard icon={LineChart} title="Key Performance Indicators (KPIs)">
                <ul className="space-y-1.5 list-disc pl-4 marker:text-accent/60">
                  <li><strong>Citation Rate</strong> — % of target queries where the brand/site appears in top-3 AI-generated sources (measured across ChatGPT, Perplexity, Gemini, Copilot)</li>
                  <li><strong>Answer Box Presence</strong> — % of tracked keywords where AI Overviews or featured snippets cite the site</li>
                  <li><strong>Entity Coverage Score</strong> — weighted ratio of known brand entities present on-site vs. expected</li>
                  <li><strong>Schema Health Score</strong> — % of pages with valid, error-free structured data (target: 100%)</li>
                  <li><strong>Organic Visibility Index</strong> — aggregate ranking position trend for target keywords (weighted by search volume)</li>
                  <li><strong>Zero-Click Conversion</strong> — estimated attribution from AI-generated clicks (via UTM-tagged citations)</li>
                </ul>
              </SpecCard>

              <SpecCard icon={Crosshair} title="Error Handling & Rollback">
                <ul className="space-y-1.5 list-disc pl-4 marker:text-accent/60">
                  <li>Every write operation is transactional: before/after snapshots are stored in a versioned content store</li>
                  <li>If any validator in the chain fails, the Orchestrator automatically triggers a rollback to the last known-good state</li>
                  <li>Canary deployments: changes can be applied to a staging subdirectory or a sample page set first; if KPIs improve over 48h, changes are promoted site-wide</li>
                  <li>All rollbacks are logged with full diffs, agent attribution, and failure reason for audit trails</li>
                </ul>
              </SpecCard>

              <SpecCard icon={Eye} title="Monitoring & Alerting">
                <ul className="space-y-1.5 list-disc pl-4 marker:text-accent/60">
                  <li>Real-time dashboard: citation rate, schema health, entity coverage, and organic traffic all update within minutes of a change</li>
                  <li>Anomaly detection agent tracks KPI baselines and alerts if any metric drops below a configurable threshold</li>
                  <li>Weekly executive report: auto-generated summary of optimizations applied, KPI deltas, competitor movement, and recommended next actions</li>
                  <li>Integration with Slack, PagerDuty, and webhooks for critical alerts (e.g., schema outage, citation collapse)</li>
                </ul>
              </SpecCard>
            </div>

            {/* Accuracy badge */}
            <motion.div {...fadeInUp}>
              <Card className="border-accent/20 bg-accent/[0.02] p-6 md:p-8 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-semibold mb-4">
                  <Sparkles className="w-3.5 h-3.5" /> Target
                </div>
                <h3 className="text-2xl md:text-3xl font-semibold text-foreground mb-3">
                  99.97% Accuracy Target
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">
                  Based on <strong className="text-foreground">three-layer validation</strong> (syntax, extraction, compliance)
                  applied to every generated artifact. The remaining 0.03% accounts for edge cases in third-party API
                  changes — and the system auto-remediates those within one cycle.
                </p>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* ═══════════════════ COMPARISON ═══════════════════ */}
        <section id="comparison" className="py-16 md:py-24 border-t border-border/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              number="05"
              title="Comparison to Existing Solutions"
              subtitle="How Optimus compares to Grocliq.ai and other market tools across the dimensions that matter."
            />

            {/* Comparison table */}
            <motion.div {...fadeInUp}>
              <Card className="border-border/60 bg-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60">
                        <th className="text-left font-semibold text-foreground p-4 md:p-5 min-w-[180px]">Capability</th>
                        <th className="text-left font-semibold text-accent p-4 md:p-5 min-w-[140px]">Optimus</th>
                        <th className="text-left font-semibold text-muted-foreground p-4 md:p-5 min-w-[140px]">Grocliq.ai</th>
                        <th className="text-left font-semibold text-muted-foreground p-4 md:p-5 min-w-[140px]">Market Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COMPARISON_ROWS.map(([capability, optimus, grocliq, market], idx) => (
                        <tr key={capability} className={`border-b border-border/30 ${idx % 2 === 0 ? "bg-secondary/20" : ""} hover:bg-accent/[0.02] transition-colors`}>
                          <td className="p-4 md:p-5 text-foreground font-medium">{capability}</td>
                          <td className="p-4 md:p-5 text-accent text-xs leading-relaxed">{optimus}</td>
                          <td className="p-4 md:p-5 text-muted-foreground text-xs leading-relaxed">{grocliq}</td>
                          <td className="p-4 md:p-5 text-muted-foreground text-xs leading-relaxed">{market}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>

            {/* Key differentiators */}
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              <motion.div {...stagger}>
                <Card className="border-border/50 bg-card p-6 text-center h-full">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-5 h-5 text-accent" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">True Autonomy</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Unlike Grocliq which requires manual campaign setup and human interpretation, Optimus plans,
                    executes, validates, and iterates without user intervention.
                  </p>
                </Card>
              </motion.div>

              <motion.div {...stagger}>
                <Card className="border-border/50 bg-card p-6 text-center h-full">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Layers className="w-5 h-5 text-accent" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Unified Four-Domain Coverage</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Grocliq focuses primarily on GEO (AI visibility). Optimus covers SEO + AEO + GEO + LLMO
                    in a single coordinated system, ensuring no optimization domain is left behind.
                  </p>
                </Card>
              </motion.div>

              <motion.div {...stagger}>
                <Card className="border-border/50 bg-card p-6 text-center h-full">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                    <Shield className="w-5 h-5 text-accent" />
                  </div>
                  <h4 className="text-sm font-semibold text-foreground mb-2">Surgical Precision</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Three-layer validation (syntax, extraction, compliance) with automated rollback on failure
                    means zero regressions — something no existing tool guarantees.
                  </p>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ═══════════════════ CTA ═══════════════════ */}
        <section className="py-16 md:py-24 border-t border-border/50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
            <motion.div {...fadeInUp}>
              <Badge variant="outline" className="mb-6 text-xs font-mono tracking-wider text-accent border-accent/30 bg-accent/[0.04]">
                Ready for Implementation
              </Badge>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight text-foreground mb-4">
                Build the Future of AI Visibility
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8 leading-relaxed">
                This specification is ready for a development team to implement. The architecture, agent designs,
                validation protocols, and performance metrics are fully defined.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Button size="lg" className="rounded-full text-sm gap-2">
                  Start Implementing <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="lg" className="rounded-full text-sm">
                  <InlineDownload className="w-4 h-4 mr-1.5" /> Download PDF Spec
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-accent flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="font-medium text-foreground/70">Optimus</span>
          </div>
          <p>Agentic AI Specification v2.0 &mdash; Designed for implementation teams</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-foreground transition-colors">GitHub</a>
            <a href="#" className="hover:text-foreground transition-colors">Docs</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
