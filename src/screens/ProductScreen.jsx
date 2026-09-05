import { useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { formatKs } from "../lib/format";

export default function ProductScreen({ products, setToast }) {
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", price: "", unit: "ခု", costPrice: "", stock: "" });

  const openAdd = () => {
    setForm({ name: "", price: "", unit: "ခု", costPrice: "", stock: "" });
    setShowAdd(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    const price = Number(form.price);
    if (!name) return setToast({ error: "ပစ္စည်းနာမည် ထည့်ပါ" });
    if (!price || price <= 0) return setToast({ error: "ရောင်းဈေး မှန်ကန်စွာ ထည့်ပါ" });

    setSaving(true);
    try {
      // လက်ရှိ id စနစ်က ဂဏန်းအစဉ်လိုက် (1,2,3...) ဖြစ်လို့ အသစ်ထည့်တဲ့အခါလည်း
      // ရှိပြီးသား id တွေထဲက အများဆုံးကို ကြည့်ပြီး +1 လုပ်ထားပါတယ်
      const nextId = products.reduce((max, p) => Math.max(max, p.id), 0) + 1;
      await setDoc(doc(db, "products", String(nextId)), {
        id: nextId,
        name,
        unit: form.unit.trim() || "ခု",
        price,
        costPrice: Number(form.costPrice) || 0,
        stock: Number(form.stock) || 0,
        emoji: "📦",
      });
      setToast({ message: `"${name}" ကို ထည့်သွင်းပြီးပါပြီ` });
      setShowAdd(false);
    } catch (err) {
      setToast({ error: err.message || "မထည့်နိုင်ပါ" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-stone-500">ကုန်ပစ္စည်းများ စီမံခန့်ခွဲရန်</h2>
        <span className="text-xs text-stone-400">{products.length} မျိုး</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {/* ပစ္စည်းအသစ်ထည့်ရန် ခလုတ် — ရှိပြီးသား product grid ထဲမှာပဲ တစ်တန်းတည်း ထားထားသည် */}
        <button
          onClick={openAdd}
          className="flex flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-orange-300 p-4 text-center text-orange-600 active:bg-orange-50 min-h-[152px]"
        >
          <Plus className="w-8 h-8" />
          <span className="text-sm font-bold">ပစ္စည်းအသစ်ထည့်မည်</span>
        </button>

        {products.map((product) => {
          const outOfStock = product.stock <= 0;
          const margin = product.price - (product.costPrice || 0);
          return (
            <div
              key={product.id}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-orange-100 bg-white shadow-sm p-4 text-center"
            >
              <span className="text-4xl">{product.emoji}</span>
              <span className="text-base font-semibold text-stone-800">{product.name}</span>
              <span className="text-orange-600 font-bold text-lg">{formatKs(product.price)}</span>
              <span className="text-xs text-stone-400">
                ဝယ်ဈေး {formatKs(product.costPrice || 0)} · အမြတ် {formatKs(margin)}
              </span>
              <span
                className={`mt-1 text-xs font-medium px-2 py-0.5 rounded-full
                  ${outOfStock ? "bg-stone-200 text-stone-500" : "bg-green-100 text-green-700"}`}
              >
                {outOfStock ? "ကုန်ပြီ" : `ကျန် ${product.stock} ${product.unit}`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Add Product modal */}
      {showAdd && (
        <div
          className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-40"
          onClick={() => !saving && setShowAdd(false)}
        >
          <div
            className="bg-white w-full md:w-[420px] rounded-t-3xl md:rounded-3xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-stone-800">ပစ္စည်းအသစ်ထည့်မည်</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full text-stone-400 active:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-stone-500">ပစ္စည်းနာမည် *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full mt-1 h-11 rounded-xl border border-stone-200 px-3 text-stone-800 focus:outline-none focus:border-orange-400"
                  placeholder="ဥပမာ - ကော်ဖီမှုန့်"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-stone-500">ရောင်းဈေး (Ks) *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                    className="w-full mt-1 h-11 rounded-xl border border-stone-200 px-3 text-stone-800 focus:outline-none focus:border-orange-400"
                    placeholder="0"
                  />
                </div>
                <div className="w-24">
                  <label className="text-xs font-semibold text-stone-500">Unit</label>
                  <input
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    className="w-full mt-1 h-11 rounded-xl border border-stone-200 px-3 text-stone-800 focus:outline-none focus:border-orange-400"
                  />
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-stone-500">ဝယ်ဈေး (Ks) — ရှိရင်</label>
                  <input
                    type="number"
                    value={form.costPrice}
                    onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                    className="w-full mt-1 h-11 rounded-xl border border-stone-200 px-3 text-stone-800 focus:outline-none focus:border-orange-400"
                    placeholder="0"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-stone-500">လက်ရှိလက်ကျန်</label>
                  <input
                    type="number"
                    value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    className="w-full mt-1 h-11 rounded-xl border border-stone-200 px-3 text-stone-800 focus:outline-none focus:border-orange-400"
                    placeholder="0"
                  />
                </div>
              </div>
              <p className="text-[11px] text-stone-400 leading-snug">
                ဝယ်ဈေး မထည့်ရသေးရင် "ပစ္စည်းသွင်း" screen ကနေ ပစ္စည်းသွင်းတဲ့အခါ ဝယ်ဈေး ဆက်ထည့်လို့ရပါတယ် —
                Dashboard ရဲ့ အမြတ်တွက်ချက်မှုအတွက် အသုံးဝင်ပါတယ်။
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 mt-5 rounded-2xl text-base font-bold text-white bg-orange-600 active:bg-orange-700 disabled:bg-stone-300 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              သိမ်းမည်
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
