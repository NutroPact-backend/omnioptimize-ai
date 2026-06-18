"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * ============================================================
 *  ANALYSIS — Main entry point for project analysis
 *
 *  Delegates to the Full Analysis Agent which runs three
 *  sub-agents in parallel (Website Analyst, Audience Analyst,
 *  Competitor Analyst) and produces a unified SiteAnalysisReport.
 *
 *  This file is the public-facing API — the Dashboard calls
 *  `api.analysis.analyzeProject` to kick off a full analysis.
 * ============================================================
 */

/**
 * Run a full AI-powered analysis on a project.
 * Orchestrates the three sub-agents in parallel and persists results.
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
      // ── Run the Full Analysis Agent (parallel sub-agents) ──
      const result = await ctx.runAction(internal.analysis_agent.runFullAnalysis, {
        projectId,
        url,
        name,
      });

      if (!result.success || !result.report) {
        throw new Error(result.error || "Full analysis agent returned no report");
      }

      const report = result.report;

      // ── Save analysis snapshot to analyses table ──
      const website = report.websiteAnalysis;
      const audience = report.audienceAnalysis;
      const competitor = report.competitorAnalysis;

      const combinedRecommendations = [
        ...(website.frictionPoints?.slice(0, 3).map((fp) =>
          `[Website] ${fp.description} — ${fp.recommendation ?? "Investigate further"}`,
        ) ?? []),
        ...(audience.segments?.slice(0, 2).map((seg) =>
          `[Audience] Target "${seg.name}" segment with ${seg.bestCreativeAngle} creative angle on ${seg.channelAffinity}. Predicted LTV: $${seg.predictedLtv?.toFixed(0) ?? "N/A"}.`,
        ) ?? []),
        ...(competitor.competitors?.slice(0, 3).map((comp) =>
          `[Competitor] Exploit ${comp.competitorName}'s weakness: ${comp.weakness}. Positioning gap: ${comp.positioningGap}`,
        ) ?? []),
      ];

      await ctx.runMutation(internal.analysis_mutations.saveAnalysis, {
        projectId,
        pagesCrawled: website.pagesCrawled,
        readabilityScore: website.readabilityScore,
        keywordCoverage: website.keywordCoverage,
        schemaHealthScore: website.schemaHealthScore,
        organicVisibilityIndex: website.organicVisibilityIndex,
        citationScore: Math.round((website.organicVisibilityIndex + website.readabilityScore) / 2),
        entityCoverageScore: Math.round((website.schemaHealthScore + website.keywordCoverage) / 2),
        competitorGapCount: competitor.totalGapsFound,
        linkEquityLoss: Math.max(0, 100 - website.organicVisibilityIndex),
        summary: report.summary,
        recommendations: combinedRecommendations,
      });

      // ── Save entities (from friction point types and audience personas) ──
      const entityNames = new Set<string>();
      for (const fp of website.frictionPoints ?? []) {
        // Use issueType as structured entity names instead of random capitalized words
        const typeName = fp.issueType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
        entityNames.add(typeName);
        // Also extract meaningful page URLs as entities
        if (fp.pageUrl && fp.pageUrl !== url) {
          const pageName = fp.pageUrl.split("/").filter(Boolean).pop() || "";
          if (pageName.length > 2) entityNames.add(pageName);
        }
      }
      // Add audience segment names as entities
      for (const seg of audience.segments ?? []) {
        entityNames.add(seg.name);
      }
      // Add competitor names as entities
      for (const comp of competitor.competitors ?? []) {
        entityNames.add(comp.competitorName);
      }
      if (entityNames.size > 0) {
        for (const name_ of entityNames) {
          await ctx.runMutation(internal.analysis_mutations.insertEntity, {
            projectId,
            name: name_,
            type: "concept",
            salience: 0.5,
          });
        }
      }

      // ── Save optimization recommendations ──
      for (const rec of combinedRecommendations) {
        await ctx.runMutation(internal.analysis_mutations.insertOptimization, {
          projectId,
          description: rec,
          type: "recommendation",
        });
      }

      // ── Update project with KPI snapshot ──
      await ctx.runMutation(internal.analysis_mutations.updateProjectKpis, {
        projectId,
        pagesCrawled: website.pagesCrawled,
        readabilityScore: website.readabilityScore,
        keywordCoverage: website.keywordCoverage,
        schemaHealthScore: website.schemaHealthScore,
        organicVisibilityIndex: website.organicVisibilityIndex,
        citationScore: Math.round((website.organicVisibilityIndex + website.readabilityScore) / 2),
        entityCoverageScore: Math.round((website.schemaHealthScore + website.keywordCoverage) / 2),
        competitorGapCount: competitor.totalGapsFound,
        linkEquityLoss: Math.max(0, 100 - website.organicVisibilityIndex),
        entitiesFound: entityNames.size,
        schemaErrors: Math.max(0, Math.round((100 - website.schemaHealthScore) * 0.15)),
      });

      // ── Auto-build entity relationships on success ──
      try {
        await ctx.runAction(internal.knowledge_graph.autoBuildEntityRelationships, {
          projectId,
        });
      } catch {
        // Non-critical — entity graph building is best-effort
      }

      return {
        success: true as const,
        analysisId: "",
        report: {
          websiteAnalystScore: report.websiteAnalystScore,
          audienceAnalystScore: report.audienceAnalystScore,
          competitorAnalystScore: report.competitorAnalystScore,
          combinedConfidence: report.combinedConfidence,
          audienceSegments: audience.segments,
          competitorCount: competitor.competitors.length,
          frictionPointCount: website.frictionPoints.length,
          topRecommendations: combinedRecommendations.slice(0, 5),
        },
      };
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
