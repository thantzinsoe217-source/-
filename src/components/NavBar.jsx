import { ShoppingCart, Package, PackagePlus, LayoutDashboard, Store, Settings } from "lucide-react";

const NAV_ITEMS = [
  { id: "sale", label: "ရောင်းမည်", icon: ShoppingCart },
  { id: "product", label: "ပစ္စည်း", icon: Package },
  { id: "stock", label: "ပစ္စည်းသွင်း", icon: PackagePlus },
  { id: "dashboard", label: "အနှစ်ချုပ်", icon: LayoutDashboard },
  { id: "settings", label: "စီစဉ်ရန်", icon: Settings },
];

// variant="sidebar" → desktop ဘက်ဘောင်, variant="bottom" → mobile အောက်ခံ bar
// App.jsx ကနေ နှစ်ခါ ခေါ်သုံးပြီး layout ထဲ လိုရာနေရာမှာ ထည့်ထားပါတယ်
export default function NavBar({ active, onChange, variant }) {
  if (variant === "sidebar") {
    return (
      <nav className="hidden md:flex flex-col w-20 shrink-0 bg-white border-r border-orange-100 py-4 gap-1 items-center">
        <div className="w-11 h-11 rounded-xl bg-orange-600 flex items-center justify-center mb-4 shrink-0">
          <Store className="w-6 h-6 text-white" />
        </div>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className={`w-16 flex flex-col items-center gap-1 py-2.5 rounded-xl transition
                ${isActive ? "bg-orange-100 text-orange-700" : "text-stone-400 hover:bg-orange-50 hover:text-orange-500"}`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[11px] font-medium leading-tight text-center">{label}</span>
            </button>
          );
        })}
      </nav>
    );
  }

  return (
    <nav
      className="md:hidden shrink-0 flex items-stretch border-t border-orange-100 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition
              ${isActive ? "text-orange-600" : "text-stone-400 active:text-orange-500"}`}
          >
            <Icon className={`w-5 h-5 transition-transform ${isActive ? "scale-110" : ""}`} />
            <span className="text-[11px] font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}