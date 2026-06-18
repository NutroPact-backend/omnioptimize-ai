import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  Cable,
  CheckCircle2,
  Database,
  ExternalLink,
  Link2,
  Loader2,
  LogOut,
  Megaphone,
  Menu,
  Plus,
  RefreshCw,
  Search,
  Settings as SettingsIcon,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/* ───── Easing ───── */
const EASE = [0.22, 1, 0.36, 1] as const;

/* ───── Platform icon helper ───── */
function PlatformIcon({ platform, size = "md" }: { platform: string; size?: "sm" | "md" | "lg" }) {
  const sizeMap = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-11 h-11 text-base" };
  const classes = sizeMap[size];
  if (platform === "meta") {
    return (
      <div className={`${classes} rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold`}>
        f
      </div>
    );
  }
  if (platform === "google") {
    return (
      <div className={`${classes} rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold`}>
        G
      </div>
    );
  }
  return (
    <div className={`${classes} rounded-lg bg-accent/10 text-accent flex items-center justify-center`}>
      <Cable className="w-4 h-4" />
    </div>
  );
}

/* ───── Add Connection Dialog ───── */
function AddConnectionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [platform, setPlatform] = useState<"meta" | "google">("meta");
  const [label, setLabel] = useState("");
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createConnection = useMutation(api.platform_connections.create);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !accountId.trim()) return;

    setIsCreating(true);
    try {
      await createConnection({
        platform,
        label: label.trim(),
        accountId: accountId.trim(),
        accountName: accountName.trim() || undefined,
      });
      toast.success("Platform connected", {
        description: `${platform === "meta" ? "Meta Ads" : "Google Ads"} account linked successfully.`,
      });
      onOpenChange(false);
      setLabel("");
      setAccountId("");
      setAccountName("");
      setPlatform("meta");
    } catch (err) {
      toast.error("Failed to connect", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-accent" />
            Connect Ad Platform
          </DialogTitle>
          <DialogDescription>
            Link your Meta Ads or Google Ads account to enable direct campaign management and data ingestion.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Platform</Label>
              <Select
                value={platform}
                onValueChange={(v: "meta" | "google") => setPlatform(v)}
                disabled={isCreating}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="meta">Meta Ads</SelectItem>
                  <SelectItem value="google">Google Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="label">Connection Label</Label>
              <Input
                id="label"
                placeholder="e.g. Agency Account #1"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="accountId">
                {platform === "meta" ? "Ad Account ID" : "Customer ID / Account ID"}
              </Label>
              <Input
                id="accountId"
                placeholder={platform === "meta" ? "act_123456789" : "123-456-7890"}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="accountName">Account Name (optional)</Label>
              <Input
                id="accountName"
                placeholder="e.g. Main Business Account"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                disabled={isCreating}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating || !label.trim() || !accountId.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  Connect Account <Plus className="w-3 h-3 ml-1.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Connection Card ───── */
function ConnectionCard({
  connection,
  onDelete,
}: {
  connection: Doc<"platformConnections">;
  onDelete: (id: typeof connection._id) => void;
}) {
  const statusColors: Record<string, string> = {
    connected: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    expired: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    error: "bg-destructive/10 text-destructive border-destructive/20",
  };

  const [deleting, setDeleting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const ingestPlatformData = useAction(api.ingestion.ingestPlatformData);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(connection._id);
      toast.success("Connection removed");
    } catch {
      toast.error("Failed to remove connection");
    } finally {
      setDeleting(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const result = await ingestPlatformData({
        connectionId: connection._id,
      });
      setSyncResult(result.message);
      if (result.success) {
        toast.success("Data sync initiated", {
          description: result.recordsIngested > 0
            ? `${result.recordsIngested} record(s) ingested from ${connection.platform === "meta" ? "Meta Ads" : "Google Ads"}.`
            : result.message,
        });
      } else {
        toast.error("Sync failed", { description: result.message });
      }
    } catch (err) {
      toast.error("Sync failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 transition-all duration-200 hover:border-accent/20 hover:shadow-sm"
    >
      <PlatformIcon platform={connection.platform} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-foreground truncate">
            {connection.label}
          </span>
          <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full ${statusColors[connection.status] || statusColors.connected}`}>
            <span className={`w-1 h-1 rounded-full mr-1 ${
              connection.status === "connected" ? "bg-emerald-500" :
              connection.status === "expired" ? "bg-amber-500" :
              "bg-destructive"
            }`} />
            {connection.status}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="capitalize">{connection.platform === "meta" ? "Meta Ads" : "Google Ads"}</span>
          <span>•</span>
          <code className="text-[11px] bg-secondary px-1.5 py-0.5 rounded font-mono">{connection.accountId}</code>
          {connection.accountName && (
            <>
              <span>•</span>
              <span>{connection.accountName}</span>
            </>
          )}
        </div>
        {syncResult && (
          <div className="text-[11px] text-muted-foreground mt-1.5 italic truncate max-w-md">
            {syncResult}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1"
          onClick={handleSync}
          disabled={syncing}
        >
          {syncing ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Sync
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive transition-colors"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        </Button>
      </div>
    </motion.div>
  );
}

/* ───── Environment Variable Card ───── */
function EnvVarCard({
  platform,
  label,
  requiredVars,
  isConfigured,
}: {
  platform: string;
  label: string;
  requiredVars: string[];
  isConfigured: boolean;
}) {
  return (
    <Card className="border-border/60 bg-card p-4 transition-all duration-200 hover:border-accent/20">
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          isConfigured ? "bg-emerald-500/10" : "bg-amber-500/10"
        }`}>
          {isConfigured ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-foreground">{label}</span>
            {isConfigured ? (
              <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/20 bg-emerald-500/5">
                Configured
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-amber-500 border-amber-500/20 bg-amber-500/5">
                Missing Keys
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {isConfigured
              ? "API credentials are configured in environment variables."
              : "Add the following environment variables to enable this integration:"}
          </div>
          {!isConfigured && (
            <div className="space-y-1">
              {requiredVars.map((v) => (
                <code key={v} className="block text-[11px] bg-secondary px-2 py-1 rounded font-mono text-muted-foreground">
                  {v}
                </code>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/* ───── Sync All Platforms Button ───── */
function SyncAllButton() {
  const [syncing, setSyncing] = useState(false);
  const syncAll = useAction(api.ingestion.syncAllPlatforms);

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      const result = await syncAll({});
      if (result.success) {
        const details = result.results
          .map((r: any) => `${r.platform}: ${r.records ?? 0} records`)
          .join(", ");
        toast.success(`Synced ${result.totalRecordsIngested} total records`, {
          description: details || "No platforms with data to sync.",
        });
      } else {
        const errors = result.results.filter((r: any) => r.status === "error").map((r: any) => r.error).join("; ");
        toast.error("Some syncs failed", { description: errors || "Unknown error" });
      }
    } catch (err) {
      toast.error("Sync all failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSyncAll}
      size="sm"
      variant="outline"
      className="text-xs gap-1.5"
      disabled={syncing}
    >
      {syncing ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Database className="w-3.5 h-3.5" />
      )}
      {syncing ? "Syncing…" : "Sync All"}
    </Button>
  );
}

/* ───── Main Page ───── */
export default function SettingsPage() {
  const { isLoading: authLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const connections = useQuery(api.platform_connections.list);
  const connectionStatus = useQuery(api.ingestion.checkAllConnections);
  const deleteConnection = useMutation(api.platform_connections.remove);

  if (!authLoading && !isAuthenticated) {
    navigate("/auth");
    return null;
  }

  if (authLoading || connections === undefined || connectionStatus === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="animate-pulse text-sm text-muted-foreground">Loading…</div>
        </div>
      </div>
    );
  }

  const handleDelete = async (connectionId: Id<"platformConnections">) => {
    try {
      await deleteConnection({ connectionId });
      toast.success("Connection removed");
    } catch {
      toast.error("Failed to remove connection");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-accent/20 selection:text-accent">
      <header className="sticky top-0 z-40 md:hidden border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="flex items-center justify-between h-14 px-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <div className="w-6 h-6 rounded bg-accent flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            Settings
          </div>
          <button
            onClick={() => signOut()}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* ─── Sidebar ─── */}
        <aside className="hidden md:flex flex-col w-60 border-r border-border/60 bg-card/50 min-h-[calc(100vh-0px)]">
          <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border/30 shrink-0">
            <div className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Optimus</span>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <BarChart3 className="w-4 h-4 shrink-0" />
              Dashboard
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <Search className="w-4 h-4 shrink-0" />
              Projects
            </button>
            <button
              onClick={() => navigate("/campaigns")}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <Megaphone className="w-4 h-4 shrink-0" />
              Ad Campaigns
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 bg-accent/10 text-accent font-medium"
            >
              <SettingsIcon className="w-4 h-4 shrink-0" />
              Settings
            </button>
          </nav>

          <div className="p-3 border-t border-border/30">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-secondary/50">
              <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-semibold text-accent">
                {user?.name?.[0] || user?.email?.[0] || "U"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-foreground truncate">
                  {user?.name || user?.email || "User"}
                </div>
                <div className="text-[11px] text-muted-foreground truncate">{user?.email || ""}</div>
              </div>
              <button
                onClick={() => signOut()}
                className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </aside>

        {/* ─── Main ─── */}
        <main className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 md:py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                  Settings
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage platform connections, API keys, and integration preferences
                </p>
              </div>
            </div>

            {/* ── Section: Platform Connections ── */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-accent" />
                    Platform Connections
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Connect your ad accounts for direct API management and data ingestion
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {connections.length > 0 && (
                    <SyncAllButton />
                  )}
                  <Button
                    onClick={() => setAddOpen(true)}
                    size="sm"
                    className="text-xs gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Connection
                  </Button>
                </div>
              </div>

              {connections.length === 0 ? (
                <Card className="border-border/50 bg-card p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                    <Link2 className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">No platforms connected</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4 leading-relaxed">
                    Connect your Meta Ads or Google Ads accounts to enable campaign management and performance data ingestion.
                  </p>
                  <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
                    <Plus className="w-3.5 h-3.5" /> Connect Your First Account
                  </Button>
                </Card>
              ) : (
                <div className="space-y-2">
                  {connections.map((connection: any) => (
                    <ConnectionCard
                      key={connection._id}
                      connection={connection}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* ── Section: API Keys & Environment ── */}
            <div className="mb-10">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                <Cable className="w-4 h-4 text-accent" />
                API Keys & Environment
              </h2>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                Configure platform API credentials via environment variables. These are required for real API integration.
                Keys are managed in your deployment environment — add them to enable live data fetching.
              </p>

              <div className="grid gap-3">
                <EnvVarCard
                  platform="meta"
                  label="Meta Ads API"
                  requiredVars={["META_ADS_ACCESS_TOKEN", "META_ADS_ACCOUNT_ID"]}
                  isConfigured={connectionStatus.meta_ads?.status === "configured"}
                />
                <EnvVarCard
                  platform="google_ads"
                  label="Google Ads API"
                  requiredVars={["GOOGLE_ADS_ACCESS_TOKEN", "GOOGLE_ADS_ACCOUNT_ID"]}
                  isConfigured={connectionStatus.google_ads?.status === "configured"}
                />
                <EnvVarCard
                  platform="ga4"
                  label="Google Analytics 4 (GA4)"
                  requiredVars={["GA4_CLIENT_EMAIL", "GA4_PRIVATE_KEY", "GA4_PROPERTY_ID"]}
                  isConfigured={connectionStatus.ga4?.status === "configured"}
                />
              </div>
            </div>

            {/* ── Section: Account Info ── */}
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2 mb-4">
                <Sparkles className="w-4 h-4 text-accent" />
                Account
              </h2>
              <Card className="border-border/60 bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-sm font-semibold text-accent">
                    {user?.name?.[0] || user?.email?.[0] || "U"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {user?.name || "User"}
                    </div>
                    <div className="text-xs text-muted-foreground">{user?.email || ""}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => signOut()}
                  >
                    <LogOut className="w-3 h-3 mr-1.5" /> Sign Out
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>

      <AddConnectionDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
