"use node";

import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * ============================================================
 *  ANALYSIS AGENT — Full Pre-Action Analysis Engine
 *
 *  Orchestrates three parallel sub-agents:
 *    1. Website Analyst  — Deep crawl, content audit, friction mapping
 *    2. Audience Analyst — RFM segmentation, persona clustering, lookalike prediction
 *    3. Competitor Analyst — Competitive intelligence, positioning gaps, creative fatigue
 *
 *  Produces a unified SiteAnalysisReport with confidence scores.
 * ============================================================
 */

/* ───── Types ───── */
export interface FrictionPoint {
  pageUrl: string;
  issueType: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  recommendation?: string;
  metricValue?: string;
  confidence: number;
}

export interface AudienceSegment {
  name: string;
  size: number;
  predictedLtv: number;
  channelAffinity: string;
  bestCreativeAngle: string;
  lookalikeQualityScore: number;
  behavioralTraits: string[];
  confidence: number;
}

export interface CompetitorEntry {
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

export interface SiteAnalysisReport {
  // Overall
  success: boolean;
  projectId: string;
  url: string;
  name: string;

  // Per-agent scores
  websiteAnalystScore: number;
  audienceAnalystScore: number;
  competitorAnalystScore: number;
  combinedConfidence: number;

  // Sub-agent summaries
  websiteAnalysis: {
    summary: string;
    pagesCrawled: number;
    readabilityScore: number;
    keywordCoverage: number;
    schemaHealthScore: number;
    organicVisibilityIndex: number;
    frictionPoints: FrictionPoint[];
    conversionFunnelInsights: string;
  };

  audienceAnalysis: {
    summary: string;
    segments: AudienceSegment[];
    totalAudienceSize: number;
    topPersona: string;
  };

  competitorAnalysis: {
    summary: string;
    competitors: CompetitorEntry[];
    totalGapsFound: number;
    topExploitableGap: string;
  };

  // Combined
  summary: string;
  topRecommendations: string[];
  createdAt: number;
}

/* ───── Internal mutation: save friction points ───── */
export const saveFrictionPoints = internalMutation({
  args: {
    projectId: v.id("projects"),
    frictionPoints: v.array(
      v.object({
        pageUrl: v.string(),
        issueType: v.string(),
        severity: v.union(
          v.literal("critical"),
          v.literal("high"),
          v.literal("medium"),
          v.literal("low"),
        ),
        description: v.string(),
        recommendation: v.optional(v.string()),
        metricValue: v.optional(v.string()),
        confidence: v.optional(v.float64()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const fp of args.frictionPoints) {
      await ctx.db.insert("websiteFrictionPoints", {
        projectId: args.projectId,
        pageUrl: fp.pageUrl,
        issueType: fp.issueType,
        severity: fp.severity,
        description: fp.description,
        recommendation: fp.recommendation,
        metricValue: fp.metricValue,
        confidence: fp.confidence ?? 0.8,
        createdAt: now,
      });
    }
  },
});

/* ───── Internal mutation: save audience segments ───── */
export const saveAudienceSegments = internalMutation({
  args: {
    projectId: v.id("projects"),
    segments: v.array(
      v.object({
        name: v.string(),
        size: v.optional(v.float64()),
        predictedLtv: v.optional(v.float64()),
        channelAffinity: v.optional(v.string()),
        bestCreativeAngle: v.optional(v.string()),
        lookalikeQualityScore: v.optional(v.float64()),
        behavioralTraits: v.optional(v.string()),
        confidence: v.optional(v.float64()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const seg of args.segments) {
      await ctx.db.insert("audienceSegments", {
        projectId: args.projectId,
        name: seg.name,
        size: seg.size,
        predictedLtv: seg.predictedLtv,
        channelAffinity: seg.channelAffinity,
        bestCreativeAngle: seg.bestCreativeAngle,
        lookalikeQualityScore: seg.lookalikeQualityScore,
        behavioralTraits: seg.behavioralTraits,
        confidence: seg.confidence ?? 0.8,
        createdAt: now,
      });
    }
  },
});

/* ───── Internal mutation: save competitor insights ───── */
export const saveCompetitorInsights = internalMutation({
  args: {
    projectId: v.id("projects"),
    insights: v.array(
      v.object({
        competitorName: v.string(),
        estimatedMonthlySpend: v.optional(v.string()),
        topCreatives: v.optional(v.string()),
        audienceAngle: v.optional(v.string()),
        weakness: v.optional(v.string()),
        strengths: v.optional(v.string()),
        positioningGap: v.optional(v.string()),
        creativeFatigueWindow: v.optional(v.float64()),
        confidence: v.optional(v.float64()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const ins of args.insights) {
      await ctx.db.insert("competitorInsights", {
        projectId: args.projectId,
        competitorName: ins.competitorName,
        estimatedMonthlySpend: ins.estimatedMonthlySpend,
        topCreatives: ins.topCreatives,
        audienceAngle: ins.audienceAngle,
        weakness: ins.weakness,
        strengths: ins.strengths,
        positioningGap: ins.positioningGap,
        creativeFatigueWindow: ins.creativeFatigueWindow,
        confidence: ins.confidence ?? 0.8,
        createdAt: Date.now(),
      });
    }
  },
});

/* ───── Action: Run all three sub-agents in parallel ───── */
export const runFullAnalysis = action({
  args: {
    projectId: v.id("projects"),
    url: v.string(),
    name: v.string(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    report?: SiteAnalysisReport;
    error?: string;
  }> => {
    const { projectId, url, name } = args;

    try {
      // Emit analysis started event
      await ctx.runMutation(internal.event_bus.emitInternal, {
        eventType: "analysis.started",
        sourceAgent: "analysis",
        projectId,
        payload: JSON.stringify({ url, name }),
      });

      // ── Run all three sub-agents in PARALLEL ──
      const [websiteResult, audienceResult, competitorResult] = await Promise.all([
        ctx.runAction(internal.website_analyst.analyzeWebsite, { projectId, url, name }),
        ctx.runAction(internal.audience_analyst.analyzeAudience, { projectId, url, name }),
        ctx.runAction(internal.competitor_analyst.analyzeCompetitors, { projectId, url, name }),
      ]);

      // ── Save friction points ──
      if (websiteResult.success && websiteResult.frictionPoints?.length) {
        await ctx.runMutation(internal.analysis_agent.saveFrictionPoints, {
          projectId,
          frictionPoints: websiteResult.frictionPoints,
        });
      }

      // ── Save audience segments ──
      if (audienceResult.success && audienceResult.segments?.length) {
        await ctx.runMutation(internal.analysis_agent.saveAudienceSegments, {
          projectId,
          segments: audienceResult.segments,
        });
      }

      // ── Save competitor insights ──
      if (competitorResult.success && competitorResult.competitors?.length) {
        await ctx.runMutation(internal.analysis_agent.saveCompetitorInsights, {
          projectId,
          insights: competitorResult.competitors,
        });
      }

      // ── Compute combined confidence and scores ──
      const websiteScore = websiteResult.overallScore ?? 0;
      const audienceScore = audienceResult.overallScore ?? 0;
      const competitorScore = competitorResult.overallScore ?? 0;
      // Use geometric mean for combined confidence — more calibrated than product
      // for three independent, corroborating analyses
      const cw = websiteResult.confidence ?? 0.5;
      const ca = audienceResult.confidence ?? 0.5;
      const cc = competitorResult.confidence ?? 0.5;
      const combinedConfidence = Math.cbrt(cw * ca * cc);

      // ── Build the unified report ──
      const report: SiteAnalysisReport = {
        success: websiteResult.success && audienceResult.success && competitorResult.success,
        projectId,
        url,
        name,
        websiteAnalystScore: websiteScore,
        audienceAnalystScore: audienceScore,
        competitorAnalystScore: competitorScore,
        combinedConfidence: parseFloat(combinedConfidence.toFixed(4)),
        websiteAnalysis: {
          summary: websiteResult.summary ?? "Website analysis completed.",
          pagesCrawled: websiteResult.pagesCrawled ?? 0,
          readabilityScore: websiteResult.readabilityScore ?? 0,
          keywordCoverage: websiteResult.keywordCoverage ?? 0,
          schemaHealthScore: websiteResult.schemaHealthScore ?? 0,
          organicVisibilityIndex: websiteResult.organicVisibilityIndex ?? 0,
          frictionPoints: websiteResult.frictionPoints ?? [],
          conversionFunnelInsights: websiteResult.conversionFunnelInsights ?? "",
        },
        audienceAnalysis: {
          summary: audienceResult.summary ?? "Audience analysis completed.",
          segments: audienceResult.segments ?? [],
          totalAudienceSize: audienceResult.totalAudienceSize ?? 0,
          topPersona: audienceResult.topPersona ?? "",
        },
        competitorAnalysis: {
          summary: competitorResult.summary ?? "Competitor analysis completed.",
          competitors: competitorResult.competitors ?? [],
          totalGapsFound: competitorResult.totalGapsFound ?? 0,
          topExploitableGap: competitorResult.topExploitableGap ?? "",
        },
        summary: [
          websiteResult.summary ?? "",
          audienceResult.summary ?? "",
          competitorResult.summary ?? "",
        ].join(" "),
        topRecommendations: [
          ...(websiteResult.recommendations ?? []),
          ...(audienceResult.recommendations ?? []),
          ...(competitorResult.recommendations ?? []),
        ].slice(0, 10),
        createdAt: Date.now(),
      };

      // ── Emit completion event ──
      await ctx.runMutation(internal.event_bus.emitInternal, {
        eventType: "analysis.completed",
        sourceAgent: "analysis",
        projectId,
        payload: JSON.stringify({
          success: report.success,
          combinedConfidence: report.combinedConfidence,
          summary: report.summary,
        }),
        confidence: report.combinedConfidence,
      });

      return { success: true, report };
    } catch (error: any) {
      await ctx.runMutation(internal.event_bus.emitInternal, {
        eventType: "analysis.failed",
        sourceAgent: "analysis",
        projectId,
        payload: JSON.stringify({ error: error?.message ?? "Unknown error" }),
      });

      return {
        success: false,
        error: error?.message ?? "Unknown error in analysis agent",
      };
    }
  },
});

/* ───── Query to retrieve recent analysis report data for a project ───── */
export const getAnalysisReportData = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const [frictionPoints, audienceSegments, competitorInsights, analyses] = await Promise.all([
      ctx.db
        .query("websiteFrictionPoints")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
        .order("desc")
        .take(50),
      ctx.db
        .query("audienceSegments")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
        .collect(),
      ctx.db
        .query("competitorInsights")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
        .collect(),
      ctx.db
        .query("analyses")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
        .order("desc")
        .take(20),
    ]);

    return {
      frictionPoints,
      audienceSegments,
      competitorInsights,
      analyses,
    };
  },
});
