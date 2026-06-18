"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { vly } from "../lib/vly-integrations";

/**
 * ============================================================
 *  COMPETITOR ANALYST — Competitive intelligence & gap analysis
 *
 *  Given a website/brand, produces:
 *  - Competitor landscape map
 *  - Creative differentiation scores
 *  - Positioning gap identification
 *  - Creative fatigue window estimates
 *  - Exploitable competitor weaknesses
 * ============================================================
 */

interface CompetitorEntry {
  competitorName: string;
  estimatedMonthlySpend: string;
  topCreatives: string;
  audienceAngle: string;
  weakness: string;
  strengths: string;
  positioningGap: string;
  creativeFatigueWindow: number;
  confidence: number;
}

interface CompetitorAnalysisResult {
  success: boolean;
  summary?: string;
  overallScore?: number;
  confidence?: number;
  competitors?: CompetitorEntry[];
  totalGapsFound?: number;
  topExploitableGap?: string;
  recommendations?: string[];
  error?: string;
}

/**
 * Analyze the competitive landscape for the given website/brand.
 */
export const analyzeCompetitors = action({
  args: {
    projectId: v.id("projects"),
    url: v.string(),
    name: v.string(),
  },
  handler: async (_ctx, args): Promise<CompetitorAnalysisResult> => {
    const { url, name } = args;

    try {
      const competitorAudit = await vly.ai.completion({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert competitive intelligence analyst specializing in digital advertising. " +
              "You analyze competitor strategies across Meta Ads and Google Ads, identify positioning gaps, " +
              "and recommend actionable competitive advantages.",
          },
          {
            role: "user",
            content: `Analyze the competitive landscape for the brand "${name}" at website: ${url}

Based on your knowledge of the industry and competitive dynamics, identify 3-5 likely competitors and their advertising strategies.

For each competitor, provide:
1. **competitorName**: Name of the competitor
2. **estimatedMonthlySpend**: Estimated ad spend range (e.g., "$50k-$80k")
3. **topCreatives**: Description of their likely top creative formats and styles (e.g., "3 video ads, testimonial style", "12 static images, product-focused")
4. **audienceAngle**: Their likely audience targeting angle (e.g., "Price-focused", "Feature-based", "Lifestyle-oriented")
5. **weakness**: Their exploitable weakness (e.g., "No mobile-optimized landing page", "No retargeting sequence", "Weak social proof")
6. **strengths**: Their competitive strengths
7. **positioningGap**: A gap in the market the competitor is not filling (e.g., "Nobody emphasizes carbon fiber for casual runners", "No competitor offers 24/7 support chat")
8. **creativeFatigueWindow**: Estimated days they run a creative before swapping (e.g., 11 days)
9. **confidence**: Your confidence in this competitor analysis (0-1)

Also provide:
- **totalGapsFound**: Total number of positioning gaps identified across all competitors
- **topExploitableGap**: The single most valuable positioning gap to exploit
- **overallScore**: Overall competitor intelligence quality score (0-100)
- **summary**: 2-3 sentence competitive landscape analysis
- **recommendations**: Array of actionable competitive positioning recommendations

Return ONLY valid JSON in this exact shape:
{
  "competitors": [
    {
      "competitorName": "Competitor Name",
      "estimatedMonthlySpend": "range string",
      "topCreatives": "description of creatives",
      "audienceAngle": "audience targeting angle",
      "weakness": "exploitable weakness",
      "strengths": "their strengths",
      "positioningGap": "gap in the market",
      "creativeFatigueWindow": <days>,
      "confidence": <0-1>
    }
  ],
  "totalGapsFound": <number>,
  "topExploitableGap": "most valuable gap",
  "overallScore": <0-100>,
  "summary": "2-3 sentence competitive analysis",
  "recommendations": ["recommendation 1", "recommendation 2", ...]
}`,
          },
        ],
        temperature: 0.3,
        maxTokens: 2000,
      });

      if (!competitorAudit.success || !competitorAudit.data) {
        throw new Error("Competitor analysis AI call failed: " + (competitorAudit.error || "No response"));
      }

      const content = competitorAudit.data.choices[0]?.message?.content || "";
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Could not parse competitor analysis response");

      const result = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        summary: result.summary || "Competitor analysis completed.",
        overallScore: result.overallScore ?? 0,
        confidence: 0.78,
        competitors: (result.competitors || []).map((comp: any) => ({
          competitorName: comp.competitorName || "Unknown",
          estimatedMonthlySpend: comp.estimatedMonthlySpend || "Unknown",
          topCreatives: comp.topCreatives || "",
          audienceAngle: comp.audienceAngle || "",
          weakness: comp.weakness || "",
          strengths: comp.strengths || "",
          positioningGap: comp.positioningGap || "",
          creativeFatigueWindow: comp.creativeFatigueWindow ?? 14,
          confidence: comp.confidence ?? 0.7,
        })),
        totalGapsFound: result.totalGapsFound ?? 0,
        topExploitableGap: result.topExploitableGap || "",
        recommendations: result.recommendations || [],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || "Competitor analyst failed",
        overallScore: 0,
        competitors: [],
        recommendations: [],
      };
    }
  },
});
