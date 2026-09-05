import { useState, useEffect } from "react";
import { Store, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { db } from "./firebase";
import { collection, doc, onSnapshot, writeBatch } from "firebase/firestore";
import NavBar from "./components/NavBar";
import SaleScreen from "./screens/SaleScreen";
import ProductScreen from "./screens/ProductScreen";
import StockScreen from "./screens/StockScreen";
import DashboardScreen from "./screens/DashboardScreen";
import SettingsScreen from "./screens/SettingsScreen";
import { formatKs } from "./lib/format";

// App ပထမဆုံးအကြိမ် run တဲ့အခါ Firestore "products" collection ထဲမှာ
// data လုံးဝမရှိသေးရင် ဒီ list ကို seed data အဖြစ် အလိုအလျောက်ထည့်ပေးမှာဖြစ်ပါတယ်။
// (costPrice ကို "ဝယ်ဈေး/အမြတ်" ပြသမှုနဲ့ Dashboard ရဲ့ အမြတ်တွက်ချက်မှုအတွက် ထည့်ထားသည်)
const SEED_PRODUCTS = [
  { id: 1, name: "ဆန်", unit: "အိတ်", price: 4500, costPrice: 3800, stock: 25, emoji: "🌾" },
  { id: 2, name: "ဆီ", unit: "ပုလင်း", price: 8000, costPrice: 6800, stock: 40, emoji: "🛢️" },
  { id: 3, name: "သကြား", unit: "ကီလို", price: 2800, costPrice: 2300, stock: 60, emoji: "🧂" },
  { id: 4, name: "ဆပ်ပြာ", unit: "ဘား", price: 1200, costPrice: 900, stock: 8, emoji: "🧼" },
  { id: 5, name: "ဆေးလိပ်", unit: "ထုပ်", price: 3500, costPrice: 3000, stock: 0, emoji: "🚬" },
];

const SCREEN_LABELS = {
  sale: "ငွေရှင်းစာမျက်နှာ",
  product: "ကုန်ပစ္စည်း စီမံခန့်ခွဲရန်",
  stock: "ပစ္စည်းသွင်းရန်",
  dashboard: "ဒီနေ့ လုပ်ငန်းအနှစ်ချုပ်",
  settings: "Webhook စီစဉ်ရန်",
};

export default function MiniMartPOS() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState("sale");
  const [cart, setCart] = useState([]);
  const [toast, setToast] = useState(null);

  // Firestore "products" collection ကို live subscribe လုပ်ခြင်း
  useEffect(() => {
    const productsRef = collection(db, "products");
    const unsub = onSnapshot(
      productsRef,
      async (snapshot) => {
        if (snapshot.empty) {
          // ပထမဆုံးအကြိမ်ဖြစ်ရင် seed data ကို Firestore ထဲ တစ်ခါတည်း ရေးထည့်ပါ
          const batch = writeBatch(db);
          SEED_PRODUCTS.forEach((p) => {
            const ref = doc(db, "products", String(p.id));
            batch.set(ref, p);
          });
          await batch.commit();
          return; // batch.commit() ပြီးရင် onSnapshot က ထပ်ခေါ်ပေးမှာမို့ ဒီနေရာမှာ ရပ်လိုက်ပါ
        }
        const list = snapshot.docs
          .map((d) => ({ ...d.data(), id: Number(d.id) }))
          .sort((a, b) => a.id - b.id);
        setProducts(list);
        setLoading(false);
      },
      (error) => {
        console.error("Firestore ချိတ်ဆက်မှု အမှား:", error);
        setToast({ error: "Firebase ချိတ်ဆက်လို့မရပါ — .env config ကို စစ်ပါ" });
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-3 bg-orange-50">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
        <p className="text-stone-500 font-medium">Firebase နဲ့ ချိတ်ဆက်နေပါသည်...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex bg-orange-50 font-sans overflow-hidden">
      {/* Desktop ဘက်ဘောင် (mobile မှာ ဝှက်ထားသည်) */}
      <NavBar active={screen} onChange={setScreen} variant="sidebar" />

      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 bg-white border-b border-orange-100 shrink-0">
          <div className="w-11 h-11 rounded-xl bg-orange-600 flex items-center justify-center shrink-0 md:hidden">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-800 leading-tight">Mini-Mart POS</h1>
            <p className="text-sm text-stone-400 leading-tight">{SCREEN_LABELS[screen]}</p>
          </div>
        </header>

        {/* Active screen */}
        <main className="flex-1 min-h-0 overflow-hidden">
          {screen === "sale" && (
            <SaleScreen products={products} cart={cart} setCart={setCart} setToast={setToast} />
          )}
          {screen === "product" && <ProductScreen products={products} setToast={setToast} />}
          {screen === "stock" && <StockScreen products={products} setToast={setToast} />}
          {screen === "dashboard" && <DashboardScreen />}
          {screen === "settings" && <SettingsScreen setToast={setToast} />}
        </main>

        {/* Mobile အောက်ခံ nav bar (desktop မှာ ဝှက်ထားသည်) */}
        <NavBar active={screen} onChange={setScreen} variant="bottom" />
      </div>

      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white px-5 py-3 rounded-2xl shadow-lg z-50
            ${toast.error ? "bg-red-600" : "bg-stone-800"}`}
        >
          {toast.error ? (
            <AlertCircle className="w-5 h-5 text-white" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-green-400" />
          )}
          <span className="font-medium">
            {toast.error
              ? toast.error
              : toast.total !== undefined
              ? `အရောင်းမှတ်တမ်းတင်ပြီးပါပြီ — ${formatKs(toast.total)}`
              : toast.message}
          </span>
        </div>
      )}
    </div>
  );
}