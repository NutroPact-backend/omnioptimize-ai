import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const insertComplianceCheck = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    platform: v.union(v.literal("meta"), v.literal("google")),
    checkType: v.string(),
    status: v.union(v.literal("pending"), v.literal("passed"), v.literal("warning"), v.literal("failed")),
    details: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("complianceChecks", {
      campaignId: args.campaignId,
      platform: args.platform,
      checkType: args.checkType,
      status: args.status,
      details: args.details,
      checkedAt: Date.now(),
    });
  },
});

export const updateComplianceStatus = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    status: v.union(v.literal("pending"), v.literal("passed"), v.literal("warning"), v.literal("failed")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, {
      complianceStatus: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const updateCampaignPlatformId = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    platformCampaignId: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("paused"),
      v.literal("archived"),
      v.literal("error"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.campaignId, {
      platformCampaignId: args.platformCampaignId,
      status: args.status,
      updatedAt: Date.now(),
    });
  },
});

export const updateCampaignPerformance = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    impressions: v.optional(v.float64()),
    clicks: v.optional(v.float64()),
    conversions: v.optional(v.float64()),
    spend: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      updatedAt: Date.now(),
      lastSyncedAt: Date.now(),
    };
    if (args.impressions !== undefined) patch.impressions = args.impressions;
    if (args.clicks !== undefined) patch.clicks = args.clicks;
    if (args.conversions !== undefined) patch.conversions = args.conversions;
    if (args.spend !== undefined) patch.spend = args.spend;

    // Derive CPA + ROAS
    const campaign = await ctx.db.get(args.campaignId);
    if (campaign) {
      const convs = args.conversions ?? campaign.conversions ?? 0;
      const spnd = args.spend ?? campaign.spend ?? 0;
      if (convs > 0) {
        patch.cpa = spnd / convs;
        patch.roas = (convs * 50) / spnd; // estimated $50 AOV
      }
    }

    await ctx.db.patch(args.campaignId, patch);
  },
});

export const insertPerformanceRecord = internalMutation({
  args: {
    campaignId: v.id("campaigns"),
    platform: v.union(v.literal("meta"), v.literal("google")),
    date: v.number(),
    impressions: v.optional(v.float64()),
    clicks: v.optional(v.float64()),
    conversions: v.optional(v.float64()),
    spend: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const convs = args.conversions ?? 0;
    const spnd = args.spend ?? 0;
    const imps = args.impressions ?? 0;
    const clicks = args.clicks ?? 0;

    await ctx.db.insert("adPerformanceRecords", {
      campaignId: args.campaignId,
      date: args.date,
      platform: args.platform,
      impressions: imps,
      clicks,
      conversions: convs,
      spend: spnd,
      cpa: convs > 0 ? spnd / convs : undefined,
      roas: spnd > 0 ? (convs * 50) / spnd : undefined,
      cpm: imps > 0 ? (spnd / imps) * 1000 : undefined,
      cpc: clicks > 0 ? spnd / clicks : undefined,
      ctr: imps > 0 ? (clicks / imps) * 100 : undefined,
      cvr: clicks > 0 ? (convs / clicks) * 100 : undefined,
    });
  },
});
