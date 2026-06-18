"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { vly } from "../lib/vly-integrations";

/**
 * ============================================================
 *  AUDIENCE ANALYST — Audience intelligence & persona clustering
 *
 *  Given a website/brand, produces:
 *  - RFM-style audience persona clusters
 *  - Behavioral trait profiles per segment
 *  - Channel affinity predictions
 *  - Lookalike expansion quality scores
 *  - Best creative angle per segment
 * ============================================================
 */

interface AudienceSegment {
  name: string;
  size: number;
  predictedLtv: number;
  channelAffinity: string;
  bestCreativeAngle: string;
  lookalikeQualityScore: number;
  behavioralTraits: string[];
  confidence: number;
}

interface AudienceAnalysisResult {
  success: boolean;
  summary?: string;
  overallScore?: number;
  confidence?: number;
  segments?: AudienceSegment[];
  totalAudienceSize?: number;
  topPersona?: string;
  recommendations?: string[];
  error?: string;
}

/**
 * Analyze and build audience personas for the given website/brand.
 * Now consumes real website crawl data to ground the analysis.
 */
export const analyzeAudience = action({
  args: {
    projectId: v.id("projects"),
    url: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args): Promise<AudienceAnalysisResult> => {
    const { url, name } = args;

    try {
      // Phase 1: Get real website content to ground audience analysis
      const crawlResult = await ctx.runAction(internal.crawler.crawlAndExtract, {
        url,
        projectId: args.projectId,
        maxPages: 5,
        maxDepth: 1,
      });

      // Build crawl context for the LLM
      let crawlContext = "";
      if (crawlResult.success && crawlResult.mainPage) {
        const page = crawlResult.mainPage;
        crawlContext = [
          `=== REAL WEBSITE CRAWL DATA ===`,
          `Site: ${name} (${url})`,
          `Title: ${page.title}`,
          `Description: ${page.metaDescription}`,
          `Pages Crawled: ${crawlResult.pagesCrawled}`,
          `Top Headings: ${page.headings.h1.slice(0, 3).join(" | ")}`,
          `Products/Services Mentioned: ${page.headings.h2.slice(0, 5).join(", ")}`,
          `Schema Types: ${page.schemaMarkup.map((s: string) => { try { return JSON.parse(s)["@type"] || "Unknown"; } catch { return "Unknown"; } }).join(", ")}`,
          `Extracted Entities: ${crawlResult.extractedEntities.slice(0, 15).join(", ")}`,
          `Site Content Summary: ${crawlResult.contentSummary.slice(0, 2000)}`,
        ].join("\n");
      }

      const audienceAudit = await vly.ai.completion({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert audience intelligence analyst specializing in digital advertising " +
              "audience segmentation, behavioral modeling, and lookalike audience prediction. " +
              "Use the real website crawl data provided to ground your audience personas in actual site content.",
          },
          {
            role: "user",
            content: `Analyze the likely audience for the brand "${name}" at website: ${url}

${crawlContext || `(Note: Live crawl was not available. Analyzing based on the URL and brand name: ${name})`}

Build a comprehensive audience intelligence report with 3-5 distinct audience personas.

For each persona, provide:
1. **name**: A memorable persona name (e.g., "Bargain Hunters", "Premium Seekers", "Research-Heavy")
2. **size**: Estimated population size (number of users)
3. **predictedLtv**: Predicted lifetime value in dollars
4. **channelAffinity**: Primary channel affinity (e.g., "Instagram > Facebook", "Google Search > Display", "Facebook Newsfeed")
5. **bestCreativeAngle**: The most effective creative messaging angle (e.g., "Limited time offer", "Elite experience", "Compare our features")
6. **lookalikeQualityScore**: Predicted lookalike expansion quality (0-1 scale, where 0.9+ means excellent expansion potential)
7. **behavioralTraits**: Array of behavioral characteristics (e.g., ["price-sensitive", "impulse buyer", "mobile-first"])
8. **confidence**: Your confidence in this persona (0-1)

Also provide:
- **totalAudienceSize**: Sum of all persona sizes
- **topPersona**: Name of the highest-value persona
- **summary**: 2-3 sentence overall audience analysis
- **overallScore**: Overall audience intelligence quality score (0-100)
- **recommendations**: Array of actionable audience targeting recommendations

Return ONLY valid JSON in this exact shape:
{
  "segments": [
    {
      "name": "Persona Name",
      "size": <estimated number>,
      "predictedLtv": <dollar amount>,
      "channelAffinity": "channel description",
      "bestCreativeAngle": "angle description",
      "lookalikeQualityScore": <0-1>,
      "behavioralTraits": ["trait1", "trait2"],
      "confidence": <0-1>
    }
  ],
  "totalAudienceSize": <sum of sizes>,
  "topPersona": "highest value persona name",
  "overallScore": <0-100>,
  "summary": "2-3 sentence audience analysis",
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}`,
          },
        ],
        temperature: 0.3,
        maxTokens: 2000,
      });

      if (!audienceAudit.success || !audienceAudit.data) {
        throw new Error("Audience analysis AI call failed: " + (audienceAudit.error || "No response"));
      }

      const content = audienceAudit.data.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse audience analysis response");

      const result = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        summary: result.summary || "Audience analysis completed.",
        overallScore: result.overallScore ?? 0,
        confidence: 0.82,
        segments: (result.segments || []).map((seg: any) => ({
          name: seg.name || "Unknown",
          size: seg.size ?? 1000,
          predictedLtv: seg.predictedLtv ?? 0,
          channelAffinity: seg.channelAffinity || "",
          bestCreativeAngle: seg.bestCreativeAngle || "",
          lookalikeQualityScore: seg.lookalikeQualityScore ?? 0.5,
          behavioralTraits: seg.behavioralTraits || [],
          confidence: seg.confidence ?? 0.7,
        })),
        totalAudienceSize: result.totalAudienceSize ?? 0,
        topPersona: result.topPersona || "",
        recommendations: result.recommendations || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Audience analyst failed",
        overallScore: 0,
        segments: [],
        recommendations: [],
      };
    }
  },
});
