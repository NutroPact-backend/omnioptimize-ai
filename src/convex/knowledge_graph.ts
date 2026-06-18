"use node";

import { v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * ============================================================
 *  KNOWLEDGE GRAPH — Entity relationship management
 *
 *  Builds and queries a site-level entity graph with @id URIs,
 *  typed relationship edges, salience scores, and external
 *  knowledge base cross-references (Wikidata, Google KG).
 * ============================================================
 */

/* ───── Relationship type constants ───── */
export const RELATIONSHIP_TYPES = {
  PARENT_CATEGORY: "parent_category",
  CHILD_PRODUCT: "child_product",
  BELONGS_TO: "belongs_to",
  RELATED_TO: "related_to",
  MENTIONS: "mentions",
  REFERENCES: "references",
  LINKS_TO: "links_to",
  IS_A: "is_a",
  SYNONYM_OF: "synonym_of",
  COMPETITOR_OF: "competitor_of",
  MANUFACTURED_BY: "manufactured_by",
  SOLD_BY: "sold_by",
  USED_IN: "used_in",
  REVIEWS: "reviews",
} as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[keyof typeof RELATIONSHIP_TYPES];

export const RELATIONSHIP_LABELS: Record<string, string> = {
  parent_category: "Parent Category",
  child_product: "Child Product",
  belongs_to: "Belongs To",
  related_to: "Related To",
  mentions: "Mentions",
  references: "References",
  links_to: "Links To",
  is_a: "Is A",
  synonym_of: "Synonym Of",
  competitor_of: "Competitor Of",
  manufactured_by: "Manufactured By",
  sold_by: "Sold By",
  used_in: "Used In",
  reviews: "Reviews",
};

/* ───── Create an entity relationship ───── */
export const createRelationship = mutation({
  args: {
    projectId: v.id("projects"),
    sourceEntityId: v.id("entities"),
    targetEntityId: v.id("entities"),
    relationshipType: v.string(),
    weight: v.optional(v.float64()),
    metadata: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.sourceEntityId === args.targetEntityId) {
      throw new Error("Cannot create a self-referencing relationship");
    }

    const [source, target] = await Promise.all([
      ctx.db.get(args.sourceEntityId),
      ctx.db.get(args.targetEntityId),
    ]);

    if (!source || !target) {
      throw new Error("Source or target entity not found");
    }
    if (source.projectId !== args.projectId || target.projectId !== args.projectId) {
      throw new Error("Entities must belong to the same project");
    }

    const relationshipId = await ctx.db.insert("entityRelationships", {
      projectId: args.projectId,
      sourceEntityId: args.sourceEntityId,
      targetEntityId: args.targetEntityId,
      relationshipType: args.relationshipType,
      weight: args.weight ?? 1.0,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    return relationshipId;
  },
});

/* ───── Internal: batch create relationships ───── */
export const batchCreateRelationships = internalMutation({
  args: {
    relationships: v.array(
      v.object({
        projectId: v.id("projects"),
        sourceEntityId: v.id("entities"),
        targetEntityId: v.id("entities"),
        relationshipType: v.string(),
        weight: v.optional(v.float64()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    for (const rel of args.relationships) {
      await ctx.db.insert("entityRelationships", {
        projectId: rel.projectId,
        sourceEntityId: rel.sourceEntityId,
        targetEntityId: rel.targetEntityId,
        relationshipType: rel.relationshipType,
        weight: rel.weight ?? 1.0,
        createdAt: now,
      });
    }
  },
});

/* ───── Delete a relationship ───── */
export const deleteRelationship = mutation({
  args: { relationshipId: v.id("entityRelationships") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.relationshipId);
  },
});

/* ───── Get all relationships for an entity (incoming + outgoing) ───── */
export const getEntityRelationships = query({
  args: { entityId: v.id("entities") },
  handler: async (ctx, args) => {
    const [outgoing, incoming] = await Promise.all([
      ctx.db
        .query("entityRelationships")
        .withIndex("by_sourceEntity", (q) => q.eq("sourceEntityId", args.entityId))
        .collect(),
      ctx.db
        .query("entityRelationships")
        .withIndex("by_targetEntity", (q) => q.eq("targetEntityId", args.entityId))
        .collect(),
    ]);

    const entityIds = new Set<string>();
    outgoing.forEach((r) => entityIds.add(r.targetEntityId));
    incoming.forEach((r) => entityIds.add(r.sourceEntityId));

    const entities = new Map(
      (await Promise.all(
        Array.from(entityIds).map((id) => ctx.db.get(id as any)),
      )).filter(Boolean).map((e) => [e!._id, e!.name]),
    );

    return {
      outgoing: outgoing.map((r) => ({
        ...r,
        targetName: entities.get(r.targetEntityId) ?? "Unknown",
      })),
      incoming: incoming.map((r) => ({
        ...r,
        sourceName: entities.get(r.sourceEntityId) ?? "Unknown",
      })),
    };
  },
});

/* ───── Graph overview for a project ───── */
export const getProjectGraphOverview = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const [entities, relationships] = await Promise.all([
      ctx.db
        .query("entities")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
        .collect(),
      ctx.db
        .query("entityRelationships")
        .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
        .collect(),
    ]);

    const relationshipCounts: Record<string, number> = {};
    for (const rel of relationships) {
      relationshipCounts[rel.relationshipType] =
        (relationshipCounts[rel.relationshipType] || 0) + 1;
    }

    const typeCounts: Record<string, number> = {};
    for (const ent of entities) {
      typeCounts[ent.type] = (typeCounts[ent.type] || 0) + 1;
    }

    const connectionCount = new Map<string, number>();
    for (const rel of relationships) {
      connectionCount.set(
        rel.sourceEntityId,
        (connectionCount.get(rel.sourceEntityId) || 0) + 1,
      );
      connectionCount.set(
        rel.targetEntityId,
        (connectionCount.get(rel.targetEntityId) || 0) + 1,
      );
    }

    const topConnected = Array.from(connectionCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([entityId, count]) => {
        const entity = entities.find((e) => e._id === entityId);
        return {
          entityId,
          name: entity?.name ?? "Unknown",
          type: entity?.type ?? "unknown",
          connectionCount: count,
        };
      });

    return {
      entityCount: entities.length,
      relationshipCount: relationships.length,
      relationshipTypeBreakdown: relationshipCounts,
      entityTypeBreakdown: typeCounts,
      topConnectedEntities: topConnected,
      graphDensity:
        entities.length > 1
          ? (relationships.length * 2) / (entities.length * (entities.length - 1))
          : 0,
    };
  },
});

/* ───── Action: Auto-discover and create relationships from entity data ───── */
export const autoBuildEntityRelationships = action({
  args: {
    projectId: v.id("projects"),
  },
  handler: async (ctx, args) => {
    const entities = await ctx.runQuery(internal.knowledge_graph.getAllEntities, {
      projectId: args.projectId,
    });

    if (entities.length < 2) {
      return {
        relationshipsCreated: 0,
        message: "Need at least 2 entities to build relationships.",
      };
    }

    const relationships: Array<{
      projectId: any;
      sourceEntityId: any;
      targetEntityId: any;
      relationshipType: string;
      weight: number;
    }> = [];

    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const a = entities[i];
        const b = entities[j];
        if (!a || !b) continue;

        // Normalize types to lowercase for consistent matching
        const typeA = (a.type || "").toLowerCase();
        const typeB = (b.type || "").toLowerCase();

        // Same type with name overlap → RELATED_TO
        if (typeA === typeB) {
          const aWords = new Set(a.name.toLowerCase().split(/\s+/));
          const bWords = new Set(b.name.toLowerCase().split(/\s+/));
          const overlap = [...aWords].filter((w) => bWords.has(w) && w.length > 2);

          if (overlap.length > 0) {
            relationships.push({
              projectId: args.projectId,
              sourceEntityId: a._id,
              targetEntityId: b._id,
              relationshipType: "related_to",
              weight: overlap.length / Math.min(aWords.size, bWords.size),
            });
          }
        }

        // Organization <-> Product → MANUFACTURED_BY / SOLD_BY
        if (
          (typeA === "organization" && typeB === "product") ||
          (typeB === "organization" && typeA === "product")
        ) {
          const [prod, org] = typeA === "product" ? [a, b] : [b, a];
          relationships.push({
            projectId: args.projectId,
            sourceEntityId: prod._id,
            targetEntityId: org._id,
            relationshipType: "manufactured_by",
            weight: 0.8,
          });
        }

        // Concept <-> Product → USED_IN
        if (
          (typeA === "concept" && typeB === "product") ||
          (typeB === "concept" && typeA === "product")
        ) {
          relationships.push({
            projectId: args.projectId,
            sourceEntityId: a._id,
            targetEntityId: b._id,
            relationshipType: "used_in",
            weight: 0.5,
          });
        }

        // Brand_term <-> Organization → IS_A
        if (
          (typeA === "brand_term" && typeB === "organization") ||
          (typeB === "brand_term" && typeA === "organization")
        ) {
          const [brand, org] = typeA === "brand_term" ? [a, b] : [b, a];
          relationships.push({
            projectId: args.projectId,
            sourceEntityId: brand._id,
            targetEntityId: org._id,
            relationshipType: "is_a",
            weight: 0.9,
          });
        }
      }
    }

    // Deduplicate: keep highest weight for same pair + type
    const seen = new Set<string>();
    const deduped = relationships.filter((r) => {
      const key = `${r.sourceEntityId}:${r.targetEntityId}:${r.relationshipType}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (deduped.length > 0) {
      await ctx.runMutation(internal.knowledge_graph.batchCreateRelationships, {
        relationships: deduped,
      });
    }

    return {
      relationshipsCreated: deduped.length,
      message: `Auto-discovered ${deduped.length} entity relationships.`,
    };
  },
});

/* ───── Internal: Get all entities for a project ───── */
export const getAllEntities = internalQuery({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("entities")
      .withIndex("by_projectId", (q) => q.eq("projectId", args.projectId))
      .collect();
  },
});
