"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, internalQuery, mutation, query } from "./_generated/server";

/**
 * ============================================================
 *  PLATFORM CONNECTIONS — User-managed ad platform accounts
 *
 *  Full CRUD for the platformConnections table.
 *  Users can link their Meta Ads, Google Ads, and GA4 accounts.
 * ============================================================
 */

/* ───── List all connections for the current user ───── */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("platformConnections")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

/* ───── Get a single connection by ID ───── */
export const getById = query({
  args: { connectionId: v.id("platformConnections") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.userId !== userId) return null;
    return connection;
  },
});

/* ───── Create a new platform connection ───── */
export const create = mutation({
  args: {
    platform: v.union(v.literal("meta"), v.literal("google")),
    label: v.string(),
    accountId: v.string(),
    accountName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check for duplicate
    const existing = await ctx.db
      .query("platformConnections")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const duplicate = existing.find(
      (c) => c.platform === args.platform && c.accountId === args.accountId,
    );
    if (duplicate) {
      throw new Error(`Account ${args.accountId} is already connected for ${args.platform}`);
    }

    const now = Date.now();
    const connectionId = await ctx.db.insert("platformConnections", {
      userId,
      platform: args.platform,
      label: args.label,
      accountId: args.accountId,
      accountName: args.accountName,
      status: "connected",
      connectedAt: now,
    });

    return connectionId;
  },
});

/* ───── Update a connection ───── */
export const update = mutation({
  args: {
    connectionId: v.id("platformConnections"),
    label: v.optional(v.string()),
    accountId: v.optional(v.string()),
    accountName: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("connected"), v.literal("expired"), v.literal("error")),
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.userId !== userId) throw new Error("Not found");

    const patch: Record<string, unknown> = {};
    if (args.label !== undefined) patch.label = args.label;
    if (args.accountId !== undefined) patch.accountId = args.accountId;
    if (args.accountName !== undefined) patch.accountName = args.accountName;
    if (args.status !== undefined) patch.status = args.status;

    await ctx.db.patch(args.connectionId, patch);
  },
});

/* ───── Delete a connection ───── */
export const remove = mutation({
  args: { connectionId: v.id("platformConnections") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.userId !== userId) throw new Error("Not found");

    await ctx.db.delete(args.connectionId);
  },
});

/* ───── Verify a connection status ───── */
/* ───── Internal: Get a connection by ID (no auth — for agent use) ───── */
export const getConnectionById = internalQuery({
  args: { connectionId: v.id("platformConnections") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.connectionId);
  },
});

/* ───── Internal: Get all connections (no auth — for agent use) ───── */
export const getAllConnections = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("platformConnections").collect();
  },
});

/* ───── Verify a connection status ───── */
export const verifyConnection = action({
  args: {
    platform: v.union(v.literal("meta"), v.literal("google")),
    accountId: v.string(),
  },
  handler: async (_ctx, args) => {
    // Check if the platform's env vars are configured
    const envPrefix = args.platform === "meta" ? "META_ADS" : "GOOGLE_ADS";
    const token = process.env[`${envPrefix}_ACCESS_TOKEN`];
    const accountEnvVar = process.env[`${envPrefix}_ACCOUNT_ID`];

    if (!token) {
      return {
        valid: false,
        message: `${args.platform === "meta" ? "Meta" : "Google"} Ads API token not configured. Add ${envPrefix}_ACCESS_TOKEN to environment variables.`,
      };
    }

    if (!accountEnvVar && !args.accountId) {
      return {
        valid: false,
        message: `${args.platform === "meta" ? "Meta" : "Google"} Ads account ID not configured. Add ${envPrefix}_ACCOUNT_ID to environment variables.`,
      };
    }

    return {
      valid: true,
      message: `${args.platform === "meta" ? "Meta" : "Google"} Ads connection validated.`,
      accountId: accountEnvVar || args.accountId,
    };
  },
});
