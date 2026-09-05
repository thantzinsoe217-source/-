import { useEffect, useState } from "react";
import { TrendingUp, Wallet, ShoppingBag, Award } from "lucide-react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, Timestamp } from "firebase/firestore";
import { formatKs, startOfToday } from "../lib/format";

export default function DashboardScreen() {
  const [todaySales, setTodaySales] = useState([]);
  const [todayStockIns, setTodayStockIns] = useState([]);
  const [loading, setLoading] = useState(true);

  // "ဒီနေ့" စာမျက်နှာအတွက် sales/stockIns collection ၂ခုစလုံးကို
  // ဒီနေ့ 00:00 ကစပြီး live subscribe လုပ်ထားသည်
  useEffect(() => {
    const startTs = Timestamp.fromDate(startOfToday());

    const salesQ = query(collection(db, "sales"), where("createdAt", ">=", startTs));
    const unsubSales = onSnapshot(salesQ, (snap) => {
      setTodaySales(snap.docs.map((d) => d.data()));
      setLoading(false);
    });

    const stockQ = query(collection(db, "stockIns"), where("createdAt", ">=", startTs));
    const unsubStock = onSnapshot(stockQ, (snap) => {
      setTodayStockIns(snap.docs.map((d) => d.data()));
    });

    return () => {
      unsubSales();
      unsubStock();
    };
  }, []);

  const totalRevenue = todaySales.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalProfit = todaySales.reduce(
    (sum, s) => sum + (s.items || []).reduce((s2, i) => s2 + (i.price - (i.costPrice || 0)) * i.qty, 0),
    0
  );
  const totalPurchases = todayStockIns.reduce((sum, s) => sum + (s.totalCost || 0), 0);

  const soldQtyByName = {};
  todaySales.forEach((s) =>
    (s.items || []).forEach((i) => {
      soldQtyByName[i.name] = (soldQtyByName[i.name] || 0) + i.qty;
    })
  );
  const bestSeller = Object.entries(soldQtyByName).sort((a, b) => b[1] - a[1])[0];

  const cards = [
    {
      label: "ဒီနေ့ အရောင်းအကောင်းဆုံးပစ္စည်း",
      value: bestSeller ? bestSeller[0] : "—",
      sub: bestSeller ? `${bestSeller[1]} ခု ရောင်းရသည်` : "ယနေ့ အရောင်းမရှိသေးပါ",
      icon: Award,
      color: "bg-amber-100 text-amber-700",
    },
    {
      label: "ဒီနေ့ ရောင်းရငွေ စုစုပေါင်း",
      value: formatKs(totalRevenue),
      sub: `${todaySales.length} ကြိမ် ရောင်းရသည်`,
      icon: TrendingUp,
      color: "bg-green-100 text-green-700",
    },
    {
      label: "ဒီနေ့ စုစုပေါင်းအမြတ်",
      value: formatKs(totalProfit),
      sub: "ရောင်းဈေး − ဝယ်ဈေး",
      icon: Wallet,
      color: "bg-orange-100 text-orange-700",
    },
    {
      label: "ဒီနေ့ ပစ္စည်းဝယ်ငွေ စုစုပေါင်း",
      value: formatKs(totalPurchases),
      sub: "Stock သွင်းထားသည့်ငွေ",
      icon: ShoppingBag,
      color: "bg-blue-100 text-blue-700",
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-4">
      <h2 className="text-sm font-semibold text-stone-500 mb-3">
        ဒီနေ့ ({new Date().toLocaleDateString("en-GB")}) အနှစ်ချုပ်
      </h2>
      {loading ? (
        <p className="text-stone-400 text-sm">Loading...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map(({ label, value, sub, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-white rounded-2xl border border-orange-100 shadow-sm p-4 flex items-start gap-3"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-stone-400 mb-0.5">{label}</p>
                <p className="text-xl font-extrabold text-stone-800 truncate">{value}</p>
                <p className="text-xs text-stone-400 mt-0.5">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
