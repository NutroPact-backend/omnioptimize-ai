import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const setProjectStatus = internalMutation({
  args: {
    projectId: v.id("projects"),
    status: v.union(
      v.literal("pending"),
      v.literal("analyzing"),
      v.literal("analyzed"),
      v.literal("error"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, {
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const saveAnalysis = internalMutation({
  args: {
    projectId: v.id("projects"),
    pagesCrawled: v.optional(v.float64()),
    readabilityScore: v.optional(v.float64()),
    keywordCoverage: v.optional(v.float64()),
    schemaHealthScore: v.optional(v.float64()),
    organicVisibilityIndex: v.optional(v.float64()),
    citationScore: v.optional(v.float64()),
    entityCoverageScore: v.optional(v.float64()),
    competitorGapCount: v.optional(v.float64()),
    linkEquityLoss: v.optional(v.float64()),
    summary: v.optional(v.string()),
    recommendations: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { projectId, ...rest } = args;
    await ctx.db.insert("analyses", {
      projectId,
      ...rest,
      createdAt: Date.now(),
    });
  },
});

export const insertEntity = internalMutation({
  args: {
    projectId: v.id("projects"),
    name: v.string(),
    type: v.string(),
    salience: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("entities", {
      projectId: args.projectId,
      name: args.name,
      type: args.type,
      salience: args.salience,
    });
  },
});

export const insertOptimization = internalMutation({
  args: {
    projectId: v.id("projects"),
    description: v.string(),
    type: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("optimizations", {
      projectId: args.projectId,
      type: args.type,
      status: "pending",
      description: args.description,
      createdAt: Date.now(),
    });
  },
});

export const updateProjectKpis = internalMutation({
  args: {
    projectId: v.id("projects"),
    pagesCrawled: v.optional(v.float64()),
    readabilityScore: v.optional(v.float64()),
    keywordCoverage: v.optional(v.float64()),
    schemaHealthScore: v.optional(v.float64()),
    organicVisibilityIndex: v.optional(v.float64()),
    citationScore: v.optional(v.float64()),
    entityCoverageScore: v.optional(v.float64()),
    competitorGapCount: v.optional(v.float64()),
    linkEquityLoss: v.optional(v.float64()),
    entitiesFound: v.optional(v.float64()),
    schemaErrors: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const { projectId, ...kpis } = args;
    await ctx.db.patch(projectId, {
      ...kpis,
      status: "analyzed",
      updatedAt: Date.now(),
    });
  },
});
