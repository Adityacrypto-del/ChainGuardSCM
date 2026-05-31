import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import type { PerfSnap, Node } from "../lib/api";
import { TrendingUp } from "lucide-react";

interface Props { history: PerfSnap[]; nodes: Node[] }

const TOOLTIP = {
  contentStyle: { backgroundColor: "#111111", border: "1px solid #2a2a2a", borderRadius: 12, fontSize: 11, fontFamily: "JetBrains Mono, monospace", color: "#fafafa" },
  itemStyle:    { color: "#fafafa" },
  labelStyle:   { color: "#71717a", marginBottom: 4 },
};

const AXIS = { tick: { fill: "#52525b", fontSize: 10, fontFamily: "JetBrains Mono, monospace" }, tickLine: false, axisLine: false };

function toLabel(t: number) {
  return new Date(t * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function ChartCard({ title, children, span = 1 }: { title: string; children: React.ReactNode; span?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      className={`card flex flex-col gap-4 ${span === 2 ? "lg:col-span-2" : ""}`}>
      <div className="text-[11px] font-medium text-muted uppercase tracking-widest">{title}</div>
      {children}
    </motion.div>
  );
}

export default function PerformanceCharts({ history, nodes }: Props) {
  const data = history.map(s => ({
    time:      toLabel(s.t),
    throughput: s.throughput,
    latency:   s.latency_ms,
    mal_pct:   s.malicious_pct,
    consensus: s.consensus_acc,
    honest:    +(100 - s.malicious_pct).toFixed(1),
  }));

  const tierCounts = { A: 0, B: 0, C: 0 };
  nodes.forEach(n => { tierCounts[n.tier as keyof typeof tierCounts]++ });
  const tierData = [
    { name: "Tier A", count: tierCounts.A, fill: "#22c55e" },
    { name: "Tier B", count: tierCounts.B, fill: "#f59e0b" },
    { name: "Tier C", count: tierCounts.C, fill: "#ef4444" },
  ];

  if (data.length < 2) {
    return (
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-white">Performance Evaluation Matrix</h2>
        <div className="card text-center py-12 text-muted text-sm mt-4 w-full">
          Collecting data — refresh a few times or run a simulation to populate charts.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-white">Performance Evaluation Matrix</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Throughput (blk/s)">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gThroughput" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="time" {...AXIS} />
              <YAxis {...AXIS} />
              <Tooltip {...TOOLTIP} />
              <Area type="monotone" dataKey="throughput" stroke="#06b6d4" strokeWidth={2} fill="url(#gThroughput)" name="blk/s" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Latency (ms)">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gLatency" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="time" {...AXIS} />
              <YAxis {...AXIS} />
              <Tooltip {...TOOLTIP} />
              <Area type="monotone" dataKey="latency" stroke="#6366f1" strokeWidth={2} fill="url(#gLatency)" name="ms" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Attack Resilience (%)">
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gHonest" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gMal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="time" {...AXIS} />
              <YAxis domain={[0, 100]} {...AXIS} />
              <Tooltip {...TOOLTIP} />
              <ReferenceLine y={80} stroke="#22c55e" strokeDasharray="4 2" strokeOpacity={0.4} />
              <Area type="monotone" dataKey="honest"  stroke="#22c55e" strokeWidth={2} fill="url(#gHonest)" name="Honest %" dot={false} />
              <Area type="monotone" dataKey="mal_pct" stroke="#ef4444" strokeWidth={2} fill="url(#gMal)"    name="Malicious %" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Node Stratification">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={tierData} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="name" {...AXIS} />
              <YAxis allowDecimals={false} {...AXIS} />
              <Tooltip {...TOOLTIP} />
              {tierData.map(d => (
                <Bar key={d.name} dataKey="count" fill={d.fill} radius={[6,6,0,0]} name={d.name} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Consensus Accuracy · Paired t-test baseline" span={2}>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gConsensus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" />
              <XAxis dataKey="time" {...AXIS} />
              <YAxis domain={[0, 100]} {...AXIS} />
              <Tooltip {...TOOLTIP} />
              <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="4 2" strokeOpacity={0.5} label={{ value:"threshold", fill:"#f59e0b", fontSize:9, fontFamily:"JetBrains Mono" }} />
              <Area type="monotone" dataKey="consensus" stroke="#22c55e" strokeWidth={2} fill="url(#gConsensus)" name="Consensus %" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
