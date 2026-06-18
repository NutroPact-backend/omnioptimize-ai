"use node";

import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * ============================================================
 *  CRAWLER — Real HTTP content fetching & extraction
 *
 *  Fetches actual website content, extracts:
 *  - Page metadata (title, description, OG tags, canonical)
 *  - Headings structure (h1-h6)
 *  - Links (internal, external, anchor)
 *  - Schema markup (JSON-LD, Microdata)
 *  - Content statistics
 * ============================================================
 */

/* ───── Types ───── */
export interface CrawledPage {
  url: string;
  title: string;
  metaDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  canonicalUrl: string;
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
  };
  internalLinks: string[];
  externalLinks: string[];
  schemaMarkup: string[];
  wordCount: number;
  contentType: string;
  statusCode: number;
}

export interface CrawlResult {
  success: boolean;
  mainPage: CrawledPage | null;
  pagesCrawled: number;
  extractedEntities: string[];
  contentSummary: string;
  error?: string;
}

/* ───── Save crawl result to database ───── */
export const saveCrawlResult = internalMutation({
  args: {
    projectId: v.id("projects"),
    url: v.string(),
    title: v.optional(v.string()),
    metaDescription: v.optional(v.string()),
    wordCount: v.optional(v.float64()),
    headings: v.optional(v.string()),
    internalLinks: v.optional(v.array(v.string())),
    schemaMarkup: v.optional(v.array(v.string())),
    contentSummary: v.optional(v.string()),
    pagesCrawled: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("analyses", {
      projectId: args.projectId,
      pagesCrawled: args.pagesCrawled ?? 1,
      summary: args.contentSummary,
      createdAt: Date.now(),
    });
    // Also store crawl metadata in the project
    const project = await ctx.db.get(args.projectId);
    if (project) {
      await ctx.db.patch(args.projectId, {
        pagesCrawled: args.pagesCrawled ?? 1,
        updatedAt: Date.now(),
      });
    }
  },
});

/* ───── Fetch and parse a single page ───── */
async function fetchPage(url: string, timeoutMs = 15000): Promise<CrawledPage | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; OptimusCrawler/1.0; +https://optimus.ai)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    const html = await response.text();
    const statusCode = response.status;

    if (statusCode >= 400) {
      return {
        url,
        title: "",
        metaDescription: "",
        ogTitle: "",
        ogDescription: "",
        ogImage: "",
        canonicalUrl: url,
        headings: { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] },
        internalLinks: [],
        externalLinks: [],
        schemaMarkup: [],
        wordCount: 0,
        contentType: response.headers.get("content-type") || "",
        statusCode,
      };
    }

    // ── Extract metadata using regex (no DOM parser needed for basic extraction) ──
    const title = extractTag(html, "title");
    const metaDescription = extractMeta(html, "description");
    const ogTitle = extractMeta(html, "og:title");
    const ogDescription = extractMeta(html, "og:description");
    const ogImage = extractMeta(html, "og:image");
    const canonicalUrl = extractLinkRel(html, "canonical") || url;

    // ── Extract headings ──
    const headings: CrawledPage["headings"] = {
      h1: extractHeadings(html, "h1"),
      h2: extractHeadings(html, "h2"),
      h3: extractHeadings(html, "h3"),
      h4: extractHeadings(html, "h4"),
      h5: extractHeadings(html, "h5"),
      h6: extractHeadings(html, "h6"),
    };

    // ── Extract links ──
    const allLinks = extractLinks(html);
    const baseUrl = new URL(url);
    const baseDomain = baseUrl.hostname;

    const internalLinks: string[] = [];
    const externalLinks: string[] = [];

    for (const link of allLinks) {
      try {
        const resolved = new URL(link, url);
        if (resolved.hostname === baseDomain) {
          internalLinks.push(resolved.href);
        } else {
          externalLinks.push(resolved.href);
        }
      } catch {
        // Invalid URL — skip
      }
    }

    // Deduplicate
    const uniqueInternal = [...new Set(internalLinks)];
    const uniqueExternal = [...new Set(externalLinks)];

    // ── Extract schema markup (JSON-LD) ──
    const schemaMarkup = extractJsonLd(html);

    // ── Extract text for word count ──
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const wordCount = textContent.split(/\s+/).filter((w) => w.length > 0).length;

    return {
      url,
      title,
      metaDescription,
      ogTitle,
      ogDescription,
      ogImage,
      canonicalUrl,
      headings,
      internalLinks: uniqueInternal.slice(0, 100), // Cap at 100 links
      externalLinks: uniqueExternal.slice(0, 50), // Cap at 50 external links
      schemaMarkup,
      wordCount,
      contentType: response.headers.get("content-type") || "",
      statusCode,
    };
  } catch (error: any) {
    console.error(`Failed to crawl ${url}:`, error?.message || "Unknown error");
    return null;
  }
}

/* ───── HTML extraction helpers ───── */

function extractTag(html: string, tag: string): string {
  const match = html.match(
    new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"),
  );
  if (!match) return "";
  return match[1]
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractMeta(html: string, name: string): string {
  // Try property first (OG tags), then name
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapeRegex(name)}["'][^>]+content=["']([^"']*)["']`,
      "i",
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escapeRegex(name)}["']`,
      "i",
    ),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1].trim();
  }
  return "";
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractLinkRel(html: string, rel: string): string {
  const match = html.match(
    new RegExp(
      `<link[^>]+rel=["']${escapeRegex(rel)}["'][^>]+href=["']([^"']*)["']`,
      "i",
    ),
  );
  if (match) return match[1].trim();
  return "";
}

function extractHeadings(html: string, tag: string): string[] {
  const regex = new RegExp(
    `<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`,
    "gi",
  );
  const results: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const text = match[1]
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (text.length > 0) {
      results.push(text);
    }
  }
  return results;
}

function extractLinks(html: string): string[] {
  const regex = /<a[^>]+href=["']([^"']*)["']/gi;
  const results: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    const href = match[1].trim();
    // Skip anchors, javascript, mailto, tel
    if (
      href &&
      !href.startsWith("#") &&
      !href.startsWith("javascript:") &&
      !href.startsWith("mailto:") &&
      !href.startsWith("tel:")
    ) {
      results.push(href);
    }
  }
  return results;
}

function extractJsonLd(html: string): string[] {
  const regex =
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const results: string[] = [];
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1].trim());
      results.push(JSON.stringify(parsed));
    } catch {
      // Invalid JSON — skip
    }
  }
  return results;
}

/* ───── Main crawl action ───── */

/**
 * Crawl a URL, extract content, and feed into the analysis pipeline.
 * This replaces the previous simulated-crawl with real HTTP fetching.
 */
export const crawlAndExtract = action({
  args: {
    url: v.string(),
    projectId: v.id("projects"),
  },
  handler: async (ctx, args): Promise<CrawlResult> => {
    const { url, projectId } = args;

    try {
      // Emit crawl started event
      await ctx.runMutation(internal.event_bus.emitInternal, {
        eventType: "crawl.started",
        sourceAgent: "crawler",
        projectId,
        payload: JSON.stringify({ url }),
      });

      // Fetch the main page
      const mainPage = await fetchPage(url);

      if (!mainPage) {
        throw new Error(`Failed to fetch ${url} — page returned no content`);
      }

      // Also try to fetch /robots.txt for sitemap hints
      let robotsTxt = "";
      try {
        const robotsUrl = new URL("/robots.txt", url).href;
        const robotsResponse = await fetch(robotsUrl, {
          headers: { "User-Agent": "OptimusCrawler/1.0" },
        });
        if (robotsResponse.ok) {
          robotsTxt = await robotsResponse.text();
        }
      } catch {
        // robots.txt is non-critical
      }

      // Extract named entities from content using basic NLP patterns
      const textContent = `${mainPage.title} ${mainPage.headings.h1.join(" ")} ${mainPage.headings.h2.join(" ")} ${mainPage.metaDescription}`;
      const extractedEntities = extractBasicEntities(textContent);

      // Build content summary for LLM analysis
      const contentSummary = buildContentSummary(mainPage, robotsTxt);

      // Emit page discovered event
      await ctx.runMutation(internal.event_bus.emitInternal, {
        eventType: "crawl.page_discovered",
        sourceAgent: "crawler",
        projectId,
        payload: JSON.stringify({
          url: mainPage.url,
          title: mainPage.title,
          wordCount: mainPage.wordCount,
          headings: Object.values(mainPage.headings).flat().length,
          linksFound: mainPage.internalLinks.length + mainPage.externalLinks.length,
          schemaCount: mainPage.schemaMarkup.length,
        }),
      });

      // Save crawl result
      await ctx.runMutation(internal.crawler.saveCrawlResult, {
        projectId,
        url: mainPage.url,
        title: mainPage.title,
        metaDescription: mainPage.metaDescription,
        wordCount: mainPage.wordCount,
        headings: JSON.stringify(mainPage.headings),
        internalLinks: mainPage.internalLinks.slice(0, 100),
        schemaMarkup: mainPage.schemaMarkup,
        contentSummary,
        pagesCrawled: 1,
      });

      // Emit crawl completed event
      await ctx.runMutation(internal.event_bus.emitInternal, {
        eventType: "crawl.completed",
        sourceAgent: "crawler",
        projectId,
        payload: JSON.stringify({
          url: mainPage.url,
          pagesCrawled: 1,
          wordCount: mainPage.wordCount,
          entitiesExtracted: extractedEntities.length,
        }),
      });

      return {
        success: true,
        mainPage,
        pagesCrawled: 1,
        extractedEntities,
        contentSummary,
      };
    } catch (error: any) {
      return {
        success: false,
        mainPage: null,
        pagesCrawled: 0,
        extractedEntities: [],
        contentSummary: "",
        error: error?.message || "Crawl failed",
      };
    }
  },
});

/* ───── Entity extraction helpers ───── */

function extractBasicEntities(text: string): string[] {
  const entities: Set<string> = new Set();

  // Extract capitalized multi-word phrases (potential brand/organization names)
  const phraseRegex = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
  let match;
  while ((match = phraseRegex.exec(text)) !== null) {
    if (match[0].split(/\s+/).length >= 2) {
      entities.add(match[0].trim());
    }
  }

  // Extract URLs
  const urlRegex = /https?:\/\/[^\s,<>"]+/g;
  while ((match = urlRegex.exec(text)) !== null) {
    try {
      const domain = new URL(match[0]).hostname.replace("www.", "");
      entities.add(domain);
    } catch {
      // ignore
    }
  }

  return Array.from(entities);
}

/* ───── Build content summary string ───── */

function buildContentSummary(page: CrawledPage, robotsTxt: string): string {
  const parts: string[] = [];

  parts.push(`Title: ${page.title}`);
  if (page.metaDescription) parts.push(`Description: ${page.metaDescription}`);

  const headingSummary = Object.entries(page.headings)
    .filter(([, vals]) => vals.length > 0)
    .map(([tag, vals]) => `${tag.toUpperCase()}: ${vals.slice(0, 5).join(" | ")}${vals.length > 5 ? ` (+${vals.length - 5} more)` : ""}`)
    .join("\n");
  if (headingSummary) parts.push(`Headings:\n${headingSummary}`);

  parts.push(`Word count: ${page.wordCount}`);
  parts.push(`Internal links: ${page.internalLinks.length}`);
  parts.push(`External links: ${page.externalLinks.length}`);

  if (page.schemaMarkup.length > 0) {
    parts.push(`Schema types: ${page.schemaMarkup
      .map((s) => {
        try {
          const parsed = JSON.parse(s);
          return parsed["@type"] || "Unknown";
        } catch {
          return "Unknown";
        }
      })
      .join(", ")}`);
  }

  if (robotsTxt) {
    parts.push(`Robots.txt: ${robotsTxt.slice(0, 300)}`);
  }

  return parts.join("\n\n");
}
