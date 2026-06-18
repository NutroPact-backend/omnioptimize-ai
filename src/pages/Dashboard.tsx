import { useAuth } from "@/hooks/use-auth";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useAction, useMutation, useQuery } from "convex/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  Cpu,
  FileSearch,
  Globe,
  Layers,
  LineChart,
  Loader2,
  LogOut,
  Megaphone,
  Menu,
  Network,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  Trash2,
  TrendingUp,
  X,
  Zap,
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

/* ───── Easing ───── */
const EASE = [0.22, 1, 0.36, 1] as const;

/* ───── Sidebar nav items ───── */
const NAV_ITEMS = [
  { icon: BarChart3, label: "Overview", active: true, path: "/dashboard" },
  { icon: Search, label: "Projects", active: false, path: "/dashboard" },
  { icon: Megaphone, label: "Ad Campaigns", active: false, path: "/campaigns" },
  { icon: Network, label: "Entity Graph", active: false, path: "/dashboard" },
  { icon: LineChart, label: "Reports", active: false, path: "/dashboard" },
  { icon: Settings, label: "Settings", active: false, path: "/dashboard" },
];

/* ───── KPI card component ───── */
function KpiCard({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  accent = "accent",
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  subtitle?: string;
  trend?: { direction: "up" | "down"; value: string };
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
          {trend && (
            <span
              className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                trend.direction === "up"
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-amber-500/10 text-amber-500"
              }`}
            >
              <TrendingUp
                className={`w-3 h-3 ${
                  trend.direction === "down" ? "rotate-180" : ""
                }`}
              />
              {trend.value}
            </span>
          )}
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

/* ───── Create Project Dialog ───── */
function CreateProjectDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const createProject = useMutation(api.projects.create);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    setIsCreating(true);
    try {
      const projectId = await createProject({ name: name.trim(), url: url.trim() });
      toast.success("Project created", { description: "Ready for analysis" });
      onOpenChange(false);
      setName("");
      setUrl("");
    } catch (err) {
      toast.error("Failed to create project", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-accent" />
            New Project
          </DialogTitle>
          <DialogDescription>
            Add a website to begin AI-powered visibility analysis.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleCreate}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                placeholder="e.g. My Ecommerce Store"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isCreating}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                placeholder="https://example.com"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isCreating}
                required
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
            <Button type="submit" disabled={isCreating || !name.trim() || !url.trim()}>
              {isCreating ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  Create Project <ArrowRight className="w-3 h-3 ml-1.5" />
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ───── Project Card ───── */
function ProjectCard({
  project,
  isAnalyzing,
  onDelete,
  onAnalyze,
}: {
  project: Doc<"projects">;
  isAnalyzing: boolean;
  onDelete: (id: typeof project._id) => void;
  onAnalyze: (id: typeof project._id) => void;
}) {
  const navigate = useNavigate();
  const statusColors: Record<string, string> = {
    pending: "bg-muted-foreground/30",
    analyzing: "bg-amber-500 animate-pulse",
    analyzed: "bg-emerald-500",
    error: "bg-destructive",
  };

  const statusLabels: Record<string, string> = {
    pending: "Pending",
    analyzing: "Analyzing…",
    analyzed: "Analyzed",
    error: "Error",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <Card
        className="group border-border/60 bg-card p-5 transition-all duration-300 hover:shadow-md hover:border-accent/20 hover:-translate-y-0.5 cursor-pointer"
        onClick={() => navigate(`/dashboard?project=${project._id}`)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-accent" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {project.name}
              </h3>
              <p className="text-xs text-muted-foreground truncate">{project.url}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <span
                className={`w-1.5 h-1.5 rounded-full ${statusColors[project.status]}`}
              />
              {statusLabels[project.status]}
            </span>
          </div>
        </div>

        {project.status === "analyzed" && (
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3 pt-3 border-t border-border/30">
            {project.citationScore != null && (
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-accent" />
                Citation: {project.citationScore.toFixed(0)}%
              </span>
            )}
            {project.schemaHealthScore != null && (
              <span className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-emerald-500" />
                Schema: {project.schemaHealthScore.toFixed(0)}%
              </span>
            )}
            {project.pagesCrawled != null && (
              <span className="flex items-center gap-1">
                <FileSearch className="w-3 h-3 text-blue-500" />
                {project.pagesCrawled.toFixed(0)} pages
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mt-3">
          {project.status === "pending" && (               <Button
              size="sm"
              variant="default"
              className="h-7 text-xs gap-1"
              disabled={isAnalyzing}
              onClick={(e) => {
                e.stopPropagation();
                onAnalyze(project._id);
              }}
            >
              {isAnalyzing ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Zap className="w-3 h-3" />
              )}{" "}
              {isAnalyzing ? "Analyzing…" : "Analyze"}
            </Button>
          )}
          {project.status === "analyzed" && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/dashboard?project=${project._id}`);
              }}
            >
              View Details <ChevronRight className="w-3 h-3" />
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-muted-foreground hover:text-destructive ml-auto"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(project._id);
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </Card>
    </motion.div>
  );
}

/* ───── Main Dashboard ───── */
export default function Dashboard() {
  const { isLoading: authLoading, isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const projects = useQuery(api.projects.list);
  const deleteProject = useMutation(api.projects.remove);
  const analyzeAction = useAction(api.analysis.analyzeProject);

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    navigate("/auth");
    return null;
  }

  // Loading state
  if (authLoading || projects === undefined) {
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

  const totalKpis = projects.reduce(
    (acc, p) => {
      if (p.status === "analyzed") {
        acc.citationScore += p.citationScore ?? 0;
        acc.schemaHealthScore += p.schemaHealthScore ?? 0;
        acc.pagesCrawled += p.pagesCrawled ?? 0;
        acc.count++;
      }
      return acc;
    },
    { citationScore: 0, schemaHealthScore: 0, pagesCrawled: 0, count: 0 },
  );

  const avgCitation =
    totalKpis.count > 0
      ? (totalKpis.citationScore / totalKpis.count).toFixed(0)
      : "—";
  const avgSchema =
    totalKpis.count > 0
      ? (totalKpis.schemaHealthScore / totalKpis.count).toFixed(0)
      : "—";
  const totalPages = totalKpis.pagesCrawled.toFixed(0);
  const analyzedCount = totalKpis.count;
  const pendingCount = projects.filter((p) => p.status === "pending").length;

  const handleAnalyze = async (projectId: string) => {
    const project = projects.find((p) => p._id === projectId);
    if (!project) return;

    setAnalyzingId(projectId);
    try {
      const result = await analyzeAction({
        projectId: projectId as Id<"projects">,
        url: project.url,
        name: project.name,
      });

      if (result.success) {
        toast.success("Analysis complete", {
          description: "KPI snapshot and recommendations ready.",
        });
      } else {
        toast.error("Analysis failed", {
          description: result.error || "Unknown error",
        });
      }
    } catch (err) {
      toast.error("Analysis failed", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (projectId: string) => {
    try {
      await deleteProject({ projectId: projectId as Id<"projects"> });
      toast.success("Project deleted");
    } catch (err) {
      toast.error("Failed to delete project");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground antialiased selection:bg-accent/20 selection:text-accent">
      {/* ─── Mobile header ─── */}
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
            Optimus
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
            {NAV_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-all duration-200 ${
                  item.active
                    ? "bg-accent/10 text-accent font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            ))}
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
                <div className="text-[11px] text-muted-foreground truncate">
                  {user?.email || ""}
                </div>
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

        {/* ─── Mobile sidebar overlay ─── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30 bg-black/20 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* ─── Main content ─── */}
        <main className="flex-1 min-w-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
            {/* ── Top bar ── */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
                  Dashboard
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Overview of your AI visibility analysis projects
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => navigate("/")}
                  variant="outline"
                  size="sm"
                  className="text-xs gap-1.5 hidden sm:flex"
                >
                  <Cpu className="w-3.5 h-3.5" /> Spec
                </Button>
                <Button
                  onClick={() => setCreateOpen(true)}
                  size="sm"
                  className="text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> New Project
                </Button>
              </div>
            </div>

            {/* ── KPI Cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
              <KpiCard
                icon={Sparkles}
                label="Avg Citation Score"
                value={avgCitation !== "—" ? `${avgCitation}%` : "—"}
                subtitle={`Across ${analyzedCount} analyzed projects`}
                trend={avgCitation !== "—" ? { direction: "up", value: "+4% vs target" } : undefined}
                accent="accent"
              />
              <KpiCard
                icon={Shield}
                label="Avg Schema Health"
                value={avgSchema !== "—" ? `${avgSchema}%` : "—"}
                subtitle="Target: 100%"
                trend={avgSchema !== "—" ? { direction: "up", value: "+2%" } : undefined}
                accent="emerald"
              />
              <KpiCard
                icon={FileSearch}
                label="Pages Analyzed"
                value={totalPages !== "0" ? totalPages : "0"}
                subtitle={`${projects.length} total projects`}
                accent="blue"
              />
              <KpiCard
                icon={Layers}
                label="Pending Analysis"
                value={String(pendingCount)}
                subtitle={`${analyzedCount} analyzed, ${projects.length - analyzedCount - pendingCount} errored`}
                accent={pendingCount > 0 ? "amber" : "emerald"}
              />
            </div>

            {/* ── Projects Section ── */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-foreground">Projects</h2>
              {projects.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {projects.length} total
                </span>
              )}
            </div>

            {projects.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-16"
              >
                <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Globe className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  No projects yet
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6 leading-relaxed">
                  Add your first website to start analyzing its AI visibility,
                  schema health, and citation potential.
                </p>
                <Button
                  onClick={() => setCreateOpen(true)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" /> Create Your First Project
                </Button>
              </motion.div>
            ) : (
              <div className="grid gap-3">
                {projects.map((project) => (
                  <ProjectCard
                    key={project._id}
                    project={project}
                    isAnalyzing={analyzingId === project._id}
                    onDelete={handleDelete}
                    onAnalyze={handleAnalyze}
                  />
                ))}
              </div>
            )}

            {/* ── Actions prompt ── */}
            {projects.filter((p) => p.status === "pending").length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-6 p-4 rounded-xl bg-accent/5 border border-accent/10 flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">
                    {projects.filter((p) => p.status === "pending").length} project(s) pending analysis
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Click the <strong>Analyze</strong> button on each project to run an AI-powered visibility
                    audit. Results include citation scores, schema health, and entity extraction.
                  </p>
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>

      {/* ─── Create Dialog ─── */}
      <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
