/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as ad_execution from "../ad-execution.js";
import type * as analysis from "../analysis.js";
import type * as analysis_mutations from "../analysis_mutations.js";
import type * as auth from "../auth.js";
import type * as auth_emailOtp from "../auth/emailOtp.js";
import type * as campaigns from "../campaigns.js";
import type * as campaigns_mutations from "../campaigns_mutations.js";
import type * as compliance from "../compliance.js";
import type * as event_bus from "../event_bus.js";
import type * as http from "../http.js";
import type * as knowledge_graph from "../knowledge_graph.js";
import type * as orchestrator from "../orchestrator.js";
import type * as projects from "../projects.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "ad-execution": typeof ad_execution;
  analysis: typeof analysis;
  analysis_mutations: typeof analysis_mutations;
  auth: typeof auth;
  "auth/emailOtp": typeof auth_emailOtp;
  campaigns: typeof campaigns;
  campaigns_mutations: typeof campaigns_mutations;
  compliance: typeof compliance;
  event_bus: typeof event_bus;
  http: typeof http;
  knowledge_graph: typeof knowledge_graph;
  orchestrator: typeof orchestrator;
  projects: typeof projects;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
