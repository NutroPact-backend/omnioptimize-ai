import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  DollarSign,
  Globe,
  Loader2,
  LogOut,
  Megaphone,
  Menu,
  MousePointerClick,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
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

/* ───── KPI card ───── */
function KpiCard({
  icon: Icon,
  label,
  value,
  subtitle,
  accent = "accent",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
  accent?: string;
}) {
  const accentMap: Record<string, string> = {
    accent: "text-accent border-accent/20 bg-accent/5",
    emerald: "text-emerald-500 border-emerald-500/20 bg-emerald-500/5",
    amber: "text-amber-500 border-amber-500/20 bg-amber-500/5",
    blue: "text-blue-500 border-blue-500/20 bg-blue-500/5",
    purple: "text-purple-500 border-purple-500/20 bg-purple-500/5",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <Card className="border-border/60 bg-card p-5 transition-all duration-300 hover:shadow-md hover:shadow-accent/5 hover:-translate-y-0.5">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-9 h-9 rounded-lg border ${accentMap[accent] || accentMap.accent} flex items-center justify-center`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-semibold text-foreground tracking-tight">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
        {subtitle && (
          <div className="text-[11px] text-muted-foreground/70 mt-0.5">{subtitle}</div>
        )}
      </Card>
    </motion.div>
  );
}

/* ───── Create Campaign Dialog ───── */
function CreateCampaignDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<"meta" | "google">("meta");
  const [objective, setObjective] = useState<string>("sales");
  const [dailyBudget, setDailyBudget] = useState("");
  const [targeting, setTargeting] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createCampaign = useMutation(api.campaigns.create);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      const campaignId = await createCampaign({
        name: name.trim(),
        platform,
        objective: objective as "sales" | "leads" | "traffic" | "awareness" | "engagement",
        dailyBudget: dailyBudget ? parseFloat(dailyBudget) : undefined,
        targeting: targeting.trim() || undefined,
      });
      toast.success("Campaign created", {
        description: "Ready for compliance validation and launch.",
      });
      onOpenChange(false);
      setName("");
      setPlatform("meta");
      setObjective("sales");
      setDailyBudget("");
      setTargeting("");
    } catch (err) {
      toast.error("Failed to create campaign", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-accent" />
            New Campaign
          </DialogTitle>
          <DialogDescription>
            Define a new ad campaign. Compliance validation runs before launch.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                placeholder="e.g. Spring Sale 2026"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                <Label>Objective</Label>
                <Select
                  value={objective}
                  onValueChange={setObjective}
                  disabled={isCreating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="leads">Leads</SelectItem>
                    <SelectItem value="traffic">Traffic</SelectItem>
                    <SelectItem value="awareness">Awareness</SelectItem>
                    <SelectItem value="engagement">Engagement</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="budget">Daily Budget ($)</Label>
              <Input
                id="budget"
                type="number"
                min="1"
                step="1"
                placeholder="50"
                value={dailyBudget}
                onChange={(e) => setDailyBudget(e.target.value)}
                disabled={isCreating}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="targeting">Targeting (optional)</Label>
              <Input
                id="targeting"
                placeholder="e.g. US, 25-45, interests: running"
                value={targeting}
                onChange={(e) => setTargeting(e.target.value)}
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
            <Button type="submit" disabled={isCreating || !name.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Campaign <ArrowRight className="w-3 h-3 ml-1.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Status badge ───── */
function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; classes: string }> = {
    draft: { label: "Draft", classes: "bg-muted-foreground/10 text-muted-foreground" },
    active: { label: "Active", classes: "bg-emerald-500/10 text-emerald-500" },
    paused: { label: "Paused", classes: "bg-amber-500/10 text-amber-500" },
    archived: { label: "Archived", classes: "bg-muted-foreground/5 text-muted-foreground/50" },
    error: { label: "Error", classes: "bg-destructive/10 text-destructive" },
  };
  const v = variants[status] || variants.draft;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${v.classes}`}>
      <span className={`w-1 h-1 rounded-full ${status === "active" ? "bg-emerald-500" : status === "error" ? "bg-destructive" : "bg-current"}`} />
      {v.label}
    </span>
  );
}

/* ───── Campaign row ───── */
function CampaignRow({
  campaign,
  onDelete,
}: {
  campaign: Doc<"campaigns">;
  onDelete: (id: typeof campaign._id) => void;
}) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group flex items-center gap-4 p-4 rounded-xl bg-card border border-border/50 transition-all duration-200 hover:border-accent/20 hover:shadow-sm hover:-translate-y-0.5"
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        campaign.platform === "meta" ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
      }`}>
        {campaign.platform === "meta" ? (
          <span className="text-xs font-bold">f</span>
        ) : (
          <span className="text-xs font-bold">G</span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-foreground truncate">{campaign.name}</span>
          <StatusBadge status={campaign.status} />
          {campaign.complianceStatus === "passed" && (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="capitalize">{campaign.objective}</span>
          <span>•</span>
          <span className="capitalize">{campaign.platform === "meta" ? "Meta Ads" : "Google Ads"}</span>
          {campaign.dailyBudget && (
            <>
              <span>•</span>
              <span>{formatter.format(campaign.dailyBudget)}/day</span>
            </>
          )}
        </div>
      </div>

      <div className="hidden md:flex items-center gap-4 text-xs text-muted-foreground">
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground">
            {campaign.spend ? formatter.format(campaign.spend) : "—"}
          </div>
          <div>Spend</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground">
            {campaign.conversions ? campaign.conversions.toFixed(0) : "—"}
          </div>
          <div>Conversions</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground">
            {campaign.roas ? `${campaign.roas.toFixed(1)}×` : "—"}
          </div>
          <div>ROAS</div>
        </div>
      </div>

      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={() => onDelete(campaign._id)}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </motion.div>
  );
}

/* ───── Main Page ───── */
export default function CampaignsPage() {
  const { isLoading: authLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const campaigns = useQuery(api.campaigns.list);
  const stats = useQuery(api.campaigns.getAggregateStats);
  const deleteCampaign = useMutation(api.campaigns.remove);

  if (!authLoading && !isAuthenticated) {
    navigate("/auth");
    return null;
  }

  if (authLoading || campaigns === undefined || !stats) {
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

  const handleDelete = async (campaignId: string) => {
    try {
      await deleteCampaign({ campaignId: campaignId as Id<"campaigns"> });
      toast.success("Campaign deleted");
    } catch {
      toast.error("Failed to delete campaign");
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
            Campaigns
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
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 bg-accent/10 text-accent font-medium"
            >
              <Megaphone className="w-4 h-4 shrink-0" />
              Ad Campaigns
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-secondary"
            >
              <Settings className="w-4 h-4 shrink-0" />
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
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                  Ad Campaigns
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Create and manage Meta Ads and Google Ads campaigns
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 hidden sm:flex"
                >
                  <Globe className="w-3.5 h-3.5" /> Spec
                </Button>
                <Button onClick={() => setCreateOpen(true)} size="sm" className="text-xs gap-1.5">
                  <Plus className="w-3.5 h-3.5" /> New Campaign
                </Button>
              </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
              <KpiCard
                icon={Megaphone}
                label="Total Campaigns"
                value={String(stats.totalCampaigns)}
                subtitle={`${stats.activeCount} active, ${stats.draftCount} draft`}
                accent="accent"
              />
              <KpiCard
                icon={DollarSign}
                label="Total Spend"
                value={`$${stats.totalSpend.toFixed(0)}`}
                subtitle="Across all campaigns"
                accent="amber"
              />
              <KpiCard
                icon={MousePointerClick}
                label="Total Conversions"
                value={String(stats.totalConversions.toFixed(0))}
                subtitle={`${stats.totalClicks.toFixed(0)} clicks`}
                accent="emerald"
              />
              <KpiCard
                icon={Target}
                label="Blended ROAS"
                value={stats.blendedROAS > 0 ? `${stats.blendedROAS.toFixed(1)}×` : "—"}
                subtitle={`CPA: $${stats.blendedCPA.toFixed(2)}`}
                accent={stats.blendedROAS >= 2 ? "emerald" : stats.blendedROAS > 0 ? "amber" : "accent"}
              />
            </div>

            {/* ── Campaigns list ── */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Active Campaigns</h2>
              {campaigns.length > 0 && (
                <span className="text-xs text-muted-foreground">{campaigns.length} total</span>
              )}
            </div>

            {campaigns.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Megaphone className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">No campaigns yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
                  Create your first ad campaign. The execution agent will validate
                  compliance and prepare it for launch on Meta or Google.
                </p>
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Create Your First Campaign
                </Button>
              </motion.div>
            ) : (
              <div className="space-y-2">
                {campaigns.map((campaign) => (
                  <CampaignRow
                    key={campaign._id}
                    campaign={campaign}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}

            {/* ── Phase 1 info card ── */}
            {campaigns.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 p-4 rounded-xl bg-accent/5 border border-accent/10 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">Phase 1 — Foundation Active</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Campaign management, compliance validation, and platform execution agents are operational.
                    Connect your Meta Ads and Google Ads accounts via environment variables to enable direct API launch.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>

      <CreateCampaignDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
