import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Brain, Network, Link2, BarChart3, Zap,
  RefreshCw, Shield, Package, Building2, ShoppingCart,
  Truck, Warehouse, ClipboardCheck, GitBranch, Database,
  ChevronLeft, ChevronRight, Circle,
} from "lucide-react";
import {
  api,
  type KPIs, type Block, type Node, type MLResult, type PerfSnap,
  type Product, type Supplier, type Order, type Shipment,
  type InventoryItem, type QCCheck,
} from "./lib/api";

import KPICards          from "./components/KPICards";
import MLPipeline        from "./components/MLPipeline";
import NodeTable         from "./components/NodeTable";
import BlockExplorer     from "./components/BlockExplorer";
import PerformanceCharts from "./components/PerformanceCharts";
import SimulationPanel   from "./components/SimulationPanel";
import Products          from "./components/Products";
import Suppliers         from "./components/Suppliers";
import Orders            from "./components/Orders";
import Shipments         from "./components/Shipments";
import Inventory         from "./components/Inventory";
import QualityControl    from "./components/QualityControl";
import Provenance        from "./components/Provenance";

type View =
  | "dashboard" | "ml" | "nodes" | "chain" | "performance" | "simulate"
  | "products"  | "suppliers" | "orders" | "shipments"
  | "inventory" | "quality"   | "provenance";

const NAV_GROUPS = [
  {
    label: "Blockchain",
    items: [
      { id: "dashboard",   label: "Overview",        icon: LayoutDashboard },
      { id: "ml",          label: "ML Pipeline",     icon: Brain },
      { id: "nodes",       label: "Network Nodes",   icon: Network },
      { id: "chain",       label: "Audit Trail",     icon: Link2 },
      { id: "performance", label: "Performance",     icon: BarChart3 },
      { id: "simulate",    label: "Simulation",      icon: Zap },
    ],
  },
  {
    label: "Supply Chain",
    items: [
      { id: "products",   label: "Products",         icon: Package },
      { id: "suppliers",  label: "Suppliers",        icon: Building2 },
      { id: "orders",     label: "Orders",           icon: ShoppingCart },
      { id: "shipments",  label: "Shipments",        icon: Truck },
      { id: "inventory",  label: "Inventory",        icon: Warehouse },
      { id: "quality",    label: "Quality Control",  icon: ClipboardCheck },
      { id: "provenance", label: "Provenance",       icon: GitBranch },
    ],
  },
];

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  exit:    { opacity: 0, y: -4, transition: { duration: 0.15 } },
};

export default function App() {
  const [view, setView]           = useState<View>("dashboard");
  const [kpis, setKpis]           = useState<KPIs | null>(null);
  const [blocks, setBlocks]       = useState<Block[]>([]);
  const [nodes, setNodes]         = useState<Node[]>([]);
  const [mlData, setMlData]       = useState<Record<string, MLResult>>({});
  const [history, setHistory]     = useState<PerfSnap[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orders, setOrders]       = useState<Order[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [quality, setQuality]     = useState<QCCheck[]>([]);
  const [loading, setLoading]     = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [seeding, setSeeding]     = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [k, b, n, ml, hist, prods, sups, ords, ships, inv, qc] = await Promise.all([
        api.kpis(), api.chain(), api.nodes(), api.allMl(), api.perfHistory(),
        api.products(), api.suppliers(), api.orders(), api.shipments(),
        api.inventory(), api.quality(),
      ]);
      setKpis(k); setBlocks(b); setNodes(n); setMlData(ml); setHistory(hist);
      setProducts(prods); setSuppliers(sups); setOrders(ords);
      setShipments(ships); setInventory(inv); setQuality(qc);
      setLastRefresh(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => { const t = setInterval(refresh, 20000); return () => clearInterval(t); }, [refresh]);

  const seedScm = async () => {
    setSeeding(true);
    await api.scmSeed().catch(() => {});
    await refresh();
    setSeeding(false);
  };

  const activeLabel = NAV_GROUPS.flatMap(g => g.items).find(n => n.id === view)?.label ?? "";
  const chainOk     = kpis?.chain_valid ?? true;

  return (
    <div className="flex h-screen overflow-hidden bg-bg text-white">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 56 : 220 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex-shrink-0 flex flex-col border-r border-border bg-surface overflow-hidden"
        style={{ minWidth: collapsed ? 56 : 220 }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-3.5 h-14 border-b border-border flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-glow-primary">
            <Shield className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
              <div className="text-sm font-bold text-white leading-tight">ChainGuard</div>
              <div className="text-[10px] text-muted font-mono">SCM · v1.0</div>
            </motion.div>
          )}
        </div>

        {/* Chain status pill */}
        {!collapsed && (
          <div className="mx-3 mt-3 mb-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-surface2 border border-border">
            <div className={chainOk ? "live-dot" : "w-2 h-2 rounded-full bg-danger"} />
            <span className="text-[11px] font-medium text-zinc-400">
              {chainOk ? `Chain valid · ${kpis?.total_blocks ?? 0} blocks` : "Chain error"}
            </span>
          </div>
        )}

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 p-2 flex-1 overflow-y-auto mt-1">
          {NAV_GROUPS.map(group => (
            <div key={group.label} className="mb-3">
              {!collapsed && (
                <div className="section-title px-2 pb-1.5">{group.label}</div>
              )}
              {group.items.map(item => {
                const Icon = item.icon;
                const active = view === item.id;
                return (
                  <button key={item.id} onClick={() => setView(item.id as View)}
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm
                      transition-all duration-150 mb-0.5 text-left
                      ${active
                        ? "bg-primary/10 text-primary border border-primary/20 font-medium"
                        : "text-zinc-500 hover:text-zinc-200 hover:bg-surface2"}`}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && <span className="text-[13px] truncate">{item.label}</span>}
                    {active && !collapsed && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Seed button */}
        {!collapsed && products.length === 0 && (
          <div className="p-3 border-t border-border">
            <button onClick={seedScm} disabled={seeding}
              className="btn btn-success btn-sm w-full justify-center">
              <Database className="w-3.5 h-3.5" />
              {seeding ? "Seeding…" : "Seed Demo Data"}
            </button>
          </div>
        )}

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(p => !p)}
          className="m-2 p-2 rounded-xl text-zinc-600 hover:text-zinc-300 hover:bg-surface2 transition-colors flex items-center justify-center flex-shrink-0">
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </motion.aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="flex-shrink-0 flex items-center justify-between border-b border-border bg-surface/60 backdrop-blur-md px-6 h-14 gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-sm font-semibold text-white">{activeLabel}</h1>
            {lastRefresh && (
              <span className="hidden sm:block text-[11px] text-muted font-mono">
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Live stats pills */}
          {kpis && (
            <div className="hidden md:flex items-center gap-2">
              {[
                { label: `${kpis.throughput} blk/s`, color: "text-cyan"    },
                { label: `${kpis.latency_ms} ms`,    color: "text-primary" },
                { label: `${kpis.honest_nodes} honest`, color: "text-success" },
                { label: kpis.malicious_nodes > 0 ? `${kpis.malicious_nodes} threat` : "No threats",
                  color: kpis.malicious_nodes > 0 ? "text-danger" : "text-zinc-500" },
              ].map(({ label, color }) => (
                <span key={label} className={`text-[11px] font-mono px-2.5 py-1 rounded-lg bg-surface2 border border-border ${color}`}>
                  {label}
                </span>
              ))}
              <div className="w-px h-4 bg-border mx-1" />
              {[
                { label: `${products.length} products`, color: "text-zinc-400" },
                { label: `${orders.length} orders`,    color: "text-zinc-400" },
              ].map(({ label, color }) => (
                <span key={label} className={`text-[11px] font-mono px-2.5 py-1 rounded-lg bg-surface2 border border-border ${color}`}>
                  {label}
                </span>
              ))}
            </div>
          )}

          <button onClick={refresh} disabled={loading}
            className="btn btn-ghost btn-sm flex-shrink-0">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:block">{loading ? "Loading…" : "Refresh"}</span>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            <motion.div key={view} variants={pageVariants} initial="initial" animate="animate" exit="exit">

              {view === "dashboard" && (
                <div className="flex flex-col gap-6">
                  <KPICards kpis={kpis} loading={loading} />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label:"Products",  value:products.length,  color:"#06b6d4", icon:Package },
                      { label:"Suppliers", value:suppliers.length, color:"#6366f1", icon:Building2 },
                      { label:"Orders",    value:orders.length,    color:"#22c55e", icon:ShoppingCart },
                      { label:"Shipments", value:shipments.length, color:"#f59e0b", icon:Truck },
                    ].map(({ label, value, color, icon: Icon }) => (
                      <motion.div key={label} whileHover={{ y: -2 }}
                        className="card flex items-center gap-3 cursor-default">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: color + "15", border: `1px solid ${color}22` }}>
                          <Icon className="w-4 h-4" style={{ color }} />
                        </div>
                        <div>
                          <div className="text-[11px] text-muted">{label}</div>
                          <div className="text-xl font-bold" style={{ color }}>{value}</div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                    <NodeTable nodes={nodes.slice(0, 6)} onRefresh={refresh} />
                    <BlockExplorer blocks={blocks} />
                  </div>
                </div>
              )}

              {view === "ml"          && <MLPipeline nodes={nodes} mlData={mlData} />}
              {view === "nodes"       && <NodeTable nodes={nodes} onRefresh={refresh} />}
              {view === "chain"       && <BlockExplorer blocks={blocks} />}
              {view === "performance" && <PerformanceCharts history={history} nodes={nodes} />}
              {view === "simulate"    && (
                <div className="flex flex-col gap-6">
                  <SimulationPanel onRefresh={refresh} hasNodes={nodes.length > 0} />
                  <KPICards kpis={kpis} loading={loading} />
                </div>
              )}
              {view === "products"   && <Products products={products} onRefresh={refresh} />}
              {view === "suppliers"  && <Suppliers suppliers={suppliers} onRefresh={refresh} />}
              {view === "orders"     && <Orders orders={orders} products={products} suppliers={suppliers} onRefresh={refresh} />}
              {view === "shipments"  && <Shipments shipments={shipments} orders={orders} onRefresh={refresh} />}
              {view === "inventory"  && <Inventory inventory={inventory} products={products} onRefresh={refresh} />}
              {view === "quality"    && <QualityControl checks={quality} shipments={shipments} products={products} onRefresh={refresh} />}
              {view === "provenance" && <Provenance products={products} />}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
