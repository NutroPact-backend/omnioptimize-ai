import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

export const PROJECT_STATUS = {
  PENDING: "pending",
  ANALYZING: "analyzing",
  ANALYZED: "analyzed",
  ERROR: "error",
} as const;

export const projectStatusValidator = v.union(
  v.literal(PROJECT_STATUS.PENDING),
  v.literal(PROJECT_STATUS.ANALYZING),
  v.literal(PROJECT_STATUS.ANALYZED),
  v.literal(PROJECT_STATUS.ERROR),
);
export type ProjectStatus = Infer<typeof projectStatusValidator>;

// ── Ad Campaign Platform ──
export const AD_PLATFORM = {
  META: "meta",
  GOOGLE: "google",
} as const;
export const adPlatformValidator = v.union(
  v.literal(AD_PLATFORM.META),
  v.literal(AD_PLATFORM.GOOGLE),
);
export type AdPlatform = Infer<typeof adPlatformValidator>;

export const CAMPAIGN_STATUS = {
  DRAFT: "draft",
  ACTIVE: "active",
  PAUSED: "paused",
  ARCHIVED: "archived",
  ERROR: "error",
} as const;
export const campaignStatusValidator = v.union(
  v.literal(CAMPAIGN_STATUS.DRAFT),
  v.literal(CAMPAIGN_STATUS.ACTIVE),
  v.literal(CAMPAIGN_STATUS.PAUSED),
  v.literal(CAMPAIGN_STATUS.ARCHIVED),
  v.literal(CAMPAIGN_STATUS.ERROR),
);
export type CampaignStatus = Infer<typeof campaignStatusValidator>;

export const CAMPAIGN_OBJECTIVE = {
  SALES: "sales",
  LEADS: "leads",
  TRAFFIC: "traffic",
  AWARENESS: "awareness",
  ENGAGEMENT: "engagement",
} as const;
export const campaignObjectiveValidator = v.union(
  v.literal(CAMPAIGN_OBJECTIVE.SALES),
  v.literal(CAMPAIGN_OBJECTIVE.LEADS),
  v.literal(CAMPAIGN_OBJECTIVE.TRAFFIC),
  v.literal(CAMPAIGN_OBJECTIVE.AWARENESS),
  v.literal(CAMPAIGN_OBJECTIVE.ENGAGEMENT),
);

export const COMPLIANCE_STATUS = {
  PENDING: "pending",
  PASSED: "passed",
  WARNING: "warning",
  FAILED: "failed",
} as const;
export const complianceStatusValidator = v.union(
  v.literal(COMPLIANCE_STATUS.PENDING),
  v.literal(COMPLIANCE_STATUS.PASSED),
  v.literal(COMPLIANCE_STATUS.WARNING),
  v.literal(COMPLIANCE_STATUS.FAILED),
);

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ── Projects: a website URL the user wants to analyze ──
    projects: defineTable({
      userId: v.id("users"),
      name: v.string(),
      url: v.string(),
      status: projectStatusValidator,
      // KPI snapshot (updated after analysis)
      citationScore: v.optional(v.float64()),
      entityCoverageScore: v.optional(v.float64()),
      schemaHealthScore: v.optional(v.float64()),
      readabilityScore: v.optional(v.float64()),
      keywordCoverage: v.optional(v.float64()),
      organicVisibilityIndex: v.optional(v.float64()),
      pagesCrawled: v.optional(v.float64()),
      entitiesFound: v.optional(v.float64()),
      schemaErrors: v.optional(v.float64()),
      linkEquityLoss: v.optional(v.float64()),
      competitorGapCount: v.optional(v.float64()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_userId", ["userId"]),

    // ── Analysis snapshots: historical KPI records per project ──
    analyses: defineTable({
      projectId: v.id("projects"),
      citationScore: v.optional(v.float64()),
      entityCoverageScore: v.optional(v.float64()),
      schemaHealthScore: v.optional(v.float64()),
      readabilityScore: v.optional(v.float64()),
      keywordCoverage: v.optional(v.float64()),
      organicVisibilityIndex: v.optional(v.float64()),
      pagesCrawled: v.optional(v.float64()),
      entitiesFound: v.optional(v.float64()),
      schemaErrors: v.optional(v.float64()),
      linkEquityLoss: v.optional(v.float64()),
      competitorGapCount: v.optional(v.float64()),
      summary: v.optional(v.string()),
      recommendations: v.optional(v.array(v.string())),
      createdAt: v.number(),
    }).index("by_projectId", ["projectId", "createdAt"]),

    // ── Entities: extracted entities for the entity knowledge graph ──
    entities: defineTable({
      projectId: v.id("projects"),
      name: v.string(),
      type: v.string(),
      salience: v.optional(v.float64()),
      wikiId: v.optional(v.string()),
      sourceUrl: v.optional(v.string()),
    }).index("by_projectId", ["projectId"]),

    // ── Optimizations: actions applied or recommended for a project ──
    optimizations: defineTable({
      projectId: v.id("projects"),
      type: v.string(),
      status: v.union(v.literal("pending"), v.literal("applied"), v.literal("rolled_back")),
      description: v.string(),
      beforeSnapshot: v.optional(v.string()),
      afterSnapshot: v.optional(v.string()),
      createdAt: v.number(),
      appliedAt: v.optional(v.number()),
    }).index("by_projectId", ["projectId"]),

    // ── Platform Connections: linked ad accounts ──
    // Supports multiple Meta and Google Ads accounts per workspace/project
    // with OAuth-based credential management
    platformConnections: defineTable({
      userId: v.id("users"),
      projectId: v.optional(v.id("projects")),
      platform: adPlatformValidator,
      label: v.string(),
      // Platform account identification
      accountId: v.string(),
      accountDisplayName: v.optional(v.string()),
      accountCurrency: v.optional(v.string()),
      accountTimezone: v.optional(v.string()),
      accountStatus: v.optional(v.string()),
      // OAuth / credential management
      credentialProvider: v.union(
        v.literal("oauth"),
        v.literal("api_key"),
        v.literal("jwt"),
        v.literal("service_account"),
      ),
      credentialVersion: v.optional(v.float64()),
      encryptedAccessToken: v.optional(v.string()),
      encryptedRefreshToken: v.optional(v.string()),
      tokenType: v.optional(v.string()),
      tokenExpiresAt: v.optional(v.number()),
      scopes: v.optional(v.array(v.string())),
      // Connection status
      status: v.union(v.literal("connected"), v.literal("expired"), v.literal("error"), v.literal("pending")),
      lastVerifiedAt: v.optional(v.number()),
      verificationError: v.optional(v.string()),
      connectedAt: v.number(),
      updatedAt: v.number(),
    }).index("by_userId", ["userId"])
      .index("by_platform", ["platform"])
      .index("by_userId_platform", ["userId", "platform"])
      .index("by_tokenStatus", ["status", "tokenExpiresAt"]),

    // ── Ad Campaigns ──
    campaigns: defineTable({
      userId: v.id("users"),
      projectId: v.optional(v.id("projects")),
      platform: adPlatformValidator,
      platformCampaignId: v.optional(v.string()),
      name: v.string(),
      objective: campaignObjectiveValidator,
      status: campaignStatusValidator,
      dailyBudget: v.optional(v.float64()),
      totalBudget: v.optional(v.float64()),
      currency: v.optional(v.string()),
      startDate: v.optional(v.number()),
      endDate: v.optional(v.number()),
      targeting: v.optional(v.string()),
      // Performance snapshot
      impressions: v.optional(v.float64()),
      clicks: v.optional(v.float64()),
      conversions: v.optional(v.float64()),
      spend: v.optional(v.float64()),
      cpa: v.optional(v.float64()),
      roas: v.optional(v.float64()),
      complianceStatus: complianceStatusValidator,
      // Recurring sync data
      lastSyncedAt: v.optional(v.number()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_userId", ["userId"]),

    // ── Ad Sets ──
    adSets: defineTable({
      campaignId: v.id("campaigns"),
      platformAdSetId: v.optional(v.string()),
      name: v.string(),
      status: campaignStatusValidator,
      dailyBudget: v.optional(v.float64()),
      bidAmount: v.optional(v.float64()),
      bidStrategy: v.optional(v.string()),
      targeting: v.optional(v.string()),
      // Performance snapshot
      impressions: v.optional(v.float64()),
      clicks: v.optional(v.float64()),
      conversions: v.optional(v.float64()),
      spend: v.optional(v.float64()),
      cpa: v.optional(v.float64()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_campaignId", ["campaignId"]),

    // ── Ad Creatives ──
    adCreatives: defineTable({
      campaignId: v.id("campaigns"),
      adSetId: v.optional(v.id("adSets")),
      platformCreativeId: v.optional(v.string()),
      name: v.string(),
      headline: v.optional(v.string()),
      primaryText: v.optional(v.string()),
      description: v.optional(v.string()),
      callToAction: v.optional(v.string()),
      imageUrls: v.optional(v.array(v.string())),
      videoUrl: v.optional(v.string()),
      landingPageUrl: v.optional(v.string()),
      format: v.optional(v.string()),
      status: campaignStatusValidator,
      // Performance snapshot
      impressions: v.optional(v.float64()),
      clicks: v.optional(v.float64()),
      conversions: v.optional(v.float64()),
      spend: v.optional(v.float64()),
      ctr: v.optional(v.float64()),
      cvr: v.optional(v.float64()),
      createdAt: v.number(),
      updatedAt: v.number(),
    }).index("by_campaignId", ["campaignId"]),

    // ── Compliance Checks ──
    complianceChecks: defineTable({
      campaignId: v.id("campaigns"),
      platform: adPlatformValidator,
      checkType: v.string(),
      status: complianceStatusValidator,
      details: v.optional(v.string()),
      remediation: v.optional(v.string()),
      checkedAt: v.number(),
    }).index("by_campaignId", ["campaignId"]),

    // ── Ad Performance History (time-series) ──
    adPerformanceRecords: defineTable({
      campaignId: v.id("campaigns"),
      adSetId: v.optional(v.id("adSets")),
      creativeId: v.optional(v.id("adCreatives")),
      date: v.number(),
      platform: adPlatformValidator,
      impressions: v.optional(v.float64()),
      clicks: v.optional(v.float64()),
      conversions: v.optional(v.float64()),
      spend: v.optional(v.float64()),
      cpa: v.optional(v.float64()),
      roas: v.optional(v.float64()),
      frequency: v.optional(v.float64()),
      cpm: v.optional(v.float64()),
      cpc: v.optional(v.float64()),
      ctr: v.optional(v.float64()),
      cvr: v.optional(v.float64()),
    }).index("by_campaignId_date", ["campaignId", "date"]),

    // ── Agent Sessions: orchestration runs ──
    agentSessions: defineTable({
      sessionType: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("awaiting_human"),
      ),
      priority: v.optional(v.float64()),
      sourceAgent: v.string(),
      projectId: v.optional(v.id("projects")),
      campaignId: v.optional(v.id("campaigns")),
      context: v.optional(v.string()),
      result: v.optional(v.string()),
      confidence: v.optional(v.float64()),
      errorMessage: v.optional(v.string()),
      metadata: v.optional(v.string()),
      createdAt: v.number(),
      updatedAt: v.number(),
      completedAt: v.optional(v.number()),
    }).index("by_status", ["status"])
      .index("by_sessionType", ["sessionType"])
      .index("by_projectId", ["projectId"]),

    // ── Agent Tasks: individual sub-tasks within a session ──
    agentTasks: defineTable({
      sessionId: v.id("agentSessions"),
      taskType: v.string(),
      targetAgent: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("running"),
        v.literal("completed"),
        v.literal("failed"),
        v.literal("skipped"),
      ),
      priority: v.optional(v.float64()),
      input: v.optional(v.string()),
      output: v.optional(v.string()),
      confidence: v.optional(v.float64()),
      errorMessage: v.optional(v.string()),
      retryCount: v.optional(v.float64()),
      maxRetries: v.optional(v.float64()),
      dependencies: v.optional(v.array(v.id("agentTasks"))),
      createdAt: v.number(),
      startedAt: v.optional(v.number()),
      completedAt: v.optional(v.number()),
    }).index("by_sessionId", ["sessionId"])
      .index("by_status", ["status"])
      .index("by_agent", ["targetAgent", "status"]),

    // ── Agent Events: typed event bus for agent communication ──
    agentEvents: defineTable({
      eventType: v.string(),
      sourceAgent: v.string(),
      targetAgent: v.optional(v.string()),
      sessionId: v.optional(v.id("agentSessions")),
      taskId: v.optional(v.id("agentTasks")),
      projectId: v.optional(v.id("projects")),
      campaignId: v.optional(v.id("campaigns")),
      payload: v.optional(v.string()),
      status: v.union(
        v.literal("emitted"),
        v.literal("delivered"),
        v.literal("acknowledged"),
        v.literal("failed"),
      ),
      confidence: v.optional(v.float64()),
      traceId: v.optional(v.string()),
      createdAt: v.number(),
      deliveredAt: v.optional(v.number()),
    }).index("by_eventType_status", ["eventType", "status"])
      .index("by_sessionId", ["sessionId"])
      .index("by_targetAgent", ["targetAgent", "status"])
      .index("by_traceId", ["traceId"]),

    // ── Entity Relationships: knowledge graph edges ──
    entityRelationships: defineTable({
      projectId: v.id("projects"),
      sourceEntityId: v.id("entities"),
      targetEntityId: v.id("entities"),
      relationshipType: v.string(),
      weight: v.optional(v.float64()),
      metadata: v.optional(v.string()),
      createdAt: v.number(),
    }).index("by_projectId", ["projectId"])
      .index("by_sourceEntity", ["sourceEntityId"])
      .index("by_targetEntity", ["targetEntityId"])
      .index("by_relationshipType", ["projectId", "relationshipType"]),

    // ── Audience Segments: personas from audience analyst ──
    audienceSegments: defineTable({
      projectId: v.id("projects"),
      name: v.string(),
      size: v.optional(v.float64()),
      predictedLtv: v.optional(v.float64()),
      channelAffinity: v.optional(v.string()),
      bestCreativeAngle: v.optional(v.string()),
      lookalikeQualityScore: v.optional(v.float64()),
      behavioralTraits: v.optional(v.string()),
      confidence: v.optional(v.float64()),
      createdAt: v.number(),
    }).index("by_projectId", ["projectId"]),

    // ── Competitor Insights: competitor intelligence data ──
    competitorInsights: defineTable({
      projectId: v.id("projects"),
      competitorName: v.string(),
      estimatedMonthlySpend: v.optional(v.string()),
      topCreatives: v.optional(v.string()),
      audienceAngle: v.optional(v.string()),
      weakness: v.optional(v.string()),
      strengths: v.optional(v.string()),
      positioningGap: v.optional(v.string()),
      creativeFatigueWindow: v.optional(v.float64()),
      confidence: v.optional(v.float64()),
      createdAt: v.number(),
    }).index("by_projectId", ["projectId"]),

    // ── Crawled Pages: persisted full-site crawl data ──
    // Designed for future vectorization, entity extraction, SEO/GEO analysis,
    // and knowledge graph enrichment. Supports incremental recrawls.
    crawledPages: defineTable({
      projectId: v.id("projects"),
      url: v.string(),
      depth: v.optional(v.float64()),
      parentUrl: v.optional(v.string()),
      // Core metadata
      title: v.optional(v.string()),
      metaDescription: v.optional(v.string()),
      canonicalUrl: v.optional(v.string()),
      ogTitle: v.optional(v.string()),
      ogDescription: v.optional(v.string()),
      ogImage: v.optional(v.string()),
      statusCode: v.optional(v.float64()),
      contentType: v.optional(v.string()),
      // Content structure
      headings: v.optional(v.string()), // JSON { h1: [], h2: [], ... }
      wordCount: v.optional(v.float64()),
      internalLinks: v.optional(v.array(v.string())),
      externalLinks: v.optional(v.array(v.string())),
      schemaMarkup: v.optional(v.array(v.string())), // JSON-LD blocks
      // Future SEO / GEO signals
      isIndexable: v.optional(v.boolean()),
      isFollowable: v.optional(v.boolean()),
      loadTimeMs: v.optional(v.float64()),
      // Incremental recrawl support
      contentHash: v.optional(v.string()),
      etag: v.optional(v.string()),
      lastModified: v.optional(v.string()),
      // Content pipeline flags
      isVectorized: v.optional(v.boolean()),
      entitiesExtracted: v.optional(v.boolean()),
      // Timestamps
      crawledAt: v.number(),
      updatedAt: v.number(),
    }).index("by_projectId", ["projectId"])
      .index("by_projectId_url", ["projectId", "url"])
      .index("by_projectId_statusCode", ["projectId", "statusCode"])
      .index("by_projectId_lastCrawled", ["projectId", "crawledAt"])
      .index("by_projectId_contentHash", ["projectId", "contentHash"]),

    // ── Website Friction Points: page-level issues ──
    websiteFrictionPoints: defineTable({
      projectId: v.id("projects"),
      pageUrl: v.string(),
      crawledPageId: v.optional(v.id("crawledPages")),
      issueType: v.string(),
      severity: v.union(v.literal("critical"), v.literal("high"), v.literal("medium"), v.literal("low")),
      description: v.string(),
      recommendation: v.optional(v.string()),
      metricValue: v.optional(v.string()),
      confidence: v.optional(v.float64()),
      createdAt: v.number(),
    }).index("by_projectId", ["projectId"])
      .index("by_projectId_severity", ["projectId", "severity"])
      .index("by_crawledPageId", ["crawledPageId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
