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
      type: v.string(), // person, product, organization, concept, brand_term
      salience: v.optional(v.float64()),
      wikiId: v.optional(v.string()),
      sourceUrl: v.optional(v.string()),
    }).index("by_projectId", ["projectId"]),

    // ── Optimizations: actions applied or recommended for a project ──
    optimizations: defineTable({
      projectId: v.id("projects"),
      type: v.string(), // schema_fix, content_gap, entity_link, snippet_opt, etc.
      status: v.union(v.literal("pending"), v.literal("applied"), v.literal("rolled_back")),
      description: v.string(),
      beforeSnapshot: v.optional(v.string()),
      afterSnapshot: v.optional(v.string()),
      createdAt: v.number(),
      appliedAt: v.optional(v.number()),
    }).index("by_projectId", ["projectId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
