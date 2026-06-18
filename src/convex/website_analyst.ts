"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
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
 * Now consumes real crawled data from the HTTP crawler before
 * running AI analysis, replacing the previous fully simulated approach.
 */
export const analyzeWebsite = action({
  args: {
    projectId: v.id("projects"),
    url: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args): Promise<WebsiteAnalysisResult> => {
    const { url, name } = args;

    try {
      // Phase 1: Crawl the actual website to get real content
      const crawlResult = await ctx.runAction(internal.crawler.crawlAndExtract, {
        url,
        projectId: args.projectId,
      });

      // Build a rich content context from the real crawl data
      let crawlContext = "";
      if (crawlResult.success && crawlResult.mainPage) {
        const page = crawlResult.mainPage;
        crawlContext = [
          `=== REAL CRAWL DATA ===`,
          `URL: ${page.url}`,
          `Title: ${page.title}`,
          `Meta Description: ${page.metaDescription}`,
          `Word Count: ${page.wordCount}`,
          `Status Code: ${page.statusCode}`,
          `Content Type: ${page.contentType}`,
          page.canonicalUrl !== page.url ? `Canonical URL: ${page.canonicalUrl}` : "",
          page.ogTitle ? `OG Title: ${page.ogTitle}` : "",
          page.ogDescription ? `OG Description: ${page.ogDescription}` : "",
          page.ogImage ? `OG Image: ${page.ogImage}` : "",
          "",
          `=== HEADINGS STRUCTURE ===`,
          page.headings.h1.length > 0 ? `H1: ${page.headings.h1.join(" | ")}` : "No H1 found",
          page.headings.h2.length > 0 ? `H2s (${page.headings.h2.length}): ${page.headings.h2.slice(0, 10).join(" | ")}` : "No H2s found",
          page.headings.h3.length > 0 ? `H3s (${page.headings.h3.length}): ${page.headings.h3.slice(0, 10).join(" | ")}` : "",
          "",
          `=== LINKS ===`,
          `Internal Links: ${page.internalLinks.length}`,
          `External Links: ${page.externalLinks.length}`,
          "",
          `=== SCHEMA MARKUP (${page.schemaMarkup.length} blocks) ===`,
          page.schemaMarkup.length > 0
            ? page.schemaMarkup.slice(0, 5).map((s: any) => {
                try {                    const parsed = JSON.parse(s);
                    return `- @type: ${parsed["@type"] || "Unknown"}, context: ${parsed["@context"] || ""}`;
                } catch {
                  return "- (unparseable schema)";
                }
              }).join("\n")
            : "No JSON-LD schema found",
          "",
          `=== EXTRACTED ENTITIES ===`,
          crawlResult.extractedEntities.length > 0
            ? crawlResult.extractedEntities.slice(0, 20).join(", ")
            : "No entities extracted",
        ]
          .filter(Boolean)
          .join("\n");
      }

      // Phase 2: AI analysis using REAL crawled data as context
      const contentAudit = await vly.ai.completion({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert website analyst specializing in conversion optimization, SEO, and UX audit. " +
              "Analyze websites thoroughly and produce structured, data-driven reports. " +
              "Use the real crawl data provided to ground your analysis in actual facts.",
          },
          {
            role: "user",
            content: `Analyze the website "${name}" at URL: ${url}

${crawlContext || `(Note: Real crawl was not available — performing analysis based on the URL and brand name: ${name})`}

Perform a comprehensive audit covering these dimensions:

1. **CONTENT_INVENTORY** — Based on the real page data above, assess the quality, depth, and structure of content.
2. **TECHNICAL_SIGNALS** — Estimate Core Web Vitals health, mobile responsiveness, page speed concerns based on content structure.
3. **SCHEMA_STATUS** — Evaluate the actual structured data found in the crawl.
4. **READABILITY** — Assess the readability and clarity of the headings and content.
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
  "pagesCrawled": <1 if crawl succeeded, 0 if not>,
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
        maxTokens: 3000,
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
        pagesCrawled: crawlResult.success && crawlResult.mainPage ? 1 : result.pagesCrawled ?? 0,
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
