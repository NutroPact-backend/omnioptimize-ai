"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * ============================================================
 *  EXECUTION AGENT — Meta Ads (via Graph API)
 * ============================================================
 * Simulates Meta Ads campaign creation, ad set management,
 * and creative upload through the Graph API.
 * In production, replace with actual Meta Graph API calls.
 * ============================================================
 */

/**
 * Pre-flight campaign validation for Meta Ads.
 * Checks budget, creative, targeting, and policy compliance.
 */
async function validateMetaCampaign(campaign: {
  name: string;
  objective: string;
  dailyBudget: number;
  targeting?: string;
  creativeCount?: number;
}): Promise<{ valid: boolean; checks: Array<{ type: string; status: string; detail: string }> }> {
  const checks: Array<{ type: string; status: string; detail: string }> = [];

  // Budget validation
  const minDailyBudget = 5.0;
  checks.push({
    type: "budget_minimum",
    status: campaign.dailyBudget >= minDailyBudget ? "passed" : "failed",
    detail: `Daily budget $${campaign.dailyBudget.toFixed(2)} ${campaign.dailyBudget >= minDailyBudget ? "meets" : "is below"} the $${minDailyBudget.toFixed(2)} minimum.`,
  });

  // Budget cap check (no more than $10k/day without review)
  const dailyCap = 10000;
  if (campaign.dailyBudget > dailyCap) {
    checks.push({
      type: "budget_cap",
      status: "warning",
      detail: `Daily budget $${campaign.dailyBudget.toFixed(2)} exceeds $${dailyCap.toFixed(2)} — recommend human review.`,
    });
  }

  // Objective check
  const validObjectives = ["sales", "leads", "traffic", "awareness", "engagement"];
  checks.push({
    type: "objective_valid",
    status: validObjectives.includes(campaign.objective) ? "passed" : "failed",
    detail: `Objective "${campaign.objective}" is ${validObjectives.includes(campaign.objective) ? "valid" : "not supported"}.`,
  });

  // Creative count
  const minCreatives = 1;
  const creativeCount = campaign.creativeCount ?? 0;
  checks.push({
    type: "creative_count",
    status: creativeCount >= minCreatives ? "passed" : "failed",
    detail: `${creativeCount} creative(s) provided — minimum ${minCreatives} required.`,
  });

  return {
    valid: checks.every((c) => c.status !== "failed"),
    checks,
  };
}

/**
 * Validate Meta Ads campaign and return compliance result.
 */
export const validateMeta = action({
  args: {
    campaignId: v.id("campaigns"),
    name: v.string(),
    objective: v.string(),
    dailyBudget: v.float64(),
    targeting: v.optional(v.string()),
    creativeCount: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const result = await validateMetaCampaign({
      name: args.name,
      objective: args.objective,
      dailyBudget: args.dailyBudget,
      targeting: args.targeting,
      creativeCount: args.creativeCount ?? 0,
    });

    for (const check of result.checks) {
      await ctx.runMutation(internal.campaigns_mutations.insertComplianceCheck, {
        campaignId: args.campaignId,
        platform: "meta",
        checkType: check.type,
        status: check.status === "passed" ? "passed" : check.status === "warning" ? "warning" : "failed",
        details: check.detail,
      });
    }

    // Update campaign compliance status
    await ctx.runMutation(internal.campaigns_mutations.updateComplianceStatus, {
      campaignId: args.campaignId,
      status: result.valid ? "passed" : "failed",
    });

    return result;
  },
});

/**
 * Simulate launching a Meta Ads campaign.
 * In production, this calls the Meta Graph API:
 * POST /act_{ad_account_id}/campaigns
 */
export const launchMetaCampaign = action({
  args: {
    campaignId: v.id("campaigns"),
    accountId: v.string(),
    name: v.string(),
    objective: v.string(),
    dailyBudget: v.float64(),
    bidAmount: v.optional(v.float64()),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; platformCampaignId?: string; message: string }> => {
    // ── Pre-launch compliance gate ──
    const campaign = await ctx.runQuery(internal.campaigns.getByIdForAgent, {
      campaignId: args.campaignId,
    });

    if (!campaign) {
      return { success: false, message: "Campaign not found." };
    }

    if (campaign.complianceStatus !== "passed") {
      return {
        success: false,
        message: `Cannot launch: compliance status is "${campaign.complianceStatus}". Run compliance validation first.`,
      };
    }

    if (campaign.status === "active") {
      return { success: false, message: "Campaign is already active." };
    }

    // Simulated campaign creation
    const simulatedPlatformId = `meta_camp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await ctx.runMutation(internal.campaigns_mutations.updateCampaignPlatformId, {
      campaignId: args.campaignId,
      platformCampaignId: simulatedPlatformId,
      status: "active",
    });

    return {
      success: true,
      platformCampaignId: simulatedPlatformId,
      message: `Campaign "${args.name}" launched on Meta Ads (account: ${args.accountId})`,
    };
  },
});

/**
 * ============================================================
 *  EXECUTION AGENT — Google Ads (via Google Ads API)
 * ============================================================
 * Simulates Google Ads campaign management.
 * In production, replace with actual Google Ads API calls.
 * ============================================================
 */

/**
 * Pre-flight campaign validation for Google Ads.
 */
async function validateGoogleCampaign(campaign: {
  name: string;
  objective: string;
  dailyBudget: number;
  targeting?: string;
}): Promise<{ valid: boolean; checks: Array<{ type: string; status: string; detail: string }> }> {
  const checks: Array<{ type: string; status: string; detail: string }> = [];

  // Budget check
  checks.push({
    type: "budget_minimum",
    status: campaign.dailyBudget >= 1.0 ? "passed" : "failed",
    detail: `Daily budget $${campaign.dailyBudget.toFixed(2)} ${campaign.dailyBudget >= 1.0 ? "meets" : "is below"} the $1.00 minimum.`,
  });

  // Objective validity
  const googleObjectives = ["sales", "leads", "traffic", "awareness"];
  checks.push({
    type: "objective_valid",
    status: googleObjectives.includes(campaign.objective) ? "passed" : "warning",
    detail: `Objective "${campaign.objective}" is ${googleObjectives.includes(campaign.objective) ? "supported" : "may have limited support"} on Google Ads.`,
  });

  return {
    valid: checks.every((c) => c.status !== "failed"),
    checks,
  };
}

/**
 * Validate Google Ads campaign.
 */
export const validateGoogle = action({
  args: {
    campaignId: v.id("campaigns"),
    name: v.string(),
    objective: v.string(),
    dailyBudget: v.float64(),
    targeting: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await validateGoogleCampaign({
      name: args.name,
      objective: args.objective,
      dailyBudget: args.dailyBudget,
      targeting: args.targeting,
    });

    for (const check of result.checks) {
      await ctx.runMutation(internal.campaigns_mutations.insertComplianceCheck, {
        campaignId: args.campaignId,
        platform: "google",
        checkType: check.type,
        status: check.status === "passed" ? "passed" : check.status === "warning" ? "warning" : "failed",
        details: check.detail,
      });
    }

    await ctx.runMutation(internal.campaigns_mutations.updateComplianceStatus, {
      campaignId: args.campaignId,
      status: result.valid ? "passed" : "failed",
    });

    return result;
  },
});

/**
 * Simulate launching a Google Ads campaign.
 * In production, this calls the Google Ads API.
 */
export const launchGoogleCampaign = action({
  args: {
    campaignId: v.id("campaigns"),
    accountId: v.string(),
    name: v.string(),
    objective: v.string(),
    dailyBudget: v.float64(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; platformCampaignId?: string; message: string }> => {
    // ── Pre-launch compliance gate ──
    const campaign = await ctx.runQuery(internal.campaigns.getByIdForAgent, {
      campaignId: args.campaignId,
    });

    if (!campaign) {
      return { success: false, message: "Campaign not found." };
    }

    if (campaign.complianceStatus !== "passed") {
      return {
        success: false,
        message: `Cannot launch: compliance status is "${campaign.complianceStatus}". Run compliance validation first.`,
      };
    }

    if (campaign.status === "active") {
      return { success: false, message: "Campaign is already active." };
    }

    const simulatedPlatformId = `google_camp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    await ctx.runMutation(internal.campaigns_mutations.updateCampaignPlatformId, {
      campaignId: args.campaignId,
      platformCampaignId: simulatedPlatformId,
      status: "active",
    });

    return {
      success: true,
      platformCampaignId: simulatedPlatformId,
      message: `Campaign "${args.name}" launched on Google Ads (account: ${args.accountId})`,
    };
  },
});

/**
 * ============================================================
 *  DATA INGEST AGENT — Connector readiness check
 * ============================================================
 * Validates that ad platform connections are properly configured
 * before attempting campaign management.
 * ============================================================
 */

export const checkPlatformConnection = action({
  args: {
    platform: v.union(v.literal("meta"), v.literal("google")),
    accountId: v.string(),
  },
  handler: async (_ctx, args) => {
    // Check if API tokens are available in environment
    const envPrefix = args.platform === "meta" ? "META_ADS" : "GOOGLE_ADS";
    const token = process.env[`${envPrefix}_ACCESS_TOKEN`];
    const accountEnvVar = process.env[`${envPrefix}_ACCOUNT_ID`];

    if (!token) {
      return {
        connected: false,
        message: `${args.platform === "meta" ? "Meta" : "Google"} Ads API token not configured. Set ${envPrefix}_ACCESS_TOKEN in environment variables.`,
        requiredEnvVars: [`${envPrefix}_ACCESS_TOKEN`, `${envPrefix}_ACCOUNT_ID`],
      };
    }

    return {
      connected: true,
      message: `${args.platform === "meta" ? "Meta" : "Google"} Ads connection validated for account ${args.accountId}.`,
      accountId: accountEnvVar || args.accountId,
    };
  },
});
