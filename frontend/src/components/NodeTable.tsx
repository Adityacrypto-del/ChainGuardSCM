import { useState } from "react";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, RefreshCw, Network } from "lucide-react";
import { api, type Node } from "../lib/api";

interface Props { nodes: Node[]; onRefresh: () => void }

function ScoreBar({ score }: { score: number }) {
  const color = score >= 0.7 ? "#22c55e" : score >= 0.4 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2 w-32">
      <div className="score-bar-track flex-1">
        <motion.div className="score-bar-fill"
          initial={{ width: 0 }} animate={{ width: `${score * 100}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ background: color }} />
      </div>
      <span className="text-[11px] font-mono w-10 text-right" style={{ color }}>
        {score.toFixed(3)}
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls: Record<string, string> = {
    active: "badge-active", warned: "badge-warned",
    quarantined: "badge-quarantined", slashed: "badge-slashed",
  };
  return <span className={cls[status] ?? "badge-active"}>{status}</span>;
}

export default function NodeTable({ nodes, onRefresh }: Props) {
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (node_id: string, action: string) => {
    setBusy(node_id + action);
    await api.nodeAction(node_id, action).catch(() => {});
    onRefresh();
    setBusy(null);
  };

  const tierOrder = { A: 0, B: 1, C: 2 };
  const sorted = [...nodes].sort((a, b) =>
    (tierOrder[a.tier as keyof typeof tierOrder] ?? 0) - (tierOrder[b.tier as keyof typeof tierOrder] ?? 0)
  );

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-white">Node Stratification</h2>
            <p className="text-[11px] text-muted mt-0.5">Tier A · Active &nbsp;·&nbsp; Tier B · Warned &nbsp;·&nbsp; Tier C · Slashed</p>
          </div>
        </div>
        <button onClick={onRefresh} className="btn-icon hover:bg-surface2 text-muted hover:text-white transition-colors rounded-xl">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <Network className="w-8 h-8 text-zinc-700" />
          <p className="text-sm text-muted">No nodes — seed the network first</p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="data-table">
            <thead>
              <tr>
                <th>Node</th>
                <th>Tier</th>
                <th className="min-w-[160px]">Reputation</th>
                <th>Status</th>
                <th className="text-right">P(mal)</th>
                <th className="text-right">W<sub>i</sub></th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((n, i) => (
                <motion.tr key={n.node_id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                >
                  <td>
                    <div className="font-mono text-[11px] text-cyan">{n.node_id}</div>
                    <div className="text-[10px] text-muted mt-0.5">{n.node_type} · S:{n.successes} F:{n.failures}</div>
                  </td>
                  <td>
                    <span className={`tier-${n.tier.toLowerCase()} text-sm`}>Tier {n.tier}</span>
                  </td>
                  <td><ScoreBar score={n.score} /></td>
                  <td><StatusBadge status={n.status} /></td>
                  <td className="text-right font-mono text-[11px]">
                    <span className={n.mal_prob >= 0.7 ? "text-danger" : n.mal_prob >= 0.4 ? "text-warning" : "text-success"}>
                      {n.mal_prob.toFixed(3)}
                    </span>
                  </td>
                  <td className="text-right font-mono text-[11px] text-muted">{n.weight.toFixed(4)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => act(n.node_id, "trust")} disabled={!!busy}
                        className="btn-icon text-zinc-600 hover:text-success hover:bg-success/10 transition-colors rounded-lg disabled:opacity-40">
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => act(n.node_id, "flag")} disabled={!!busy}
                        className="btn-icon text-zinc-600 hover:text-danger hover:bg-danger/10 transition-colors rounded-lg disabled:opacity-40">
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
