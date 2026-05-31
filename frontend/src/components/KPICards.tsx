import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Cpu, Shield, Zap, Blocks, CheckCircle, XCircle, TrendingUp, TrendingDown } from "lucide-react";
import type { KPIs } from "../lib/api";

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(target);
  const prev = useRef(target);

  useEffect(() => {
    if (prev.current === target) return;
    const start = prev.current;
    const diff  = target - start;
    const startTime = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      setValue(start + diff * ease);
      if (t < 1) requestAnimationFrame(tick);
      else { setValue(target); prev.current = target; }
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

interface CardProps {
  icon: any; label: string; value: number | string; unit: string;
  color: string; gradient: string; trend?: "up" | "down" | null;
  trendVal?: string; animate?: boolean;
}

function KPICard({ icon: Icon, label, value, unit, color, gradient, trend, trendVal, animate }: CardProps) {
  const numVal  = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.]/g, "")) || 0;
  const counted = useCountUp(animate ? numVal : numVal);
  const display = typeof value === "string" && isNaN(Number(value))
    ? value
    : Number.isInteger(numVal) ? Math.round(counted).toString() : counted.toFixed(1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3, transition: { duration: 0.15 } }}
      className="kpi-card cursor-default"
      style={{ "--kpi-color": color } as any}
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 rounded-2xl opacity-0 hover:opacity-100 transition-opacity duration-300"
        style={{ background: `radial-gradient(circle at 30% 30%, ${color}08 0%, transparent 70%)` }} />

      <div className="relative flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: color + "15", border: `1px solid ${color}25` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          {trend && (
            <span className={trend === "up" ? "trend-up" : "trend-down"}>
              {trend === "up" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trendVal}
            </span>
          )}
        </div>

        <div>
          <motion.div key={String(value)} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold tracking-tight text-white">
            {display}
          </motion.div>
          <div className="text-[11px] text-muted mt-0.5">{unit}</div>
        </div>

        <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">{label}</div>
      </div>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <div className="card flex flex-col gap-3">
      <div className="skeleton h-8 w-8 rounded-xl" />
      <div className="skeleton h-7 w-20 rounded-lg" />
      <div className="skeleton h-3 w-24 rounded" />
    </div>
  );
}

export default function KPICards({ kpis, loading }: { kpis: KPIs | null; loading: boolean }) {
  if (!kpis) return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
    </div>
  );

  const cards: CardProps[] = [
    { icon: Zap,          label: "Throughput",        value: kpis.throughput,      unit: "blocks / second",     color: "#06b6d4", gradient: "gradient-cyan",    animate: true, trend: null },
    { icon: Activity,     label: "Block Latency",     value: kpis.latency_ms,      unit: "milliseconds",         color: "#6366f1", gradient: "gradient-primary", animate: true },
    { icon: Blocks,       label: "Chain Length",      value: kpis.total_blocks,    unit: "blocks mined",         color: "#22c55e", gradient: "gradient-success", animate: true },
    { icon: Shield,       label: "Malicious Nodes",   value: kpis.malicious_nodes, unit: `${kpis.malicious_pct}% of network`, color: kpis.malicious_nodes > 0 ? "#ef4444" : "#22c55e", gradient: kpis.malicious_nodes > 0 ? "gradient-danger" : "gradient-success", animate: true },
    { icon: Cpu,          label: "Consensus Accuracy",value: `${kpis.consensus_acc}%`, unit: "verified nodes",  color: "#f59e0b", gradient: "gradient-warning" },
    { icon: Activity,     label: "Honest Nodes",      value: kpis.honest_nodes,    unit: "tier-A active",        color: "#22c55e", gradient: "gradient-success", animate: true },
    { icon: Shield,       label: "PoW Difficulty",    value: kpis.difficulty,      unit: "SHA-256 leading zeros",color: "#06b6d4", gradient: "gradient-cyan" },
    {
      icon: kpis.chain_valid ? CheckCircle : XCircle,
      label: "Chain Integrity",
      value: kpis.chain_valid ? "VALID" : "INVALID",
      unit: `${kpis.total_blocks} blocks verified`,
      color: kpis.chain_valid ? "#22c55e" : "#ef4444",
      gradient: kpis.chain_valid ? "gradient-success" : "gradient-danger",
    },
  ];

  return (
    <motion.div
      variants={{ show: { transition: { staggerChildren: 0.05 } } }}
      initial="hidden" animate="show"
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {cards.map((c, i) => <KPICard key={i} {...c} />)}
    </motion.div>
  );
}
