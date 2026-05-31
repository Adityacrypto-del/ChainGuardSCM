import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Package, Pencil, Trash2, Hash } from "lucide-react";
import { api, type Product } from "../lib/api";

interface Props { products: Product[]; onRefresh: () => void }

const CATEGORIES = ["Raw Material","Component","Sub-Assembly","Finished Good","Packaging"];

const rowVariants = {
  hidden: { opacity: 0, x: -10 },
  show:   (i: number) => ({ opacity: 1, x: 0, transition: { delay: i * 0.04, duration: 0.2 } }),
};

function TxBadge({ tx }: { tx?: string }) {
  if (!tx) return null;
  return (
    <span className="hash-chip" title={tx}>
      <Hash className="w-2.5 h-2.5" />{tx.slice(0, 10)}…
    </span>
  );
}

export default function Products({ products, onRefresh }: Props) {
  const [form, setForm]     = useState<Partial<Product>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy]     = useState(false);

  const blank = () => setForm({ name:"", sku:"", category:"Raw Material", unit:"unit", description:"" });

  const submit = async () => {
    if (!form.name || !form.sku) return;
    setBusy(true);
    try {
      editing ? await api.updateProduct(editing, form as any) : await api.createProduct(form as any);
      onRefresh(); setShowForm(false); setEditing(null); setForm({});
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    await api.deleteProduct(id).catch(() => {});
    onRefresh();
  };

  const startEdit = (p: Product) => { setForm(p); setEditing(p.id); setShowForm(true); };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-4 }} animate={{ opacity:1, y:0 }} className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" /> Products
          </h2>
          <p className="text-[11px] text-muted mt-0.5">{products.length} items in catalog</p>
        </div>
        <motion.button whileTap={{ scale: 0.96 }}
          onClick={() => { blank(); setEditing(null); setShowForm(true); }}
          className="btn btn-primary btn-sm">
          <Plus className="w-3.5 h-3.5" /> New Product
        </motion.button>
      </motion.div>

      {/* Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,   scale: 1    }}
            exit={{    opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="card border border-primary/30 bg-primary/5 flex flex-col gap-4"
          >
            <h3 className="text-xs font-semibold uppercase tracking-widest text-primary">
              {editing ? "Edit Product" : "New Product"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(["name","sku","unit","description"] as const).map(f => (
                <div key={f} className="flex flex-col gap-1">
                  <label className="text-[10px] font-mono text-muted uppercase">{f}</label>
                  <input value={(form as any)[f] ?? ""} onChange={e => setForm(p => ({...p,[f]:e.target.value}))}
                    className="input text-xs py-1.5" />
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono text-muted uppercase">Category</label>
                <select value={form.category ?? "Raw Material"} onChange={e => setForm(p => ({...p,category:e.target.value}))}
                  className="input text-xs py-1.5">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.96 }} onClick={submit} disabled={busy} className="btn btn-primary btn-sm">
                {busy ? "Saving…" : editing ? "Update" : "Create"}
              </motion.button>
              <motion.button whileTap={{ scale: 0.96 }}
                onClick={() => { setShowForm(false); setEditing(null); setForm({}); }}
                className="btn btn-ghost btn-sm">Cancel</motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {products.length === 0 ? (
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="card text-center py-12">
          <Package className="w-8 h-8 text-zinc-700 mx-auto mb-2" />
          <p className="text-sm text-muted">No products yet. Create one or seed the demo supply chain.</p>
        </motion.div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>SKU</th><th>Category</th><th>Unit</th><th>Blockchain TX</th><th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <motion.tr key={p.id} custom={i} variants={rowVariants} initial="hidden" animate="show"
                  whileHover={{ backgroundColor: "rgba(255,255,255,0.02)" }}>
                  <td>
                    <div className="font-medium text-white">{p.name}</div>
                    <div className="text-[10px] text-muted font-mono">{p.description}</div>
                  </td>
                  <td className="font-mono text-[11px] text-primary">{p.sku}</td>
                  <td>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-surface2 border border-border text-muted">
                      {p.category}
                    </span>
                  </td>
                  <td className="text-[11px] text-muted font-mono">{p.unit}</td>
                  <td><TxBadge tx={p.blockchain_tx} /></td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => startEdit(p)}
                        className="btn-icon text-zinc-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => remove(p.id)}
                        className="btn-icon text-zinc-600 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </motion.button>
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
