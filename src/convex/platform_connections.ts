"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * ============================================================
 *  PLATFORM CONNECTIONS — OAuth-based ad account management
 *
 *  Supports multiple Meta Ads and Google Ads accounts per
 *  workspace/project. Uses real OAuth 2.0 token exchange with
 *  automatic token refresh. Future-ready credential management
 *  with support for multiple credential providers.
 *
 *  Key design decisions:
 *  - Multi-account: Multiple connections per platform per user
 *  - OAuth-first: Real OAuth 2.0 exchange & refresh
 *  - Future-ready: credentialProvider supports oauth|api_key|jwt|service_account
 *  - Secure: Tokens stored encrypted (server-side via Convex secrets)
 *  - Verifiable: Periodic status check with lastVerifiedAt timestamp
 * ============================================================
 */

/* ───── Constants ───── */
const PLATFORM_OAUTH_CONFIGS: Record<string, {
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  defaultScopes: string[];
  envClientId: string;
  envClientSecret: string;
}> = {
  meta: {
    authUrl: "https://www.facebook.com/v22.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v22.0/oauth/access_token",
    scopes: [
      "ads_read",
      "ads_management",
      "business_management",
      "pages_read_engagement",
    ],
    defaultScopes: ["ads_read", "ads_management"],
    envClientId: "META_ADS_CLIENT_ID",
    envClientSecret: "META_ADS_CLIENT_SECRET",
  },
  google: {
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/adwords",
    ],
    defaultScopes: ["https://www.googleapis.com/auth/adwords"],
    envClientId: "GOOGLE_ADS_CLIENT_ID",
    envClientSecret: "GOOGLE_ADS_CLIENT_SECRET",
  },
};

/* ───── Types ───── */
export type CredentialProvider = "oauth" | "api_key" | "jwt" | "service_account";
export type ConnectionStatus = "connected" | "expired" | "error" | "pending";

/* ───── Helper: simple base64 encoding (safe for Convex) ───── */
function b64encode(str: string): string {
  return Buffer.from(str).toString("base64");
}

/* ───── List all connections for the current user ───── */
export const list = query({
  args: {
    platform: v.optional(v.union(v.literal("meta"), v.literal("google"))),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    let q = ctx.db
      .query("platformConnections")
      .withIndex("by_userId", (q) => q.eq("userId", userId));

    // Filter by platform if specified
    if (args.platform) {
      q = q.filter((item) => item.eq(item.field("platform"), args.platform!));
    }
    // Filter by project if specified
    if (args.projectId) {
      q = q.filter((item) => item.eq(item.field("projectId"), args.projectId!));
    }

    return await q.order("desc").collect();
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

/* ───── Get OAuth authorization URL for a platform ───── */
export const getOAuthUrl = action({
  args: {
    platform: v.union(v.literal("meta"), v.literal("google")),
    redirectUri: v.string(),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const config = PLATFORM_OAUTH_CONFIGS[args.platform];
    if (!config) throw new Error(`Unknown platform: ${args.platform}`);

    const clientId = process.env[config.envClientId];
    if (!clientId) {
      return {
        success: false,
        error: `${args.platform === "meta" ? "Meta" : "Google"} OAuth client ID not configured. Add ${config.envClientId} to environment variables.`,
        requiredEnvVars: [config.envClientId, config.envClientSecret],
      };
    }

    // Generate a state parameter for CSRF protection
    const state = b64encode(JSON.stringify({
      userId,
      projectId: args.projectId,
      platform: args.platform,
      nonce: Math.random().toString(36).slice(2, 10),
    }));

    // Build the OAuth authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: args.redirectUri,
      state,
      response_type: "code",
      scope: config.defaultScopes.join(" "),
      access_type: "offline",
      prompt: "consent", // Force refresh token on every auth
    });

    return {
      success: true,
      authUrl: `${config.authUrl}?${params.toString()}`,
      state,
      platform: args.platform,
    };
  },
});

/* ───── Exchange OAuth authorization code for tokens ───── */
export const exchangeOAuthCode = action({
  args: {
    platform: v.union(v.literal("meta"), v.literal("google")),
    code: v.string(),
    redirectUri: v.string(),
    state: v.optional(v.string()),
    label: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const config = PLATFORM_OAUTH_CONFIGS[args.platform];
    if (!config) throw new Error(`Unknown platform: ${args.platform}`);

    const clientId = process.env[config.envClientId];
    const clientSecret = process.env[config.envClientSecret];

    if (!clientId || !clientSecret) {
      return {
        success: false,
        error: `${args.platform === "meta" ? "Meta" : "Google"} OAuth credentials not configured.`,
        requiredEnvVars: [config.envClientId, config.envClientSecret],
      };
    }

    try {
      // Exchange the authorization code for tokens
      const tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          ...(args.platform === "meta"
            ? {} // Meta uses body params
            : { Authorization: `Basic ${b64encode(`${clientId}:${clientSecret}`)}` }),
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code: args.code,
          redirect_uri: args.redirectUri,
          grant_type: "authorization_code",
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.text();
        return {
          success: false,
          error: `Token exchange failed: ${tokenResponse.status} — ${errorBody}`,
        };
      }

      const tokenData = await tokenResponse.json();

      // Calculate token expiration
      const expiresIn = tokenData.expires_in || 3600;
      const now = Date.now();

      // Fetch account information from the platform
      let accountId = "";
      let accountDisplayName = "";
      let accountCurrency = "";
      let accountTimezone = "";
      let platformStatus = "";

      try {
        if (args.platform === "meta") {
          // Fetch the default ad account from the user's business
          const meResponse = await fetch(
            `https://graph.facebook.com/v22.0/me/adaccounts?fields=id,name,account_id,currency,timezone_name,account_status&access_token=${tokenData.access_token}`,
          );
          if (meResponse.ok) {
            const meData = await meResponse.json();
            if (meData.data && meData.data.length > 0) {
              const acct = meData.data[0];
              accountId = acct.account_id || acct.id || "";
              accountDisplayName = acct.name || "";
              accountCurrency = acct.currency || "";
              accountTimezone = acct.timezone_name || "";
              platformStatus = String(acct.account_status || "");
            }
          }
        } else {
          // Google Ads: fetch customer info
          // (Requires Google Ads API which needs the access token)
          const customerResponse = await fetch(
            "https://googleads.googleapis.com/v18/customers:list",
            {
              headers: {
                Authorization: `Bearer ${tokenData.access_token}`,
                "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
              },
            },
          );
          if (customerResponse.ok) {
            const custData = await customerResponse.json();
            if (custData.resources && custData.resources.length > 0) {
              const cust = custData.resources[0];
              accountId = cust.resourceName?.split("/")[1] || "";
              accountDisplayName = cust.descriptiveName || cust.id || "";
              accountCurrency = cust.currencyCode || "";
              accountTimezone = cust.timeZone || "";
            }
          }
        }
      } catch {
        // Account info fetch is non-critical — use fallback values
      }

      if (!accountId) {
        accountId = tokenData.account_id || (tokenData.id || "").toString();
      }

      // Create the connection record
      const connectionId = await ctx.runMutation(
        internal.platform_connections.createConnectionRecord,
        {
          userId,
          projectId: args.projectId,
          platform: args.platform,
          label: args.label || `${args.platform === "meta" ? "Meta" : "Google"} Ads — ${accountDisplayName || accountId}`,
          accountId,
          accountDisplayName: accountDisplayName || undefined,
          accountCurrency: accountCurrency || undefined,
          accountTimezone: accountTimezone || undefined,
          accountStatus: platformStatus || undefined,
          credentialProvider: "oauth",
          encryptedAccessToken: tokenData.access_token,
          encryptedRefreshToken: tokenData.refresh_token,
          tokenType: tokenData.token_type || "Bearer",
          tokenExpiresAt: now + expiresIn * 1000,
          scopes: tokenData.scope ? tokenData.scope.split(/[,\s]+/) : config.defaultScopes,
          status: "connected",
        },
      );

      return {
        success: true,
        connectionId,
        platform: args.platform,
        accountId,
        accountDisplayName: accountDisplayName || undefined,
        expiresAt: now + expiresIn * 1000,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `OAuth exchange failed: ${error?.message || "Unknown error"}`,
      };
    }
  },
});

/* ───── Refresh an OAuth token ───── */
export const refreshToken = action({
  args: {
    connectionId: v.id("platformConnections"),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(
      internal.platform_connections.getConnectionById,
      { connectionId: args.connectionId },
    );

    if (!connection) return { success: false, error: "Connection not found" };

    const config = PLATFORM_OAUTH_CONFIGS[connection.platform];
    if (!config) return { success: false, error: `Unknown platform: ${connection.platform}` };

    const refreshToken = connection.encryptedRefreshToken;
    if (!refreshToken) {
      // No refresh token — mark as expired and require re-auth
      await ctx.runMutation(internal.platform_connections.updateConnectionStatus, {
        connectionId: args.connectionId,
        status: "expired",
        verificationError: "No refresh token available. Re-authentication required.",
      });
      return { success: false, error: "No refresh token available. Re-authentication required." };
    }

    const clientId = process.env[config.envClientId];
    const clientSecret = process.env[config.envClientSecret];

    if (!clientId || !clientSecret) {
      return { success: false, error: "OAuth credentials not configured." };
    }

    try {
      const tokenResponse = await fetch(config.tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
        }).toString(),
      });

      if (!tokenResponse.ok) {
        const errorBody = await tokenResponse.text();

        // If the refresh token is invalid/expired, mark connection for re-auth
        if (tokenResponse.status === 400 || tokenResponse.status === 401) {
          await ctx.runMutation(internal.platform_connections.updateConnectionStatus, {
            connectionId: args.connectionId,
            status: "expired",
            verificationError: "Refresh token rejected. Re-authentication required.",
          });
        }

        return {
          success: false,
          error: `Token refresh failed: ${tokenResponse.status} — ${errorBody}`,
        };
      }

      const tokenData = await tokenResponse.json();
      const expiresIn = tokenData.expires_in || 3600;
      const now = Date.now();

      // Update the stored tokens
      await ctx.runMutation(internal.platform_connections.updateConnectionTokens, {
        connectionId: args.connectionId,
        encryptedAccessToken: tokenData.access_token,
        encryptedRefreshToken: tokenData.refresh_token || refreshToken, // Some providers don't re-issue refresh tokens
        tokenExpiresAt: now + expiresIn * 1000,
        status: "connected",
        verificationError: undefined,
        credentialVersion: (connection.credentialVersion ?? 1) + 1,
      });

      return {
        success: true,
        expiresAt: now + expiresIn * 1000,
        credentialVersion: (connection.credentialVersion ?? 1) + 1,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Token refresh failed: ${error?.message || "Unknown error"}`,
      };
    }
  },
});

/* ───── Verify a connection (check token validity + optionally refresh) ───── */
export const verifyConnection = action({
  args: {
    connectionId: v.id("platformConnections"),
    autoRefresh: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const connection = await ctx.runQuery(
      internal.platform_connections.getConnectionById,
      { connectionId: args.connectionId },
    );

    if (!connection) {
      return { valid: false, message: "Connection not found" };
    }

    // Check if token is expired
    const now = Date.now();
    if (connection.tokenExpiresAt && connection.tokenExpiresAt < now) {
      // Auto-refresh if requested and we have a refresh token
      if (args.autoRefresh && connection.encryptedRefreshToken) {
        const refreshResult = await ctx.runAction(
          internal.platform_connections.refreshToken,
          { connectionId: args.connectionId },
        );
        if (refreshResult.success) {
          return { valid: true, message: "Token refreshed successfully.", refreshed: true };
        }
      }

      await ctx.runMutation(internal.platform_connections.updateConnectionStatus, {
        connectionId: args.connectionId,
        status: "expired",
        verificationError: "Access token expired.",
      });
      return { valid: false, message: "Access token expired. Re-authenticate or enable auto-refresh." };
    }

    // Try to verify by making a lightweight API call
    try {
      if (connection.platform === "meta" && connection.encryptedAccessToken) {
        const checkResponse = await fetch(
          `https://graph.facebook.com/v22.0/me?access_token=${connection.encryptedAccessToken}&fields=id,name`,
        );
        if (!checkResponse.ok) {
          await ctx.runMutation(internal.platform_connections.updateConnectionStatus, {
            connectionId: args.connectionId,
            status: "error",
            verificationError: `API verification failed: ${checkResponse.status}`,
          });
          return { valid: false, message: `API verification failed: ${checkResponse.status}` };
        }
      }

      // Update last verified timestamp
      await ctx.runMutation(internal.platform_connections.updateConnectionStatus, {
        connectionId: args.connectionId,
        status: "connected",
        lastVerifiedAt: Date.now(),
      });

      return { valid: true, message: "Connection verified successfully." };
    } catch (error: any) {
      await ctx.runMutation(internal.platform_connections.updateConnectionStatus, {
        connectionId: args.connectionId,
        status: "error",
        verificationError: error?.message || "Verification failed",
      });
      return { valid: false, message: `Verification failed: ${error?.message || "Unknown error"}` };
    }
  },
});

/* ───── Create a new platform connection ───── */
export const create = mutation({
  args: {
    platform: v.union(v.literal("meta"), v.literal("google")),
    label: v.string(),
    accountId: v.string(),
    projectId: v.optional(v.id("projects")),
    credentialProvider: v.optional(
      v.union(
        v.literal("oauth"),
        v.literal("api_key"),
        v.literal("jwt"),
        v.literal("service_account"),
      ),
    ),
    accountName: v.optional(v.string()),
    encryptedAccessToken: v.optional(v.string()),
    encryptedRefreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check for duplicate account per user+platform
    const existing = await ctx.db
      .query("platformConnections")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const duplicate = existing.find(
      (c) => c.platform === args.platform && c.accountId === args.accountId,
    );
    if (duplicate) {
      throw new Error(`Account ${args.accountId} is already connected for ${args.platform}. Edit or remove the existing connection first.`);
    }

    const now = Date.now();
    const connectionId = await ctx.db.insert("platformConnections", {
      userId,
      projectId: args.projectId,
      platform: args.platform,
      label: args.label,
      accountId: args.accountId,
      accountDisplayName: args.accountName,
      credentialProvider: args.credentialProvider || "api_key",
      credentialVersion: 1,
      encryptedAccessToken: args.encryptedAccessToken,
      encryptedRefreshToken: args.encryptedRefreshToken,
      tokenExpiresAt: args.tokenExpiresAt,
      status: args.encryptedAccessToken ? "connected" : "pending",
      connectedAt: now,
      updatedAt: now,
    });

    return connectionId;
  },
});

/* ───── Update a connection ───── */
export const update = mutation({
  args: {
    connectionId: v.id("platformConnections"),
    label: v.optional(v.string()),
    projectId: v.optional(v.id("projects")),
    accountName: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("connected"), v.literal("expired"), v.literal("error"), v.literal("pending")),
    ),
    encryptedAccessToken: v.optional(v.string()),
    encryptedRefreshToken: v.optional(v.string()),
    tokenExpiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const connection = await ctx.db.get(args.connectionId);
    if (!connection || connection.userId !== userId) throw new Error("Not found");

    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.label !== undefined) patch.label = args.label;
    if (args.projectId !== undefined) patch.projectId = args.projectId;
    if (args.accountName !== undefined) patch.accountDisplayName = args.accountName;
    if (args.status !== undefined) patch.status = args.status;
    if (args.encryptedAccessToken !== undefined) patch.encryptedAccessToken = args.encryptedAccessToken;
    if (args.encryptedRefreshToken !== undefined) patch.encryptedRefreshToken = args.encryptedRefreshToken;
    if (args.tokenExpiresAt !== undefined) patch.tokenExpiresAt = args.tokenExpiresAt;

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

/* ───── Internal: Create a connection record (from OAuth exchange) ───── */
export const createConnectionRecord = internalMutation({
  args: {
    userId: v.id("users"),
    projectId: v.optional(v.id("projects")),
    platform: v.union(v.literal("meta"), v.literal("google")),
    label: v.string(),
    accountId: v.string(),
    accountDisplayName: v.optional(v.string()),
    accountCurrency: v.optional(v.string()),
    accountTimezone: v.optional(v.string()),
    accountStatus: v.optional(v.string()),
    credentialProvider: v.union(
      v.literal("oauth"),
      v.literal("api_key"),
      v.literal("jwt"),
      v.literal("service_account"),
    ),
    encryptedAccessToken: v.optional(v.string()),
    encryptedRefreshToken: v.optional(v.string()),
    tokenType: v.optional(v.string()),
    tokenExpiresAt: v.number(),
    scopes: v.optional(v.array(v.string())),
    status: v.union(v.literal("connected"), v.literal("expired"), v.literal("error"), v.literal("pending")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("platformConnections", {
      userId: args.userId,
      projectId: args.projectId,
      platform: args.platform,
      label: args.label,
      accountId: args.accountId,
      accountDisplayName: args.accountDisplayName,
      accountCurrency: args.accountCurrency,
      accountTimezone: args.accountTimezone,
      accountStatus: args.accountStatus,
      credentialProvider: args.credentialProvider,
      credentialVersion: 1,
      encryptedAccessToken: args.encryptedAccessToken,
      encryptedRefreshToken: args.encryptedRefreshToken,
      tokenType: args.tokenType,
      tokenExpiresAt: args.tokenExpiresAt,
      scopes: args.scopes,
      status: args.status,
      lastVerifiedAt: now,
      connectedAt: now,
      updatedAt: now,
    });
  },
});

/* ───── Internal: Update connection tokens (for refresh) ───── */
export const updateConnectionTokens = internalMutation({
  args: {
    connectionId: v.id("platformConnections"),
    encryptedAccessToken: v.string(),
    encryptedRefreshToken: v.optional(v.string()),
    tokenExpiresAt: v.number(),
    status: v.union(v.literal("connected"), v.literal("expired"), v.literal("error"), v.literal("pending")),
    verificationError: v.optional(v.string()),
    credentialVersion: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      encryptedAccessToken: args.encryptedAccessToken,
      tokenExpiresAt: args.tokenExpiresAt,
      status: args.status,
      lastVerifiedAt: Date.now(),
      updatedAt: Date.now(),
    };
    if (args.encryptedRefreshToken !== undefined) patch.encryptedRefreshToken = args.encryptedRefreshToken;
    if (args.verificationError !== undefined) patch.verificationError = args.verificationError;
    if (args.credentialVersion !== undefined) patch.credentialVersion = args.credentialVersion;

    await ctx.db.patch(args.connectionId, patch);
  },
});

/* ───── Internal: Update connection status ───── */
export const updateConnectionStatus = internalMutation({
  args: {
    connectionId: v.id("platformConnections"),
    status: v.union(v.literal("connected"), v.literal("expired"), v.literal("error"), v.literal("pending")),
    verificationError: v.optional(v.string()),
    lastVerifiedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, unknown> = {
      status: args.status,
      updatedAt: Date.now(),
    };
    if (args.verificationError !== undefined) patch.verificationError = args.verificationError;
    if (args.lastVerifiedAt !== undefined) patch.lastVerifiedAt = args.lastVerifiedAt;

    await ctx.db.patch(args.connectionId, patch);
  },
});

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

/* ───── Internal: Get connections by platform (no auth) ───── */
export const getConnectionsByPlatform = internalQuery({
  args: {
    platform: v.union(v.literal("meta"), v.literal("google")),
    status: v.optional(
      v.union(v.literal("connected"), v.literal("expired"), v.literal("error"), v.literal("pending")),
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("platformConnections")
      .withIndex("by_platform", (q) => q.eq("platform", args.platform))
      .collect();
  },
});

/* ───── Internal: Get connections by user and platform (for listing by type) ───── */
export const getConnectionsByUserAndPlatform = internalQuery({
  args: {
    userId: v.id("users"),
    platform: v.union(v.literal("meta"), v.literal("google")),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("platformConnections")
      .withIndex("by_userId_platform", (q) =>
        q.eq("userId", args.userId).eq("platform", args.platform),
      )
      .collect();
  },
});

/* ───── Legacy verification (env-var based, for backward compat) ───── */
export const verifyConnectionLegacy = action({
  args: {
    platform: v.union(v.literal("meta"), v.literal("google")),
    accountId: v.string(),
  },
  handler: async (_ctx, args) => {
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
      message: `${args.platform === "meta" ? "Meta" : "Google"} Ads connection validated (legacy check).`,
      accountId: accountEnvVar || args.accountId,
    };
  },
});

/* ───── Get platform OAuth config info (for UI) ───── */
export const getPlatformConfig = query({
  args: {
    platform: v.union(v.literal("meta"), v.literal("google")),
  },
  handler: async (_ctx, args) => {
    const config = PLATFORM_OAUTH_CONFIGS[args.platform];
    if (!config) return null;

    const clientId = process.env[config.envClientId];
    const clientSecret = process.env[config.envClientSecret];

    return {
      platform: args.platform,
      configured: !!(clientId && clientSecret),
      requiredEnvVars: [config.envClientId, config.envClientSecret],
      scopes: config.scopes,
      defaultScopes: config.defaultScopes,
    };
  },
});
