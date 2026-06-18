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
 * Supports multi-page deep crawling by following internal links.
 * This replaces the previous simulated-crawl with real HTTP fetching.
 */
export const crawlAndExtract = action({
  args: {
    url: v.string(),
    projectId: v.id("projects"),
    maxPages: v.optional(v.float64()),
    maxDepth: v.optional(v.float64()),
  },
  handler: async (ctx, args): Promise<CrawlResult> => {
    const { url, projectId } = args;
    const maxPages = args.maxPages ?? 10;
    const maxDepth = args.maxDepth ?? 2;

    try {
      // Emit crawl started event
      await ctx.runMutation(internal.event_bus.emitInternal, {
        eventType: "crawl.started",
        sourceAgent: "crawler",
        projectId,
        payload: JSON.stringify({ url, maxPages, maxDepth }),
      });

      // Multi-page deep crawl: follow internal links up to maxDepth
      const allPages: CrawledPage[] = [];
      const visited = new Set<string>();
      const queue: { pageUrl: string; depth: number }[] = [{ pageUrl: url, depth: 0 }];
      let allEntities = new Set<string>();
      let robotsTxt = "";

      // Try to fetch robots.txt once
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

      // Parse disallowed paths from robots.txt
      const disallowedPaths = robotsTxt
        .split("\n")
        .filter((l: string) => l.toLowerCase().startsWith("disallow:"))
        .map((l: string) => l.split(":").slice(1).join(":").trim())
        .filter(Boolean);

      function isDisallowed(path: string): boolean {
        return disallowedPaths.some((d: string) => path.startsWith(d));
      }

      const baseHostname = new URL(url).hostname;

      while (queue.length > 0 && allPages.length < maxPages) {
        const { pageUrl, depth } = queue.shift()!;

        if (visited.has(pageUrl)) continue;
        if (depth > maxDepth) continue;
        visited.add(pageUrl);

        try {
          const urlPath = new URL(pageUrl).pathname;
          if (isDisallowed(urlPath)) continue;
        } catch {
          continue;
        }

        const page = await fetchPage(pageUrl);
        if (!page) continue;

        allPages.push(page);

        // Extract entities from this page
        const pageText = `${page.title} ${page.headings.h1.join(" ")} ${page.headings.h2.join(" ")} ${page.metaDescription}`;
        const pageEntities = extractBasicEntities(pageText);
        for (const ent of pageEntities) allEntities.add(ent);

        // Emit page discovered event for each sub-page
        await ctx.runMutation(internal.event_bus.emitInternal, {
          eventType: "crawl.page_discovered",
          sourceAgent: "crawler",
          projectId,
          payload: JSON.stringify({
            url: page.url,
            title: page.title,
            wordCount: page.wordCount,
            depth,
            headings: Object.values(page.headings).flat().length,
            linksFound: page.internalLinks.length + page.externalLinks.length,
            schemaCount: page.schemaMarkup.length,
          }),
        });

        // Enqueue internal links for deeper crawl (same hostname, skip fragments/anchors)
        if (depth < maxDepth) {
          for (const link of page.internalLinks) {
            try {
              const linkUrl = new URL(link);
              // Only follow same hostname
              if (linkUrl.hostname !== baseHostname) continue;
              // Strip fragment
              linkUrl.hash = "";
              const cleanUrl = linkUrl.href;
              // Skip non-HTML resources (images, PDFs, etc.)
              if (/[\.](pdf|zip|png|jpg|jpeg|gif|svg|ico|css|js|woff|woff2|ttf|eot)$/i.test(cleanUrl)) continue;
              if (!visited.has(cleanUrl)) {
                queue.push({ pageUrl: cleanUrl, depth: depth + 1 });
              }
            } catch {
              // Invalid URL
            }
          }
        }
      }

      // Use the main page as the primary result
      const mainPage = allPages[0] ?? null;

      // Build combined content summary from all crawled pages
      const contentSummary = buildMultiPageContentSummary(allPages, robotsTxt);

      // Emit crawl completed event
      await ctx.runMutation(internal.event_bus.emitInternal, {
        eventType: "crawl.completed",
        sourceAgent: "crawler",
        projectId,
        payload: JSON.stringify({
          url,
          pagesCrawled: allPages.length,
          wordCount: allPages.reduce((sum: number, p: CrawledPage) => sum + p.wordCount, 0),
          entitiesExtracted: allEntities.size,
        }),
      });

      // Save crawl result (summary in analyses table)
      if (mainPage) {
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
          pagesCrawled: allPages.length,
        });
      }

      return {
        success: allPages.length > 0,
        mainPage,
        pagesCrawled: allPages.length,
        extractedEntities: Array.from(allEntities),
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

/* ───── Build multi-page content summary string ───── */

function buildMultiPageContentSummary(pages: CrawledPage[], robotsTxt: string): string {
  if (pages.length === 0) return "";

  const parts: string[] = [];
  parts.push(`=== DEEP CRAWL SUMMARY (${pages.length} pages) ===`);
  parts.push("");

  for (let i = 0; i < Math.min(pages.length, 10); i++) {
    const page = pages[i];
    parts.push(`--- Page ${i + 1}: ${page.url} ---`);
    parts.push(`Title: ${page.title}`);
    if (page.metaDescription) parts.push(`Description: ${page.metaDescription}`);
    const headingSummary = Object.entries(page.headings)
      .filter(([, vals]) => vals.length > 0)
      .map(([tag, vals]) => `${tag.toUpperCase()}: ${vals.slice(0, 5).join(" | ")}${vals.length > 5 ? ` (+${vals.length - 5} more)` : ""}`)
      .join("\n");
    if (headingSummary) parts.push(`Headings:\n${headingSummary}`);
    parts.push(`Word count: ${page.wordCount}`);
    parts.push(`Internal links: ${page.internalLinks.length}, External links: ${page.externalLinks.length}`);
    if (page.schemaMarkup.length > 0) {
      const schemaTypes = page.schemaMarkup
        .map((s: string) => {
          try {
            return JSON.parse(s)["@type"] || "Unknown";
          } catch {
            return "Unknown";
          }
        })
        .join(", ");
      parts.push(`Schema types: ${schemaTypes}`);
    }
    parts.push(`Status: ${page.statusCode}`);
    parts.push("");
  }

  if (pages.length > 10) {
    parts.push(`... and ${pages.length - 10} more pages`);
    parts.push("");
  }

  // Aggregate stats
  const totalWords = pages.reduce((sum: number, p: CrawledPage) => sum + p.wordCount, 0);
  const totalInternalLinks = pages.reduce((sum: number, p: CrawledPage) => sum + p.internalLinks.length, 0);
  const totalExternalLinks = pages.reduce((sum: number, p: CrawledPage) => sum + p.externalLinks.length, 0);
  const totalSchemas = pages.reduce((sum: number, p: CrawledPage) => sum + p.schemaMarkup.length, 0);

  parts.push(`=== AGGREGATE STATS ===`);
  parts.push(`Total pages: ${pages.length}`);
  parts.push(`Total words: ${totalWords}`);
  parts.push(`Total internal links: ${totalInternalLinks}`);
  parts.push(`Total external links: ${totalExternalLinks}`);
  parts.push(`Total schema blocks: ${totalSchemas}`);

  if (robotsTxt) {
    parts.push(`Robots.txt: ${robotsTxt.slice(0, 300)}`);
  }

  // List all crawled URLs
  parts.push(`\n=== ALL CRAWLED PAGES ===`);
  for (const page of pages) {
    parts.push(`- ${page.url}`);
  }

  return parts.join("\n");
}

/* ───── Build single-page content summary string (fallback) ───── */

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
