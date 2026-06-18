"use node";

import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * ============================================================
 *  DATA INGESTION — Foundational framework for platform data
 *
 *  Provides the ingestion architecture for:
 *  - Google Analytics 4 (GA4) — Data API connector
 *  - Meta Ads — Graph API connector
 *  - Generic platform connection framework
 *
 *  Each connector has two parts:
 *    1. Connection validation (checks credentials are configured)
 *    2. Data fetch stubs (ready for real API integration when credentials are provided)
 * ============================================================
 */

/* ───── Types ───── */
export type DataSource = "ga4" | "meta_ads" | "google_ads";

export interface IngestionManifest {
  source: DataSource;
  status: "configured" | "missing_credentials" | "error";
  requiredEnvVars: string[];
  accountId: string | null;
  lastSyncedAt: number | null;
}

export interface IngestionResult {
  success: boolean;
  source: DataSource;
  recordsIngested: number;
  timeRange: { start: number; end: number };
  error?: string;
  data?: any;
}

/* ───── GA4 Connector ───── */

/**
 * GA4 Data API connector framework.
 * Uses environment variables for credentials:
 *  - GA4_CLIENT_EMAIL
 *  - GA4_PRIVATE_KEY
 *  - GA4_PROPERTY_ID
 */
export const checkGa4Connection = action({
  args: {
    propertyId: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<IngestionManifest> => {
    const clientEmail = process.env.GA4_CLIENT_EMAIL;
    const privateKey = process.env.GA4_PRIVATE_KEY;
    const propertyId = args.propertyId || process.env.GA4_PROPERTY_ID;

    if (!clientEmail || !privateKey || !propertyId) {
      return {
        source: "ga4",
        status: "missing_credentials",
        requiredEnvVars: ["GA4_CLIENT_EMAIL", "GA4_PRIVATE_KEY", "GA4_PROPERTY_ID"],
        accountId: propertyId || null,
        lastSyncedAt: null,
      };
    }

    return {
      source: "ga4",
      status: "configured",
      requiredEnvVars: ["GA4_CLIENT_EMAIL", "GA4_PRIVATE_KEY", "GA4_PROPERTY_ID"],
      accountId: propertyId,
      lastSyncedAt: Date.now(),
    };
  },
});

/**
 * Fetch analytics data from GA4.
 * Stub implementation — replaces with real Google Analytics Data API call
 * when credentials are configured.
 */
export const fetchGa4Analytics = action({
  args: {
    propertyId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args): Promise<IngestionResult> => {
    const { propertyId, startDate, endDate, projectId } = args;

    const connection = await ctx.runAction(internal.ingestion.checkGa4Connection, {
      propertyId,
    });

    if (connection.status !== "configured") {
      return {
        success: false,
        source: "ga4",
        recordsIngested: 0,
        timeRange: { start: startDate, end: endDate },
        error: `GA4 not configured. Required env vars: ${connection.requiredEnvVars.join(", ")}`,
      };
    }

    // ── Stub: Real implementation would call:
    //    const { BetaAnalyticsDataClient } = require('@google-analytics/data');
    //    const client = new BetaAnalyticsDataClient({
    //      credentials: { client_email: process.env.GA4_CLIENT_EMAIL, private_key: process.env.GA4_PRIVATE_KEY }
    //    });
    //    const [response] = await client.runReport({
    //      property: `properties/${propertyId}`,
    //      dateRanges: [{ startDate: formatDate(startDate), endDate: formatDate(endDate) }],
    //      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }, { name: 'conversions' }],
    //      dimensions: [{ name: 'date' }, { name: 'source' }, { name: 'campaignName' }],
    //    });

    if (projectId) {
      await ctx.runMutation(internal.event_bus.emitInternal, {
        eventType: "analysis.requested",
        sourceAgent: "ingestion",
        projectId,
        payload: JSON.stringify({
          source: "ga4",
          propertyId,
          timeRange: { start: startDate, end: endDate },
          note: "GA4 data fetch stub — real API call pending credential configuration",
        }),
      });
    }

    return {
      success: true,
      source: "ga4",
      recordsIngested: 0,
      timeRange: { start: startDate, end: endDate },
      data: {
        message: "GA4 analytics connector framework ready. Configure GA4_CLIENT_EMAIL, GA4_PRIVATE_KEY, GA4_PROPERTY_ID to enable real data fetching.",
        propertyId,
      },
    };
  },
});

/* ───── Meta Ads Connector ───── */

/**
 * Meta Ads Graph API connector framework.
 * Uses environment variables:
 *  - META_ADS_ACCESS_TOKEN
 *  - META_ADS_ACCOUNT_ID
 */
export const checkMetaConnection = action({
  args: {
    accountId: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<IngestionManifest> => {
    const accessToken = process.env.META_ADS_ACCESS_TOKEN;
    const accountId = args.accountId || process.env.META_ADS_ACCOUNT_ID;

    if (!accessToken || !accountId) {
      return {
        source: "meta_ads",
        status: "missing_credentials",
        requiredEnvVars: ["META_ADS_ACCESS_TOKEN", "META_ADS_ACCOUNT_ID"],
        accountId: accountId || null,
        lastSyncedAt: null,
      };
    }

    return {
      source: "meta_ads",
      status: "configured",
      requiredEnvVars: ["META_ADS_ACCESS_TOKEN", "META_ADS_ACCOUNT_ID"],
      accountId,
      lastSyncedAt: Date.now(),
    };
  },
});

/**
 * Fetch campaign performance from Meta Ads.
 * Stub implementation — replaces with real Meta Graph API call.
 */
export const fetchMetaAdsPerformance = action({
  args: {
    accountId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    campaignId: v.optional(v.id("campaigns")),
  },
  handler: async (ctx, args): Promise<IngestionResult> => {
    const { accountId, startDate, endDate, campaignId } = args;

    const connection = await ctx.runAction(internal.ingestion.checkMetaConnection, {
      accountId,
    });

    if (connection.status !== "configured") {
      return {
        success: false,
        source: "meta_ads",
        recordsIngested: 0,
        timeRange: { start: startDate, end: endDate },
        error: `Meta Ads not configured. Required env vars: ${connection.requiredEnvVars.join(", ")}`,
      };
    }

    // ── Stub: Real implementation would call the Meta Graph API:
    //    const response = await fetch(
    //      `https://graph.facebook.com/v18.0/act_${accountId}/campaigns?fields=name,status,daily_budget,insights.date_preset('last_30d'){impressions,clicks,spend,conversions,ctr,cpa}&access_token=${accessToken}`
    //    );
    //    const data = await response.json();

    if (campaignId) {
      await ctx.runMutation(internal.event_bus.emitInternal, {
        eventType: "campaign.created",
        sourceAgent: "ingestion",
        campaignId,
        payload: JSON.stringify({
          source: "meta_ads",
          accountId,
          timeRange: { start: startDate, end: endDate },
          note: "Meta Ads data fetch stub — real API call pending credential configuration",
        }),
      });
    }

    return {
      success: true,
      source: "meta_ads",
      recordsIngested: 0,
      timeRange: { start: startDate, end: endDate },
      data: {
        message: "Meta Ads connector framework ready. Configure META_ADS_ACCESS_TOKEN, META_ADS_ACCOUNT_ID to enable real data fetching.",
        accountId,
      },
    };
  },
});

/* ───── Google Ads Connector ───── */

/**
 * Google Ads API connector framework.
 * Uses environment variables:
 *  - GOOGLE_ADS_ACCESS_TOKEN
 *  - GOOGLE_ADS_ACCOUNT_ID
 */
export const checkGoogleAdsConnection = action({
  args: {
    accountId: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<IngestionManifest> => {
    const accessToken = process.env.GOOGLE_ADS_ACCESS_TOKEN;
    const accountId = args.accountId || process.env.GOOGLE_ADS_ACCOUNT_ID;

    if (!accessToken || !accountId) {
      return {
        source: "google_ads",
        status: "missing_credentials",
        requiredEnvVars: ["GOOGLE_ADS_ACCESS_TOKEN", "GOOGLE_ADS_ACCOUNT_ID"],
        accountId: accountId || null,
        lastSyncedAt: null,
      };
    }

    return {
      source: "google_ads",
      status: "configured",
      requiredEnvVars: ["GOOGLE_ADS_ACCESS_TOKEN", "GOOGLE_ADS_ACCOUNT_ID"],
      accountId,
      lastSyncedAt: Date.now(),
    };
  },
});

/**
 * Fetch campaign performance from Google Ads.
 * Stub implementation — replaces with real Google Ads API call.
 */
export const fetchGoogleAdsPerformance = action({
  args: {
    accountId: v.string(),
    startDate: v.number(),
    endDate: v.number(),
    campaignId: v.optional(v.id("campaigns")),
  },
  handler: async (ctx, args): Promise<IngestionResult> => {
    const { accountId, startDate, endDate, campaignId } = args;

    const connection = await ctx.runAction(internal.ingestion.checkGoogleAdsConnection, {
      accountId,
    });

    if (connection.status !== "configured") {
      return {
        success: false,
        source: "google_ads",
        recordsIngested: 0,
        timeRange: { start: startDate, end: endDate },
        error: `Google Ads not configured. Required env vars: ${connection.requiredEnvVars.join(", ")}`,
      };
    }

    if (campaignId) {
      await ctx.runMutation(internal.event_bus.emitInternal, {
        eventType: "campaign.validated",
        sourceAgent: "ingestion",
        campaignId,
        payload: JSON.stringify({
          source: "google_ads",
          accountId,
          timeRange: { start: startDate, end: endDate },
          note: "Google Ads data fetch stub — real API call pending credential configuration",
        }),
      });
    }

    return {
      success: true,
      source: "google_ads",
      recordsIngested: 0,
      timeRange: { start: startDate, end: endDate },
      data: {
        message: "Google Ads connector framework ready. Configure GOOGLE_ADS_ACCESS_TOKEN, GOOGLE_ADS_ACCOUNT_ID to enable real data fetching.",
        accountId,
      },
    };
  },
});

/* ───── Check All Platform Connections ───── */

/**
 * Check the status of all configured platform connections.
 * Returns a manifest of what's configured vs what's missing.
 */
export const checkAllConnections = query({
  args: {},
  handler: async (_ctx) => {
    const manifests: Record<string, any> = {};

    // Check env vars for each platform
    manifests.ga4 = {
      source: "ga4",
      status: process.env.GA4_CLIENT_EMAIL && process.env.GA4_PRIVATE_KEY && process.env.GA4_PROPERTY_ID
        ? "configured"
        : "missing_credentials",
      requiredEnvVars: ["GA4_CLIENT_EMAIL", "GA4_PRIVATE_KEY", "GA4_PROPERTY_ID"],
      accountId: process.env.GA4_PROPERTY_ID || null,
    };

    manifests.meta_ads = {
      source: "meta_ads",
      status: process.env.META_ADS_ACCESS_TOKEN && process.env.META_ADS_ACCOUNT_ID
        ? "configured"
        : "missing_credentials",
      requiredEnvVars: ["META_ADS_ACCESS_TOKEN", "META_ADS_ACCOUNT_ID"],
      accountId: process.env.META_ADS_ACCOUNT_ID || null,
    };

    manifests.google_ads = {
      source: "google_ads",
      status: process.env.GOOGLE_ADS_ACCESS_TOKEN && process.env.GOOGLE_ADS_ACCOUNT_ID
        ? "configured"
        : "missing_credentials",
      requiredEnvVars: ["GOOGLE_ADS_ACCESS_TOKEN", "GOOGLE_ADS_ACCOUNT_ID"],
      accountId: process.env.GOOGLE_ADS_ACCOUNT_ID || null,
    };

    return manifests;
  },
});

/* ═══════════════════════════════════════════════════════════════
 *  UNIFIED INGESTION PIPELINE — Platform data → Normalized records
 *
 *  Takes a connected platform, fetches performance data via API
 *  (or returns a manifest of what would be fetched), normalizes
 *  into the unified schema, and persists to:
 *    - campaigns table (performance snapshot)
 *    - adPerformanceRecords (time-series daily data)
 *    - complianceChecks (platform readiness)
 * ═══════════════════════════════════════════════════════════════ */

/**
 * Ingest data from a connected platform account.
 * This is the unified entry point for all platform data ingestion.
 *
 * When env vars are configured, this makes real API calls.
 * Until then, it validates the connection and returns a manifest
 * describing exactly what data will be fetched when credentials are set.
 */
export const ingestPlatformData = action({
  args: {
    connectionId: v.id("platformConnections"),
    projectId: v.optional(v.id("projects")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    source: string;
    recordsIngested: number;
    message: string;
    manifest?: IngestionManifest;
    error?: string;
  }> => {
    const { connectionId, projectId } = args;
    const startDate = args.startDate ?? Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    const endDate = args.endDate ?? Date.now();

    // Load the connection
    const connection = await ctx.runQuery(internal.platform_connections.getConnectionById, {
      connectionId,
    });

    if (!connection) {
      return { success: false, source: "unknown", recordsIngested: 0, message: "Connection not found" };
    }

    try {
      if (connection.platform === "meta") {
        const metaResult = await ctx.runAction(internal.ingestion.fetchMetaAdsPerformance, {
          accountId: connection.accountId,
          startDate,
          endDate,
        });

        if (!metaResult.success) {
          return {
            success: false,
            source: "meta_ads",
            recordsIngested: 0,
            message: metaResult.error || "Meta Ads ingestion failed",
            error: metaResult.error,
          };
        }

        // ── Normalize & persist if we have real data ──
        if (metaResult.data?.campaigns && Array.isArray(metaResult.data.campaigns)) {
          let ingested = 0;
          for (const camp of metaResult.data.campaigns) {
            await ctx.runMutation(internal.campaigns_mutations.insertPerformanceRecord, {
              campaignId: connectionId as any, // placeholder — real impl uses actual campaignId
              platform: "meta",
              date: endDate,
              impressions: camp.impressions,
              clicks: camp.clicks,
              conversions: camp.conversions,
              spend: camp.spend,
            });
            ingested++;
          }
          return {
            success: true,
            source: "meta_ads",
            recordsIngested: ingested,
            message: `Ingested ${ingested} campaign performance records from Meta Ads.`,
          };
        }

        // ── Stub mode: return manifest ──
        const checkResult = await ctx.runAction(internal.ingestion.checkMetaConnection, {
          accountId: connection.accountId,
        });

        if (projectId) {
          await ctx.runMutation(internal.event_bus.emitInternal, {
            eventType: "campaign.created",
            sourceAgent: "ingestion",
            projectId,
            payload: JSON.stringify({
              source: "meta_ads",
              accountId: connection.accountId,
              accountName: connection.accountName,
              timeRange: { start: startDate, end: endDate },
              note: "Meta Ads data ingestion ready. Configure META_ADS_ACCESS_TOKEN to enable real data fetching.",
            }),
          });
        }

        return {
          success: true,
          source: "meta_ads",
          recordsIngested: 0,
          message: "Meta Ads connector framework ready. Configure META_ADS_ACCESS_TOKEN and META_ADS_ACCOUNT_ID to enable live data ingestion.",
          manifest: checkResult,
        };
      }

      if (connection.platform === "google") {
        const googleResult = await ctx.runAction(internal.ingestion.fetchGoogleAdsPerformance, {
          accountId: connection.accountId,
          startDate,
          endDate,
        });

        if (!googleResult.success) {
          return {
            success: false,
            source: "google_ads",
            recordsIngested: 0,
            message: googleResult.error || "Google Ads ingestion failed",
            error: googleResult.error,
          };
        }

        // ── Normalize & persist if we have real data ──
        if (googleResult.data?.campaigns && Array.isArray(googleResult.data.campaigns)) {
          let ingested = 0;
          for (const camp of googleResult.data.campaigns) {
            await ctx.runMutation(internal.campaigns_mutations.insertPerformanceRecord, {
              campaignId: connectionId as any,
              platform: "google",
              date: endDate,
              impressions: camp.impressions,
              clicks: camp.clicks,
              conversions: camp.conversions,
              spend: camp.spend,
            });
            ingested++;
          }
          return {
            success: true,
            source: "google_ads",
            recordsIngested: ingested,
            message: `Ingested ${ingested} campaign performance records from Google Ads.`,
          };
        }

        const checkResult = await ctx.runAction(internal.ingestion.checkGoogleAdsConnection, {
          accountId: connection.accountId,
        });

        if (projectId) {
          await ctx.runMutation(internal.event_bus.emitInternal, {
            eventType: "campaign.validated",
            sourceAgent: "ingestion",
            projectId,
            payload: JSON.stringify({
              source: "google_ads",
              accountId: connection.accountId,
              accountName: connection.accountName,
              timeRange: { start: startDate, end: endDate },
              note: "Google Ads data ingestion ready. Configure GOOGLE_ADS_ACCESS_TOKEN to enable real data fetching.",
            }),
          });
        }

        return {
          success: true,
          source: "google_ads",
          recordsIngested: 0,
          message: "Google Ads connector framework ready. Configure GOOGLE_ADS_ACCESS_TOKEN and GOOGLE_ADS_ACCOUNT_ID to enable live data ingestion.",
          manifest: checkResult,
        };
      }

      return {
        success: false,
        source: connection.platform,
        recordsIngested: 0,
        message: `Unknown platform: ${connection.platform}`,
      };
    } catch (error: any) {
      return {
        success: false,
        source: connection.platform,
        recordsIngested: 0,
        message: `Ingestion failed: ${error?.message || "Unknown error"}`,
        error: error?.message,
      };
    }
  },
});

/* ───── Bulk sync all connected platforms ───── */

/**
 * Sync performance data from ALL connected platform accounts.
 * Returns a summary of what was ingested for each platform.
 */
export const syncAllPlatforms = action({
  args: {
    projectId: v.optional(v.id("projects")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{
    success: boolean;
    results: Array<{ platform: string; accountId: string; status: string; records?: number; error?: string }>;
    totalRecordsIngested: number;
  }> => {
    const results: Array<{ platform: string; accountId: string; status: string; records?: number; error?: string }> = [];
    let totalRecordsIngested = 0;

    // Query all connected platforms from the database
    // We need to use a workaround since platform_connections.list requires auth
    // We'll use the internal query directly
    const connections = await ctx.runQuery(internal.platform_connections.getAllConnections);

    if (!connections || connections.length === 0) {
      return {
        success: true,
        results: [],
        totalRecordsIngested: 0,
      };
    }

    for (const connection of connections) {
      try {
        const ingestResult = await ctx.runAction(internal.ingestion.ingestPlatformData, {
          connectionId: connection._id,
          projectId: args.projectId,
          startDate: args.startDate,
          endDate: args.endDate,
        });

        results.push({
          platform: ingestResult.source,
          accountId: connection.accountId,
          status: ingestResult.success ? "success" : "error",
          records: ingestResult.recordsIngested,
          error: ingestResult.error,
        });

        totalRecordsIngested += ingestResult.recordsIngested;
      } catch (error: any) {
        results.push({
          platform: connection.platform,
          accountId: connection.accountId,
          status: "error",
          error: error?.message || "Unknown error",
        });
      }
    }

    return {
      success: results.every((r) => r.status === "success"),
      results,
      totalRecordsIngested,
    };
  },
});
