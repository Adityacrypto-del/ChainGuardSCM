import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ClipboardCheck, CheckCircle, XCircle, Hash } from "lucide-react";
import { api, type QCCheck, type Shipment, type Product } from "../lib/api";

interface Props { checks: QCCheck[]; shipments: Shipment[]; products: Product[]; onRefresh: () => void }

const rowVariants = {
  hidden: { opacity:0, x:-8 },
  show:   (i: number) => ({ opacity:1, x:0, transition:{ delay:i*0.04, duration:0.2 } }),
};

export default function QualityControl({ checks, shipments, products, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ shipment_id:"", product_id:"", inspector:"", result:"pass", notes:"" });
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!form.shipment_id || !form.product_id || !form.inspector) return;
    setBusy(true);
    try {
      await api.createQC(form);
      onRefresh(); setShowForm(false); setForm({ shipment_id:"", product_id:"", inspector:"", result:"pass", notes:"" });
    } finally { setBusy(false); }
  };

  const productName = (id: string) => products.find(p => p.id === id)?.name ?? id;
  const passCount = checks.filter(c => c.result === "pass").length;
  const failCount = checks.filter(c => c.result === "fail").length;

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" /> Quality Control
          </h2>
          <p className="text-[11px] text-muted mt-0.5">
            {checks.length} inspections ·
            <span className="text-success ml-1">{passCount} passed</span> ·
            <span className="text-danger ml-1">{failCount} failed</span>
          </p>
        </div>
        <motion.button whileTap={{ scale:0.96 }} onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
          <Plus className="w-3.5 h-3.5" /> Log Inspection
        </motion.button>
      </motion.div>

      {/* Summary pills */}
      <motion.div initial={{ opacity:0, y:4 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.05 }}
        className="flex gap-3">
        {[
          { label:"Total",  value:checks.length, color:"text-white",   bg:"bg-surface2"   },
          { label:"Passed", value:passCount,      color:"text-success", bg:"bg-success/10" },
          { label:"Failed", value:failCount,      color:"text-danger",  bg:"bg-danger/10"  },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-border ${bg}`}>
            <span className="text-[11px] text-muted">{label}</span>
            <span className={`text-lg font-bold font-mono ${color}`}>{value}</span>
          </div>
        ))}
      </motion.div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity:0, y:-10, scale:0.98 }}
            animate={{ opacity:1, y:0,   scale:1   }}
            exit={{    opacity:0, y:-10, scale:0.98 }}
            transition={{ duration:0.2 }}
            className="card border border-primary/30 bg-primary/5 flex flex-col gap-4"
          >
            <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">Log QC Inspection</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-muted uppercase">Shipment</label>
                <select value={form.shipment_id} onChange={e => setForm(p => ({...p, shipment_id:e.target.value}))}
                  className="input text-xs py-1.5">
                  <option value="">— select shipment —</option>
                  {shipments.map(s => <option key={s.id} value={s.id}>{s.id} · {s.origin} → {s.destination}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-muted uppercase">Product</label>
                <select value={form.product_id} onChange={e => setForm(p => ({...p, product_id:e.target.value}))}
                  className="input text-xs py-1.5">
                  <option value="">— select product —</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-muted uppercase">Inspector</label>
                <input value={form.inspector} onChange={e => setForm(p => ({...p, inspector:e.target.value}))}
                  className="input text-xs py-1.5" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-muted uppercase">Result</label>
                <div className="flex gap-2">
                  {["pass","fail"].map(r => (
                    <motion.button key={r} whileTap={{ scale:0.95 }} onClick={() => setForm(p => ({...p, result:r}))}
                      className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-colors
                        ${form.result === r
                          ? r==="pass" ? "bg-success/15 border-success/50 text-success" : "bg-danger/15 border-danger/50 text-danger"
                          : "bg-surface2 border-border text-muted hover:text-white"}`}>
                      {r === "pass" ? "✓ PASS" : "✗ FAIL"}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-mono text-muted uppercase">Notes</label>
                <input value={form.notes} onChange={e => setForm(p => ({...p, notes:e.target.value}))}
                  className="input text-xs py-1.5" />
              </div>
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale:0.96 }} onClick={submit} disabled={busy} className="btn btn-primary btn-sm">
                {busy ? "Saving…" : "Submit Inspection"}
              </motion.button>
              <motion.button whileTap={{ scale:0.96 }} onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Cancel</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {checks.length === 0 ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="card text-center py-12">
          <ClipboardCheck className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-muted">No inspections logged yet.</p>
        </motion.div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Result</th><th>Product</th><th>Shipment</th>
                <th>Inspector</th><th>Notes</th><th>Time</th><th>TX</th>
              </tr>
            </thead>
            <tbody>
              {checks.map((c, i) => (
                <motion.tr key={c.id} custom={i} variants={rowVariants} initial="hidden" animate="show"
                  whileHover={{ backgroundColor:"rgba(255,255,255,0.02)" }}>
                  <td>
                    {c.result === "pass"
                      ? <span className="badge badge-active"><CheckCircle className="w-3 h-3" />PASS</span>
                      : <span className="badge badge-slashed"><XCircle className="w-3 h-3" />FAIL</span>}
                  </td>
                  <td className="text-white">{productName(c.product_id)}</td>
                  <td className="font-mono text-[11px] text-primary">{c.shipment_id}</td>
                  <td className="text-muted">{c.inspector}</td>
                  <td className="text-muted italic text-[11px]">{c.notes}</td>
                  <td className="text-muted font-mono text-[11px]">{new Date(c.timestamp*1000).toLocaleString()}</td>
                  <td><span className="hash-chip"><Hash className="w-2.5 h-2.5" />{c.blockchain_tx?.slice(0,10)}…</span></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
