import { motion } from "framer-motion";
import { Link2, Clock, Hash } from "lucide-react";
import type { Block } from "../lib/api";

interface Props { blocks: Block[] }

const TX_COLOR: Record<string, string> = {
  genesis:             "#06b6d4",
  supply_chain_event:  "#22c55e",
  malicious_detection: "#ef4444",
  product_created:     "#6366f1",
  purchase_order_created: "#a78bfa",
  shipment_created:    "#f59e0b",
  shipment_checkpoint: "#f59e0b",
  inventory_adjusted:  "#22c55e",
  quality_check:       "#ec4899",
  supplier_registered: "#6366f1",
  order_status_updated:"#06b6d4",
};

function shortHash(h: string) { return h.slice(0, 8) + "…" + h.slice(-6); }
function fmt(ts: number) { return new Date(ts * 1000).toLocaleTimeString(); }

export default function BlockExplorer({ blocks }: Props) {
  const recent = [...blocks].reverse().slice(0, 12);

  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-white">Blockchain Audit Trail</h2>
        </div>
        <span className="text-[11px] font-mono text-muted bg-surface2 border border-border px-2.5 py-1 rounded-lg">
          {blocks.length} blocks
        </span>
      </div>

      {recent.length === 0 ? (
        <div className="text-center py-10 text-muted text-sm">No blocks yet.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {recent.map((b, i) => {
            const tx   = b.transactions[0] ?? {};
            const type = tx.type ?? tx.event ?? "unknown";
            const color = TX_COLOR[type] ?? "#71717a";
            return (
              <motion.div key={b.index}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
                className="flex items-start gap-3 p-3 rounded-xl border border-border bg-surface2 hover:border-border2 transition-colors"
              >
                {/* Color dot */}
                <div className="mt-0.5 w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: color, boxShadow: `0 0 6px ${color}66` }} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-zinc-400">#{b.index}</span>
                      <span className="text-[11px] capitalize" style={{ color }}>
                        {type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-muted font-mono flex-shrink-0">
                      <Clock className="w-3 h-3" />{fmt(b.timestamp)}
                    </span>
                  </div>
                  <div className="flex gap-4 text-[10px] font-mono">
                    <div className="flex items-center gap-1 text-primary/70">
                      <Hash className="w-2.5 h-2.5" />{shortHash(b.hash)}
                    </div>
                    <div className="text-muted">nonce: {b.nonce}</div>
                    {tx.node && <div className="text-zinc-500 truncate">node: {tx.node}</div>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
