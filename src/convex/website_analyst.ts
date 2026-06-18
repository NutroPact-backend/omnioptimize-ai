"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { vly } from "../lib/vly-integrations";

/**
 * ============================================================
 *  WEBSITE ANALYST — Deep crawl, content audit & friction mapping
 *
 *  Simulates a full-site deep crawl and produces:
 *  - Content inventory quality scores
 *  - Technical signal analysis (Core Web Vitals, mobile readiness)
 *  - Schema markup status
 *  - Conversion funnel mapping
 *  - Page-level friction points
 *  - Overall KPI scores
 * ============================================================
 */

interface FrictionPoint {
  pageUrl: string;
  issueType: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  recommendation?: string;
  metricValue?: string;
  confidence: number;
}

interface WebsiteAnalysisResult {
  success: boolean;
  summary?: string;
  overallScore?: number;
  confidence?: number;
  pagesCrawled?: number;
  readabilityScore?: number;
  keywordCoverage?: number;
  schemaHealthScore?: number;
  organicVisibilityIndex?: number;
  frictionPoints?: FrictionPoint[];
  conversionFunnelInsights?: string;
  recommendations?: string[];
  error?: string;
}

/**
 * Analyze website content, structure, and conversion readiness.
 */
export const analyzeWebsite = action({
  args: {
    projectId: v.id("projects"),
    url: v.string(),
    name: v.string(),
  },
  handler: async (_ctx, args): Promise<WebsiteAnalysisResult> => {
    const { url, name } = args;

    try {
      // Phase 1: Full content & technical audit
      const contentAudit = await vly.ai.completion({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert website analyst specializing in conversion optimization, SEO, and UX audit. " +
              "Analyze websites thoroughly and produce structured, data-driven reports.",
          },
          {
            role: "user",
            content: `Analyze the website "${name}" at URL: ${url}

Perform a comprehensive audit covering these dimensions:

1. **CONTENT_INVENTORY** — Assess the likely quality, depth, and structure of content on the site.
2. **TECHNICAL_SIGNALS** — Estimate Core Web Vitals health, mobile responsiveness, page speed concerns.
3. **SCHEMA_STATUS** — Evaluate likely structured data presence (Product, Organization, FAQ, Review, BreadcrumbList).
4. **READABILITY** — Assess the likely readability and clarity of the content.
5. **KEYWORD_COVERAGE** — Estimate the breadth and depth of topical keyword coverage.
6. **ORGANIC_VISIBILITY** — Estimate how visible the site likely is in search results.

Also identify 5-8 specific friction points that could harm conversion rates, such as:
- Form length, placement, or complexity issues
- CTA button visibility, placement, or messaging problems
- Page speed / load time concerns
- Navigation complexity or confusing user flows
- Mobile usability issues
- Trust signals (missing reviews, security badges, social proof)
- Checkout flow complexity

For each friction point, provide:
- pageUrl (use the main URL or sub-page paths)
- issueType (e.g., "page_speed", "cta_placement", "form_length", "navigation", "mobile_ux", "trust_signals", "checkout_flow")
- severity ("critical", "high", "medium", "low")
- description of the issue
- recommendation
- metricValue (e.g., ">3s load time", "6 form fields", "no mobile menu")
- confidence (0-1)

Return ONLY valid JSON in this exact shape:
{
  "pagesCrawled": <estimated number of pages>,
  "readabilityScore": <0-100>,
  "keywordCoverage": <0-100>,
  "schemaHealthScore": <0-100>,
  "organicVisibilityIndex": <0-100>,
  "overallScore": <0-100>,
  "summary": "<2-3 sentence analysis>",
  "conversionFunnelInsights": "<paragraph describing likely conversion funnel, key drop-off points, and optimization opportunities>",
  "frictionPoints": [
    {
      "pageUrl": "url or path",
      "issueType": "page_speed|cta_placement|form_length|navigation|mobile_ux|trust_signals|checkout_flow|content_gap|other",
      "severity": "critical|high|medium|low",
      "description": "Description of the friction point",
      "recommendation": "Actionable recommendation",
      "metricValue": "Relevant metric or estimate",
      "confidence": <0-1>
    }
  ],
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}`,
          },
        ],
        temperature: 0.3,
        maxTokens: 2500,
      });

      if (!contentAudit.success || !contentAudit.data) {
        throw new Error("Website analysis AI call failed: " + (contentAudit.error || "No response"));
      }

      const content = contentAudit.data.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse website analysis response");

      const result = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        summary: result.summary || "Website analysis completed.",
        overallScore: result.overallScore ?? 0,
        confidence: 0.85,
        pagesCrawled: result.pagesCrawled ?? 0,
        readabilityScore: result.readabilityScore ?? 0,
        keywordCoverage: result.keywordCoverage ?? 0,
        schemaHealthScore: result.schemaHealthScore ?? 0,
        organicVisibilityIndex: result.organicVisibilityIndex ?? 0,
        frictionPoints: (result.frictionPoints || []).map((fp: any) => ({
          pageUrl: fp.pageUrl || url,
          issueType: fp.issueType || "other",
          severity: fp.severity || "medium",
          description: fp.description || "",
          recommendation: fp.recommendation,
          metricValue: fp.metricValue,
          confidence: fp.confidence ?? 0.7,
        })),
        conversionFunnelInsights: result.conversionFunnelInsights || "",
        recommendations: result.recommendations || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Website analyst failed",
        overallScore: 0,
        frictionPoints: [],
        recommendations: [],
      };
    }
  },
});
