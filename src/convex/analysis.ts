"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { vly } from "../lib/vly-integrations";

/**
 * Run a full analysis on a project's URL using AI.
 * This simulates the 4-phase analysis pipeline:
 * 1. Content audit & crawl summary
 * 2. Entity extraction
 * 3. Competitor & SERP intelligence
 * 4. KPI scoring
 */
export const analyzeProject = action({
  args: {
    projectId: v.id("projects"),
    url: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const { projectId, url, name } = args;

    // Mark the project as analyzing
    await ctx.runMutation(internal.analysis_mutations.setProjectStatus, {
      projectId,
      status: "analyzing",
    });

    try {
      // Phase 1: Deep crawl & content audit via AI
      const crawlAnalysis = await vly.ai.completion({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert SEO and AI visibility analyst. Analyze the given website and produce a structured audit report. Be specific and data-driven.",
          },
          {
            role: "user",
            content: `Analyze the website "${name}" at URL: ${url}

Provide a comprehensive analysis with these sections:
1. CONTENT_INVENTORY: Estimate pages, assess content quality
2. TECHNICAL_SIGNALS: Likely Core Web Vitals concerns, mobile readiness
3. SCHEMA_STATUS: Likely structured data presence and quality
4. READABILITY: Assess the likely readability of the content
5. KEYWORD_COVERAGE: Estimate keyword coverage strength

For each section, provide specific numerical scores (0-100) where applicable.

Return the result as a JSON object with these fields:
{
  "pagesCrawled": <estimated number>,
  "readabilityScore": <0-100>,
  "keywordCoverage": <0-100>,
  "schemaHealthScore": <0-100>,
  "organicVisibilityIndex": <0-100>,
  "summary": "<2-3 sentence analysis summary>",
  "recommendations": ["recommendation 1", "recommendation 2", ...],
  "entities": [{"name": "...", "type": "person|product|organization|concept|brand_term", "salience": <0-1>}, ...]
}`,
          },
        ],
        temperature: 0.3,
        maxTokens: 2000,
      });

      if (!crawlAnalysis.success || !crawlAnalysis.data) {
        throw new Error("AI analysis failed: " + (crawlAnalysis.error || "No response"));
      }

      // Parse the AI response
      const content = crawlAnalysis.data.choices[0]?.message?.content || "";
      let analysisData: {
        pagesCrawled: number;
        readabilityScore: number;
        keywordCoverage: number;
        schemaHealthScore: number;
        organicVisibilityIndex: number;
        summary: string;
        recommendations: string[];
        entities: Array<{ name: string; type: string; salience: number }>;
      };

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not parse AI analysis response");
      }

      // Phase 2: Citation analysis via second AI call
      const citationAnalysis = await vly.ai.completion({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an expert in AI citation tracking and Generative Engine Optimization (GEO).",
          },
          {
            role: "user",
            content: `Given a website "${name}" at ${url}, estimate its current AI visibility:

1. CITATION_SCORE: How likely is this site to be cited by AI assistants (ChatGPT, Perplexity, Gemini)?
2. ENTITY_COVERAGE: How well does the site cover its key entities?
3. COMPETITOR_GAP: How many competitor topics might exist that this site doesn't cover?
4. LINK_EQUITY_LOSS: What percentage of pages might lack internal links?

Return ONLY a JSON object:
{
  "citationScore": <0-100>,
  "entityCoverageScore": <0-100>,
  "competitorGapCount": <number>,
  "linkEquityLoss": <0-100>
}`,
          },
        ],
        temperature: 0.3,
        maxTokens: 1000,
      });

      if (!citationAnalysis.success || !citationAnalysis.data) {
        throw new Error("Citation analysis failed");
      }

      const citationContent = citationAnalysis.data.choices[0]?.message?.content || "";
      const citationMatch = citationContent.match(/\{[\s\S]*\}/);
      let citationData: {
        citationScore: number;
        entityCoverageScore: number;
        competitorGapCount: number;
        linkEquityLoss: number;
      } = {
        citationScore: 0,
        entityCoverageScore: 0,
        competitorGapCount: 0,
        linkEquityLoss: 0,
      };

      if (citationMatch) {
        citationData = JSON.parse(citationMatch[0]);
      }

      // Save entities to the database
      if (analysisData.entities && analysisData.entities.length > 0) {
        for (const entity of analysisData.entities) {
          await ctx.runMutation(internal.analysis_mutations.insertEntity, {
            projectId,
            name: entity.name,
            type: entity.type,
            salience: entity.salience ?? 0,
          });
        }
      }

      // Save the analysis snapshot
      await ctx.runMutation(internal.analysis_mutations.saveAnalysis, {
        projectId,
        pagesCrawled: analysisData.pagesCrawled,
        readabilityScore: analysisData.readabilityScore,
        keywordCoverage: analysisData.keywordCoverage,
        schemaHealthScore: analysisData.schemaHealthScore,
        organicVisibilityIndex: analysisData.organicVisibilityIndex,
        citationScore: citationData.citationScore,
        entityCoverageScore: citationData.entityCoverageScore,
        competitorGapCount: citationData.competitorGapCount,
        linkEquityLoss: citationData.linkEquityLoss,
        summary: analysisData.summary,
        recommendations: analysisData.recommendations || [],
      });

      // Save optimization recommendations
      if (analysisData.recommendations && analysisData.recommendations.length > 0) {
        for (const rec of analysisData.recommendations) {
          await ctx.runMutation(internal.analysis_mutations.insertOptimization, {
            projectId,
            description: rec,
            type: "recommendation",
          });
        }
      }

      // Update the project with KPI snapshot
      await ctx.runMutation(internal.analysis_mutations.updateProjectKpis, {
        projectId,
        pagesCrawled: analysisData.pagesCrawled,
        readabilityScore: analysisData.readabilityScore,
        keywordCoverage: analysisData.keywordCoverage,
        schemaHealthScore: analysisData.schemaHealthScore,
        organicVisibilityIndex: analysisData.organicVisibilityIndex,
        citationScore: citationData.citationScore,
        entityCoverageScore: citationData.entityCoverageScore,
        competitorGapCount: citationData.competitorGapCount,
        linkEquityLoss: citationData.linkEquityLoss,
        entitiesFound: analysisData.entities?.length || 0,
        schemaErrors: Math.max(0, Math.round((100 - analysisData.schemaHealthScore) * 0.15)),
      });

      return { success: true as const, analysisId: "" };
    } catch (error) {
      // Mark as error
      await ctx.runMutation(internal.analysis_mutations.setProjectStatus, {
        projectId,
        status: "error",
      });

      return {
        success: false as const,
        error: error instanceof Error ? error.message : "Analysis failed",
      };
    }
  },
});
