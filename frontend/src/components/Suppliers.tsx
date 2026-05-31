import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Building2, ThumbsUp, ThumbsDown, Hash } from "lucide-react";
import { api, type Supplier } from "../lib/api";

interface Props { suppliers: Supplier[]; onRefresh: () => void }

function RepBar({ score, status }: { score: number; status: string }) {
  const color = status === "active" ? "#22c55e" : status === "warned" ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="score-bar-track flex-1">
        <motion.div className="score-bar-fill"
          initial={{ width: 0 }} animate={{ width: `${score * 100}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          style={{ background: color }} />
      </div>
      <span className="text-[11px] font-mono" style={{ color }}>{score.toFixed(3)}</span>
    </div>
  );
}

export default function Suppliers({ suppliers, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:"", location:"", contact:"" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.name) return;
    setBusy(true);
    try {
      await api.createSupplier(form);
      onRefresh(); setShowForm(false); setForm({ name:"", location:"", contact:"" });
    } finally { setBusy(false); }
  };

  const rate = async (id: string, status: "good" | "bad") => {
    await api.rateSupplier(id, status, status === "bad" ? "Manual flag" : "Manual trust");
    onRefresh();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Building2 className="w-4 h-4 text-primary" /> Suppliers
          </h2>
          <p className="text-[11px] text-muted mt-0.5">{suppliers.length} registered suppliers</p>
        </div>
        <motion.button whileTap={{ scale: 0.96 }} onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
          <Plus className="w-3.5 h-3.5" /> Add Supplier
        </motion.button>
      </motion.div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity:0, y:-10, scale:0.98 }}
            animate={{ opacity:1, y:0,   scale:1   }}
            exit={{    opacity:0, y:-10, scale:0.98 }}
            transition={{ duration: 0.2 }}
            className="card border border-primary/30 bg-primary/5 flex flex-col gap-4"
          >
            <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">Register Supplier</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["name","location","contact"] as const).map(f => (
                <div key={f} className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-muted uppercase">{f}</label>
                  <input value={form[f]} onChange={e => setForm(p => ({...p,[f]:e.target.value}))}
                    className="input text-xs py-1.5" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale:0.96 }} onClick={submit} disabled={busy} className="btn btn-primary btn-sm">
                {busy ? "Saving…" : "Register"}
              </motion.button>
              <motion.button whileTap={{ scale:0.96 }} onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">
                Cancel
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards grid */}
      {suppliers.length === 0 ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="card text-center py-12">
          <Building2 className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-muted">No suppliers yet. Add one or seed the supply chain demo.</p>
        </motion.div>
      ) : (
        <motion.div
          variants={{ show: { transition: { staggerChildren: 0.06 } } }}
          initial="hidden" animate="show"
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {suppliers.map(s => {
            const rep = s.reputation;
            const statusColor = !rep ? "#71717a" : rep.status === "active" ? "#22c55e" : rep.status === "warned" ? "#f59e0b" : "#ef4444";
            return (
              <motion.div key={s.id}
                variants={{ hidden:{ opacity:0, y:12 }, show:{ opacity:1, y:0, transition:{ duration:0.25 } } }}
                whileHover={{ y:-3, transition:{ duration:0.15 } }}
                className="card flex flex-col gap-3 cursor-default"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold text-white text-sm">{s.name}</div>
                    <div className="text-[11px] text-muted">{s.location}</div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md border"
                    style={{ borderColor:statusColor+"33", background:statusColor+"11", color:statusColor }}>
                    {rep?.status ?? "unknown"}
                  </span>
                </div>

                {rep && <RepBar score={rep.score} status={rep.status} />}

                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-muted border-t border-border pt-2">
                  <div>Orders: <span className="text-white">{s.total_orders}</span></div>
                  <div>Tier: <span className="font-bold" style={{ color:statusColor }}>{rep?.tier ?? "—"}</span></div>
                  <div>P(mal): <span className={rep && rep.mal_prob >= 0.7 ? "text-danger" : "text-success"}>{rep?.mal_prob.toFixed(3) ?? "—"}</span></div>
                  <div>W<sub>i</sub>: <span className="text-white">{rep?.weight.toFixed(4) ?? "—"}</span></div>
                </div>

                {s.contact && <div className="text-[10px] text-muted font-mono">{s.contact}</div>}

                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="hash-chip">
                    <Hash className="w-2.5 h-2.5" />{s.blockchain_tx?.slice(0,12)}…
                  </span>
                  <div className="flex gap-1">
                    <motion.button whileTap={{ scale:0.85 }} onClick={() => rate(s.id, "good")}
                      className="btn-icon text-zinc-600 hover:text-success hover:bg-success/10 rounded-lg transition-colors">
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </motion.button>
                    <motion.button whileTap={{ scale:0.85 }} onClick={() => rate(s.id, "bad")}
                      className="btn-icon text-zinc-600 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
