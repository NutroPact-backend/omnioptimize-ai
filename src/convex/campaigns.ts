import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return campaigns;
  },
});

export const getById = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.userId !== userId) return null;

    return campaign;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    platform: v.union(v.literal("meta"), v.literal("google")),
    objective: v.union(
      v.literal("sales"),
      v.literal("leads"),
      v.literal("traffic"),
      v.literal("awareness"),
      v.literal("engagement"),
    ),
    dailyBudget: v.optional(v.float64()),
    totalBudget: v.optional(v.float64()),
    currency: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    targeting: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();

    const campaignId = await ctx.db.insert("campaigns", {
      userId,
      projectId: args.projectId,
      platform: args.platform,
      name: args.name,
      objective: args.objective,
      status: "draft",
      dailyBudget: args.dailyBudget,
      totalBudget: args.totalBudget,
      currency: args.currency,
      startDate: args.startDate,
      endDate: args.endDate,
      targeting: args.targeting,
      complianceStatus: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return campaignId;
  },
});

export const update = mutation({
  args: {
    campaignId: v.id("campaigns"),
    name: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("active"),
        v.literal("paused"),
        v.literal("archived"),
        v.literal("error"),
      ),
    ),
    dailyBudget: v.optional(v.float64()),
    totalBudget: v.optional(v.float64()),
    targeting: v.optional(v.string()),
    platformCampaignId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.userId !== userId) throw new Error("Not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) patch.name = args.name;
    if (args.status !== undefined) patch.status = args.status;
    if (args.dailyBudget !== undefined) patch.dailyBudget = args.dailyBudget;
    if (args.totalBudget !== undefined) patch.totalBudget = args.totalBudget;
    if (args.targeting !== undefined) patch.targeting = args.targeting;
    if (args.platformCampaignId !== undefined) patch.platformCampaignId = args.platformCampaignId;

    await ctx.db.patch(args.campaignId, patch);
  },
});

export const remove = mutation({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.userId !== userId) throw new Error("Not found");

    // Clean up related data
    const adSets = await ctx.db
      .query("adSets")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    for (const s of adSets) await ctx.db.delete(s._id);

    const creatives = await ctx.db
      .query("adCreatives")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    for (const c of creatives) await ctx.db.delete(c._id);

    const checks = await ctx.db
      .query("complianceChecks")
      .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    for (const ch of checks) await ctx.db.delete(ch._id);

    const records = await ctx.db
      .query("adPerformanceRecords")
      .withIndex("by_campaignId_date", (q) => q.eq("campaignId", args.campaignId))
      .collect();
    for (const r of records) await ctx.db.delete(r._id);

    await ctx.db.delete(args.campaignId);
  },
});

export const getStats = query({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const campaign = await ctx.db.get(args.campaignId);
    if (!campaign || campaign.userId !== userId) return null;

    const [adSets, creatives, performanceRecords, complianceChecks] = await Promise.all([
      ctx.db
        .query("adSets")
        .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
        .collect(),
      ctx.db
        .query("adCreatives")
        .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
        .collect(),
      ctx.db
        .query("adPerformanceRecords")
        .withIndex("by_campaignId_date", (q) => q.eq("campaignId", args.campaignId))
        .order("desc")
        .take(30),
      ctx.db
        .query("complianceChecks")
        .withIndex("by_campaignId", (q) => q.eq("campaignId", args.campaignId))
        .collect(),
    ]);

    return {
      campaign,
      adSetCount: adSets.length,
      creativeCount: creatives.length,
      recentPerformance: performanceRecords,
      complianceChecks,
    };
  },
});

/**
 * Internal query for agent use — no auth check needed (caller controls access).
 */
export const getByIdForAgent = internalQuery({
  args: { campaignId: v.id("campaigns") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.campaignId);
  },
});

export const getAggregateStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const campaigns = await ctx.db
      .query("campaigns")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const totalSpend = campaigns.reduce((sum, c) => sum + (c.spend ?? 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks ?? 0), 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + (c.conversions ?? 0), 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions ?? 0), 0);
    const activeCount = campaigns.filter((c) => c.status === "active").length;
    const draftCount = campaigns.filter((c) => c.status === "draft").length;

    // Compute blended CPA and ROAS
    const blendedCPA = totalConversions > 0 ? totalSpend / totalConversions : 0;
    // Estimate ROAS: assume $50 avg order value for estimation
    const estimatedRevenue = totalConversions * 50;
    const blendedROAS = totalSpend > 0 ? estimatedRevenue / totalSpend : 0;

    return {
      totalCampaigns: campaigns.length,
      activeCount,
      draftCount,
      totalSpend,
      totalClicks,
      totalConversions,
      totalImpressions,
      blendedCPA,
      blendedROAS,
    };
  },
});
