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
    platformConnections: defineTable({
      userId: v.id("users"),
      platform: adPlatformValidator,
      label: v.string(),
      // Encrypted token reference (actual tokens stored server-side via env vars)
      accountId: v.string(),
      accountName: v.optional(v.string()),
      status: v.union(v.literal("connected"), v.literal("expired"), v.literal("error")),
      connectedAt: v.number(),
    }).index("by_userId", ["userId"]),

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
  },
  {
    schemaValidation: false,
  },
);

export default schema;
