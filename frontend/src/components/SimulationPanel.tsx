import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Zap, Database, Plus, AlertTriangle } from "lucide-react";
import { api } from "../lib/api";

interface Props { onRefresh: () => void; hasNodes: boolean }

interface Msg { text: string; type: "info" | "danger" | "success" }

const MSG_STYLE: Record<string, string> = {
  info:    "bg-primary/5 border-primary/20 text-primary",
  danger:  "bg-danger/5  border-danger/20  text-danger",
  success: "bg-success/5 border-success/20 text-success",
};

export default function SimulationPanel({ onRefresh, hasNodes }: Props) {
  const [busy, setBusy]         = useState(false);
  const [atkCount, setAtkCount] = useState(3);
  const [honest, setHonest]     = useState(5);
  const [mal, setMal]           = useState(2);
  const [msg, setMsg]           = useState<Msg | null>(null);

  const run = async (fn: () => Promise<any>, successMsg: string, type: Msg["type"] = "info") => {
    setBusy(true); setMsg({ text: "Running…", type: "info" });
    try {
      const r = await fn();
      setMsg({ text: r?.message ?? successMsg, type });
      onRefresh();
    } catch (e: any) { setMsg({ text: `Error: ${e.message}`, type: "danger" }); }
    finally { setBusy(false); }
  };

  return (
    <div className="card flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-warning" />
        <h2 className="text-sm font-semibold text-white">Simulation Controls</h2>
        <span className="ml-auto text-[10px] font-mono text-muted bg-surface2 border border-border px-2 py-0.5 rounded-md">Research Demo</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Seed */}
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-surface2 border border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan/10 border border-cyan/20 flex items-center justify-center">
              <Database className="w-3.5 h-3.5 text-cyan" />
            </div>
            <span className="text-sm font-semibold text-white">Seed Network</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-muted block mb-1">Honest</label>
              <input type="number" value={honest} min={1} max={20} onChange={e => setHonest(+e.target.value)}
                className="input text-center py-1.5 text-sm" />
            </div>
            <div>
              <label className="text-[10px] text-muted block mb-1">Malicious</label>
              <input type="number" value={mal} min={0} max={10} onChange={e => setMal(+e.target.value)}
                className="input text-center py-1.5 text-sm" />
            </div>
          </div>
          <button onClick={() => run(() => api.seed(honest, mal), "Network seeded", "success")}
            disabled={busy || hasNodes}
            className="btn btn-success btn-sm justify-center mt-auto">
            <Play className="w-3.5 h-3.5" />
            {hasNodes ? "Already Seeded" : "Initialize"}
          </button>
        </div>

        {/* Attack */}
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-danger/5 border border-danger/20">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-danger" />
            </div>
            <span className="text-sm font-semibold text-white">Attack Simulation</span>
          </div>
          <div>
            <label className="text-[10px] text-muted block mb-1">Nodes to inject</label>
            <input type="number" value={atkCount} min={1} max={9} onChange={e => setAtkCount(+e.target.value)}
              className="input text-sm py-1.5" />
          </div>
          <p className="text-[11px] text-zinc-500">Injects malicious nodes, triggers ML detection, degrades TPS.</p>
          <button onClick={() => run(() => api.attack(atkCount), `${atkCount} nodes injected`, "danger")}
            disabled={busy}
            className="btn btn-danger btn-sm justify-center mt-auto">
            <Play className="w-3.5 h-3.5" />
            Run Attack
          </button>
        </div>

        {/* Reset + Add TX */}
        <div className="flex flex-col gap-3 p-4 rounded-2xl bg-surface2 border border-border">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-surface3 border border-border flex items-center justify-center">
              <RotateCcw className="w-3.5 h-3.5 text-muted" />
            </div>
            <span className="text-sm font-semibold text-white">Network Tools</span>
          </div>
          <p className="text-[11px] text-zinc-500">Reset all node reputations. Genesis block is preserved.</p>
          <button onClick={() => run(() => api.reset(), "Network reset", "success")}
            disabled={busy} className="btn btn-ghost btn-sm justify-center">
            <RotateCcw className="w-3.5 h-3.5" /> Reset Network
          </button>
          <button onClick={() => run(() => api.addTx({
              type: "supply_chain_event", event: "manual_purchase_order", node: "honest_node_0",
            }), "Transaction added", "success")}
            disabled={busy} className="btn btn-success btn-sm justify-center">
            <Plus className="w-3.5 h-3.5" /> Add Transaction
          </button>
        </div>
      </div>

      <AnimatePresence>
        {msg && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`p-3 rounded-xl border text-sm font-mono ${MSG_STYLE[msg.type]}`}>
            {msg.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
