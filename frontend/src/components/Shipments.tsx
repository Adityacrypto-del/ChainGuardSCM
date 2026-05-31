import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Truck, MapPin, Hash, ChevronDown } from "lucide-react";
import { api, type Shipment, type Order } from "../lib/api";

interface Props { shipments: Shipment[]; orders: Order[]; onRefresh: () => void }

const STATUS_COLOR: Record<string,string> = {
  pending:"#71717a", in_transit:"#f59e0b", customs:"#a78bfa", delivered:"#22c55e", failed:"#ef4444",
};

export default function Shipments({ shipments, orders, onRefresh }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [cpForm, setCpForm]     = useState<Record<string,{loc:string;note:string;status:string}>>({});
  const [form, setForm]         = useState({ order_id:"", origin:"", destination:"", carrier:"" });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy]         = useState(false);

  const openOrders = orders.filter(o => !["received","cancelled"].includes(o.status));

  const submit = async () => {
    if (!form.order_id || !form.origin || !form.destination) return;
    setBusy(true);
    try {
      await api.createShipment(form);
      onRefresh(); setShowForm(false); setForm({ order_id:"", origin:"", destination:"", carrier:"" });
    } finally { setBusy(false); }
  };

  const addCheckpoint = async (sid: string) => {
    const cp = cpForm[sid];
    if (!cp?.loc) return;
    await api.addCheckpoint(sid, { location:cp.loc, note:cp.note, status:cp.status });
    onRefresh();
    setCpForm(p => ({...p, [sid]: { loc:"", note:"", status:"in_transit" }}));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" /> Shipments
          </h2>
          <p className="text-[11px] text-muted mt-0.5">{shipments.length} active shipments</p>
        </div>
        <motion.button whileTap={{ scale:0.96 }} onClick={() => setShowForm(true)} className="btn btn-primary btn-sm">
          <Plus className="w-3.5 h-3.5" /> New Shipment
        </motion.button>
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
            <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">Create Shipment</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[10px] font-mono text-muted uppercase">Purchase Order</label>
                <select value={form.order_id} onChange={e => setForm(p => ({...p,order_id:e.target.value}))}
                  className="input text-xs py-1.5 max-w-sm">
                  <option value="">— select order —</option>
                  {openOrders.map(o => <option key={o.id} value={o.id}>{o.id} · {o.supplier_name} · ${o.total}</option>)}
                </select>
              </div>
              {(["origin","destination","carrier"] as const).map(f => (
                <div key={f} className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-muted uppercase">{f}</label>
                  <input value={form[f]} onChange={e => setForm(p => ({...p,[f]:e.target.value}))} className="input text-xs py-1.5" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale:0.96 }} onClick={submit} disabled={busy} className="btn btn-primary btn-sm">
                {busy ? "Creating…" : "Create Shipment"}
              </motion.button>
              <motion.button whileTap={{ scale:0.96 }} onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">Cancel</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      {shipments.length === 0 ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="card text-center py-12">
          <Truck className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-muted">No shipments yet.</p>
        </motion.div>
      ) : (
        <div className="flex flex-col gap-3">
          {shipments.map((s, i) => {
            const statusColor = STATUS_COLOR[s.status] ?? "#71717a";
            return (
              <motion.div key={s.id}
                initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                transition={{ delay:i*0.05, duration:0.2 }}
                className="card flex flex-col gap-0 border transition-colors hover:border-border2"
                style={{ borderColor: statusColor + "22" }}
              >
                <div className="flex items-center gap-3 cursor-pointer select-none"
                  onClick={() => setExpanded(e => e === s.id ? null : s.id)}>
                  <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <div className="text-[9px] text-muted font-mono uppercase mb-0.5">Shipment ID</div>
                      <div className="font-mono text-primary text-[11px]">{s.id}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted font-mono uppercase mb-0.5">Route</div>
                      <div className="text-white text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-muted flex-shrink-0" />
                        <span className="truncate">{s.origin} → {s.destination}</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted font-mono uppercase mb-0.5">Carrier</div>
                      <div className="text-white text-xs">{s.carrier || "—"}</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-muted font-mono uppercase mb-0.5">Status</div>
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md border"
                        style={{ borderColor:statusColor+"33", background:statusColor+"11", color:statusColor }}>
                        {s.status.replace(/_/g," ")}
                      </span>
                    </div>
                  </div>
                  <motion.div animate={{ rotate: expanded===s.id ? 180 : 0 }} transition={{ duration:0.2 }}>
                    <ChevronDown className="w-4 h-4 text-muted" />
                  </motion.div>
                </div>

                <AnimatePresence>
                  {expanded === s.id && (
                    <motion.div
                      initial={{ opacity:0, height:0 }}
                      animate={{ opacity:1, height:"auto" }}
                      exit={{    opacity:0, height:0    }}
                      transition={{ duration:0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 pt-4 border-t border-border flex flex-col gap-4">
                        {/* Timeline */}
                        <div>
                          <div className="text-[9px] font-mono text-muted uppercase mb-3">Checkpoint Timeline</div>
                          <div className="flex flex-col">
                            {s.checkpoints.map((cp, ci) => {
                              const cpColor = STATUS_COLOR[cp.status] ?? "#71717a";
                              return (
                                <motion.div key={ci} initial={{ opacity:0, x:-8 }} animate={{ opacity:1, x:0 }}
                                  transition={{ delay:ci*0.05 }} className="flex gap-3">
                                  <div className="flex flex-col items-center">
                                    <div className="w-2.5 h-2.5 rounded-full border-2 mt-0.5 flex-shrink-0"
                                      style={{ borderColor:cpColor, background:cpColor+"33" }} />
                                    {ci < s.checkpoints.length-1 && <div className="w-px flex-1 bg-border mt-1 mb-0.5 min-h-[16px]" />}
                                  </div>
                                  <div className="pb-4 flex flex-col gap-0.5">
                                    <div className="text-xs text-white font-medium">{cp.location}</div>
                                    {cp.note && <div className="text-[10px] text-muted">{cp.note}</div>}
                                    <div className="text-[9px] text-muted font-mono">{new Date(cp.ts*1000).toLocaleString()}</div>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Add checkpoint */}
                        {s.status !== "delivered" && (
                          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                            <input placeholder="Location" value={cpForm[s.id]?.loc ?? ""}
                              onChange={e => setCpForm(p => ({...p,[s.id]:{...p[s.id]??{loc:"",note:"",status:"in_transit"},loc:e.target.value}}))}
                              className="input text-xs py-1 w-36" />
                            <input placeholder="Note" value={cpForm[s.id]?.note ?? ""}
                              onChange={e => setCpForm(p => ({...p,[s.id]:{...p[s.id]??{loc:"",note:"",status:"in_transit"},note:e.target.value}}))}
                              className="input text-xs py-1 w-36" />
                            <select value={cpForm[s.id]?.status ?? "in_transit"}
                              onChange={e => setCpForm(p => ({...p,[s.id]:{...p[s.id]??{loc:"",note:"",status:"in_transit"},status:e.target.value}}))}
                              className="input text-xs py-1 w-32">
                              {["in_transit","customs","delivered","failed"].map(st => <option key={st} value={st}>{st}</option>)}
                            </select>
                            <motion.button whileTap={{ scale:0.96 }} onClick={() => addCheckpoint(s.id)} className="btn btn-primary btn-sm">
                              + Checkpoint
                            </motion.button>
                          </div>
                        )}

                        <span className="hash-chip"><Hash className="w-2.5 h-2.5" />{s.blockchain_tx?.slice(0,16)}…</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
