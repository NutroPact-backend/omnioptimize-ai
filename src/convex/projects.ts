import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const projects = await ctx.db
      .query("projects")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    return projects;
  },
});

export const getById = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) return null;

    return project;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const now = Date.now();

    const projectId = await ctx.db.insert("projects", {
      userId,
      name: args.name,
      url: args.url,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    return projectId;
  },
});

export const remove = mutation({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) throw new Error("Not found");

    // Clean up related data
    const analyses = await ctx.db
      .query("analyses")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const a of analyses) await ctx.db.delete(a._id);

    const entities = await ctx.db
      .query("entities")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const e of entities) await ctx.db.delete(e._id);

    const optimizations = await ctx.db
      .query("optimizations")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
    for (const o of optimizations) await ctx.db.delete(o._id);

    await ctx.db.delete(args.projectId);
  },
});

/**
 * Internal query for agent use — no auth check (caller controls access).
 */
export const getProjectForAgent = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.projectId);
  },
});

export const getStats = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const project = await ctx.db.get(args.projectId);
    if (!project || project.userId !== userId) return null;

    const [analyses, entities, optimizations] = await Promise.all([
      ctx.db
        .query("analyses")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
        .order("desc")
        .take(10),
      ctx.db
        .query("entities")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
        .collect(),
      ctx.db
        .query("optimizations")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
        .order("desc")
        .take(20),
    ]);

    return {
      project,
      latestAnalysis: analyses[0] ?? null,
      analysesHistory: analyses,
      entityCount: entities.length,
      optimizations,
    };
  },
});
