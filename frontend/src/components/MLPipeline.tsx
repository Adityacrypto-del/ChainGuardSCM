import { ArrowRight, Brain } from "lucide-react";
import type { Node, MLResult } from "../lib/api";

interface Props { nodes: Node[]; mlData: Record<string, MLResult> }

function ProbBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs font-mono">
        <span className="text-muted">{label}</span>
        <span style={{ color }}>{(value * 100).toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value * 100}%`, background: color }} />
      </div>
    </div>
  );
}

function PipelineBox({ title, subtitle, color }: { title: string; subtitle: string; color: string }) {
  return (
    <div className="flex flex-col items-center justify-center border rounded-xl p-3 text-center min-w-[110px]"
      style={{ borderColor: color + "44", background: color + "10" }}>
      <div className="text-xs font-bold font-mono" style={{ color }}>{title}</div>
      <div className="text-[10px] text-muted mt-0.5 leading-tight">{subtitle}</div>
    </div>
  );
}

export default function MLPipeline({ nodes, mlData }: Props) {
  const nodeList = nodes.slice(0, 6);

  return (
    <div className="card flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Brain className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-white font-mono">Ensemble ML Pipeline</h2>
      </div>

      {/* Pipeline architecture diagram */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 flex-wrap gap-y-3">
        <PipelineBox title="Raw Telemetry" subtitle="P2P probes / Edge nodes" color="#06b6d4" />
        <ArrowRight className="w-4 h-4 text-muted flex-shrink-0" />
        <PipelineBox title="Feature Extraction" subtitle="mean·var·skew·kurtosis" color="#a78bfa" />
        <ArrowRight className="w-4 h-4 text-muted flex-shrink-0" />
        <div className="flex flex-col gap-2">
          <PipelineBox title="Random Forest" subtitle="supervised classifier" color="#22c55e" />
          <PipelineBox title="Isolation Forest" subtitle="unsupervised anomaly" color="#f59e0b" />
        </div>
        <ArrowRight className="w-4 h-4 text-muted flex-shrink-0" />
        <PipelineBox title="Bayesian Stack" subtitle="meta-learner fusion" color="#f472b6" />
        <ArrowRight className="w-4 h-4 text-muted flex-shrink-0" />
        <PipelineBox title="P(mal)" subtitle="malicious probability" color="#ef4444" />
      </div>

      {/* Per-node ML scores */}
      {nodeList.length === 0 ? (
        <p className="text-muted text-sm text-center py-4 font-mono">Seed the network to see ML scores.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {nodeList.map(n => {
            const ml = mlData[n.node_id];
            if (!ml) return null;
            return (
              <div key={n.node_id} className="bg-surface2 rounded-xl p-4 flex flex-col gap-3 border border-border">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-primary truncate">{n.node_id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${ml.is_anomaly ? "bg-danger/20 text-danger" : "bg-success/20 text-success"}`}>
                    {ml.is_anomaly ? "ANOMALY" : "NORMAL"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono text-muted">
                  {Object.entries(ml.features).map(([k, v]) => (
                    <div key={k} className="flex justify-between">
                      <span>{k.replace(/_/g, " ")}</span>
                      <span className="text-white">{(v as number).toFixed(3)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-col gap-2 pt-1 border-t border-border">
                  <ProbBar label="Random Forest"    value={ml.random_forest}    color="#22c55e" />
                  <ProbBar label="Isolation Forest" value={ml.isolation_forest} color="#f59e0b" />
                  <ProbBar label="Bayesian Stack"   value={ml.bayesian_stack}   color="#ef4444" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
