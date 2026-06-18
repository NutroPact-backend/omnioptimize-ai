"use node";

import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";

/**
 * ============================================================
 *  EVENT BUS — Typed event system for agent communication
 *
 *  All agents communicate through this bus. Events carry a
 *  typed schema, confidence score, and trace ID for
 *  distributed tracing across the agent mesh.
 * ============================================================
 */

/* ───── Trace ID helper (safe for all Convex runtimes) ───── */
function generateTraceId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/* ───── Event type constants ───── */
export const EVENT_TYPES = {
  ANALYSIS_REQUESTED: "analysis.requested",
  ANALYSIS_STARTED: "analysis.started",
  ANALYSIS_COMPLETED: "analysis.completed",
  ANALYSIS_FAILED: "analysis.failed",

  CRAWL_STARTED: "crawl.started",
  CRAWL_PAGE_DISCOVERED: "crawl.page_discovered",
  CRAWL_COMPLETED: "crawl.completed",

  ENTITY_EXTRACTED: "entity.extracted",
  ENTITY_RESOLVED: "entity.resolved",
  ENTITY_GRAPH_UPDATED: "entity_graph.updated",

  SCHEMA_GENERATED: "schema.generated",
  SCHEMA_VALIDATED: "schema.validated",

  CAMPAIGN_CREATED: "campaign.created",
  CAMPAIGN_VALIDATED: "campaign.validated",
  CAMPAIGN_LAUNCHED: "campaign.launched",
  CAMPAIGN_PAUSED: "campaign.paused",
  CAMPAIGN_FAILED: "campaign.failed",

  COMPLIANCE_CHECKED: "compliance.checked",
  COMPLIANCE_FAILED: "compliance.failed",

  ORCHESTRATOR_SESSION_STARTED: "orchestrator.session_started",
  ORCHESTRATOR_TASK_DISPATCHED: "orchestrator.task_dispatched",
  ORCHESTRATOR_TASK_COMPLETED: "orchestrator.task_completed",
  ORCHESTRATOR_TASK_FAILED: "orchestrator.task_failed",
  ORCHESTRATOR_SESSION_COMPLETED: "orchestrator.session_completed",
  ORCHESTRATOR_HUMAN_ESCALATION: "orchestrator.human_escalation",

  VALIDATION_PASSED: "validation.passed",
  VALIDATION_FAILED: "validation.failed",
  VALIDATION_WARNING: "validation.warning",
} as const;

export type EventType = (typeof EVENT_TYPES)[keyof typeof EVENT_TYPES];

/* ───── Emit an event (client-facing mutation) ───── */
export const emit = mutation({
  args: {
    eventType: v.string(),
    sourceAgent: v.string(),
    targetAgent: v.optional(v.string()),
    sessionId: v.optional(v.id("agentSessions")),
    taskId: v.optional(v.id("agentTasks")),
    projectId: v.optional(v.id("projects")),
    campaignId: v.optional(v.id("campaigns")),
    payload: v.optional(v.string()),
    confidence: v.optional(v.float64()),
    traceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const traceId = args.traceId || generateTraceId();

    const eventId = await ctx.db.insert("agentEvents", {
      eventType: args.eventType,
      sourceAgent: args.sourceAgent,
      targetAgent: args.targetAgent,
      sessionId: args.sessionId,
      taskId: args.taskId,
      projectId: args.projectId,
      campaignId: args.campaignId,
      payload: args.payload,
      status: "emitted",
      confidence: args.confidence,
      traceId,
      createdAt: Date.now(),
    });

    return { eventId, traceId };
  },
});

/* ───── Emit an event (internal, for use by other actions/mutations) ───── */
export const emitInternal = internalMutation({
  args: {
    eventType: v.string(),
    sourceAgent: v.string(),
    targetAgent: v.optional(v.string()),
    sessionId: v.optional(v.id("agentSessions")),
    taskId: v.optional(v.id("agentTasks")),
    projectId: v.optional(v.id("projects")),
    campaignId: v.optional(v.id("campaigns")),
    payload: v.optional(v.string()),
    confidence: v.optional(v.float64()),
    traceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const traceId = args.traceId || generateTraceId();

    const eventId = await ctx.db.insert("agentEvents", {
      eventType: args.eventType,
      sourceAgent: args.sourceAgent,
      targetAgent: args.targetAgent,
      sessionId: args.sessionId,
      taskId: args.taskId,
      projectId: args.projectId,
      campaignId: args.campaignId,
      payload: args.payload,
      status: "emitted",
      confidence: args.confidence,
      traceId,
      createdAt: Date.now(),
    });

    return { eventId, traceId };
  },
});

/* ───── Acknowledge delivery of an event ───── */
export const acknowledgeEvent = internalMutation({
  args: {
    eventId: v.id("agentEvents"),
    status: v.union(
      v.literal("delivered"),
      v.literal("acknowledged"),
      v.literal("failed"),
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      status: args.status,
      deliveredAt:
        args.status === "delivered" || args.status === "acknowledged"
          ? Date.now()
          : undefined,
    });
  },
});

/* ───── Query events for a session ───── */
export const getEventsBySession = query({
  args: { sessionId: v.id("agentSessions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentEvents")
      .withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();
  },
});

/* ───── Query events by type and status ───── */
export const getEventsByTypeAndStatus = query({
  args: {
    eventType: v.string(),
    status: v.optional(
      v.union(
        v.literal("emitted"),
        v.literal("delivered"),
        v.literal("acknowledged"),
        v.literal("failed"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const q = ctx.db
      .query("agentEvents")
      .withIndex("by_eventType_status", (iq) =>
        args.status
          ? iq.eq("eventType", args.eventType).eq("status", args.status)
          : iq.eq("eventType", args.eventType),
      );
    return await q.order("desc").take(50);
  },
});

/* ───── Internal: Get pending events for a target agent ───── */
export const getPendingEventsForAgent = internalQuery({
  args: { targetAgent: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agentEvents")
      .withIndex("by_targetAgent", (q) =>
        q.eq("targetAgent", args.targetAgent).eq("status", "emitted"),
      )
      .order("asc")
      .take(20);
  },
});

/* ───── Action: Dispatch event (for agent-to-agent communication) ───── */
export const dispatchAndProcess = action({
  args: {
    eventType: v.string(),
    sourceAgent: v.string(),
    targetAgent: v.optional(v.string()),
    sessionId: v.optional(v.id("agentSessions")),
    taskId: v.optional(v.id("agentTasks")),
    projectId: v.optional(v.id("projects")),
    campaignId: v.optional(v.id("campaigns")),
    payload: v.optional(v.string()),
    confidence: v.optional(v.float64()),
    traceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const result = await ctx.runMutation(internal.event_bus.emitInternal, {
      eventType: args.eventType,
      sourceAgent: args.sourceAgent,
      targetAgent: args.targetAgent,
      sessionId: args.sessionId,
      taskId: args.taskId,
      projectId: args.projectId,
      campaignId: args.campaignId,
      payload: args.payload,
      confidence: args.confidence,
      traceId: args.traceId,
    });

    return result;
  },
});
