import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/header.jsx";

const SECTIONS = [
  {
    id: "poultry",
    title: "الدواجن",
    subtitle: "إدارة ومتابعة أسعار الدواجن",
    icon: "🐔",
    color: "green",
    status: "available",
  },
  {
    id: "eggs",
    title: "البيض",
    subtitle: "إدارة ومتابعة أسعار البيض",
    icon: "🥚",
    color: "amber",
    status: "coming",
  },
  {
    id: "fish",
    title: "السمك",
    subtitle: "إدارة ومتابعة أسعار الأسماك",
    icon: "🐟",
    color: "blue",
    status: "coming",
  },
];

const POULTRY_STATS = [
  {
    title: "عدد الأصناف",
    value: "15",
    description: "صنف مسجل في النظام",
    icon: "📦",
    color: "blue",
  },
  {
    title: "عدد الموردين",
    value: "10",
    description: "مورد مسجل",
    icon: "🚚",
    color: "purple",
  },
  {
    title: "عدد الفروع",
    value: "44",
    description: "فرع ضمن منظومة التسعير",
    icon: "🏢",
    color: "orange",
  },
  {
    title: "متوسط هامش الربح",
    value: "12.8%",
    description: "متوسط تجريبي للأصناف",
    icon: "📈",
    color: "green",
  },
];

const EXCHANGE_DATA = [
  { name: "السبت", white: 72, baladi: 105 },
  { name: "الأحد", white: 78, baladi: 108 },
  { name: "الاثنين", white: 74, baladi: 106 },
  { name: "الثلاثاء", white: 85, baladi: 112 },
  { name: "الأربعاء", white: 81, baladi: 110 },
  { name: "الخميس", white: 91, baladi: 115 },
  { name: "الجمعة", white: 88, baladi: 113 },
];

const PRODUCTS = [
  {
    name: "صدور",
    cost: 145,
    selling: 172,
    profit: 18.62,
  },
  {
    name: "وراك",
    cost: 92,
    selling: 108,
    profit: 17.39,
  },
  {
    name: "دبابيس",
    cost: 105,
    selling: 120,
    profit: 14.28,
  },
  {
    name: "أجنحة",
    cost: 68,
    selling: 76,
    profit: 11.76,
  },
  {
    name: "شاورما",
    cost: 155,
    selling: 168,
    profit: 8.38,
  },
];

const ACTIVITIES = [
  {
    title: "البورصة اليومية",
    description: "متابعة وتسجيل أسعار السوق",
    icon: "📊",
    path: "/pricing/exchange",
  },
  {
    title: "معاملات الموردين",
    description: "إدارة معاملات الموردين والفروع",
    icon: "🚚",
    path: "/pricing/suppliers",
  },
  {
    title: "تكلفة المصنعات",
    description: "متابعة تكاليف المنتجات المصنعة",
    icon: "🏭",
    path: "/pricing/manufacturing",
  },
  {
    title: "التسعير وهوامش الربح",
    description: "متابعة أسعار البيع والأرباح",
    icon: "💰",
    path: "/pricing/selling-prices",
  },
];

function StatCard({ item }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600",
    purple: "bg-purple-50 text-purple-600",
    orange: "bg-orange-50 text-orange-600",
    green: "bg-green-50 text-green-600",
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-center justify-between">
        <div
          className={`flex h-12 w-12 items-center justify-center rounded-xl text-2xl ${
            colors[item.color]
          }`}
        >
          {item.icon}
        </div>

        <span className="text-xs text-gray-400">إحصائية تجريبية</span>
      </div>

      <p className="mt-5 text-sm text-gray-500">{item.title}</p>

      <h3 className="mt-1 text-3xl font-bold text-gray-800" dir="ltr">
        {item.value}
      </h3>

      <p className="mt-2 text-xs text-gray-400">{item.description}</p>
    </div>
  );
}

function SectionCard({ section, active, onClick }) {
  const styles = {
    poultry: {
      border: "border-green-500",
      background: "bg-green-50",
      icon: "bg-green-100",
      text: "text-green-700",
      button: "bg-green-600 hover:bg-green-700",
    },
    eggs: {
      border: "border-amber-400",
      background: "bg-amber-50",
      icon: "bg-amber-100",
      text: "text-amber-700",
      button: "bg-amber-500 hover:bg-amber-600",
    },
    fish: {
      border: "border-blue-400",
      background: "bg-blue-50",
      icon: "bg-blue-100",
      text: "text-blue-700",
      button: "bg-blue-600 hover:bg-blue-700",
    },
  };

  const style = styles[section.id];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border-2 p-5 text-right transition duration-200 hover:-translate-y-1 hover:shadow-lg ${
        active
          ? `${style.border} ${style.background} shadow-sm`
          : "border-gray-100 bg-white hover:border-gray-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={`flex h-14 w-14 items-center justify-center rounded-2xl text-3xl ${style.icon}`}
        >
          {section.icon}
        </div>

        {section.status === "available" ? (
          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
            متاح
          </span>
        ) : (
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-500">
            قريبًا
          </span>
        )}
      </div>

      <h3 className="mt-5 text-xl font-bold text-gray-800">{section.title}</h3>

      <p className="mt-2 text-sm text-gray-500">{section.subtitle}</p>

      <div
        className={`mt-5 flex items-center justify-between text-sm font-semibold ${style.text}`}
      >
        <span>
          {section.status === "available" ? "عرض لوحة التحكم" : "قيد التجهيز"}
        </span>
        <span>←</span>
      </div>
    </button>
  );
}

function ExchangeChart() {
  const maxValue =
    Math.ceil(
      Math.max(
        ...EXCHANGE_DATA.map((item) => Math.max(item.white, item.baladi)),
      ) / 20,
    ) * 20;

  return (
    <div className="mt-6">
      {/* Legend */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-6">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-green-500" />
          <span className="text-sm font-semibold text-gray-600">
            الفراخ البيضاء
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-orange-500" />
          <span className="text-sm font-semibold text-gray-600">
            الفراخ البلدي
          </span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex h-64 items-end justify-between gap-2 border-b border-gray-100 px-2 sm:gap-4">
        {EXCHANGE_DATA.map((item) => (
          <div
            key={item.name}
            className="flex h-full flex-1 flex-col items-center justify-end"
          >
            {/* Values */}
            <div className="mb-2 flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-orange-600 sm:text-xs">
                {item.baladi}
              </span>
              <span className="text-[10px] font-bold text-green-600 sm:text-xs">
                {item.white}
              </span>
            </div>

            {/* Bars */}
            <div className="flex h-[75%] w-full items-end justify-center gap-1">
              <div
                className="w-1/2 max-w-8 rounded-t-md bg-green-500 transition-all duration-300 hover:bg-green-600"
                style={{
                  height: `${(item.white / maxValue) * 100}%`,
                  minHeight: "5px",
                }}
                title={`الفراخ البيضاء: ${item.white} جنيه`}
              />

              <div
                className="w-1/2 max-w-8 rounded-t-md bg-orange-500 transition-all duration-300 hover:bg-orange-600"
                style={{
                  height: `${(item.baladi / maxValue) * 100}%`,
                  minHeight: "5px",
                }}
                title={`الفراخ البلدي: ${item.baladi} جنيه`}
              />
            </div>

            {/* Day */}
            <span className="mt-3 whitespace-nowrap text-[9px] text-gray-500 sm:text-xs">
              {item.name}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-gray-400">
        أسعار تجريبية بالجنيه المصري لكل كيلو
      </p>
    </div>
  );
}

function PoultryDashboard() {
  const navigate = useNavigate();
  const [selectedSection, setSelectedSection] = useState("poultry");
  const [period, setPeriod] = useState("week");

  const selectedSectionData = useMemo(
    () => SECTIONS.find((section) => section.id === selectedSection),
    [selectedSection],
  );

  const handleSectionChange = (section) => {
    if (section.status === "available") {
      setSelectedSection(section.id);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gray-50">
      <Header />

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Page Heading */}
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 md:text-3xl">
              لوحة تحكم إدارة التسعير
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              نظرة عامة على أقسام التسعير ومؤشرات الأداء
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
            <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
            <span>السبت 14 نوفمبر 2026</span>
          </div>
        </div>

        {/* Main Sections */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-gray-800">أقسام التسعير</h2>
            <p className="mt-1 text-sm text-gray-500">
              اختر القسم الذي تريد متابعة مؤشراته
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {SECTIONS.map((section) => (
              <SectionCard
                key={section.id}
                section={section}
                active={selectedSection === section.id}
                onClick={() => handleSectionChange(section)}
              />
            ))}
          </div>
        </section>

        {/* Selected Section Dashboard */}
        {selectedSectionData?.id === "poultry" && (
          <section className="mt-9">
            <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🐔</span>
                  <h2 className="text-xl font-bold text-gray-800">
                    لوحة تحكم الدواجن
                  </h2>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  متابعة أسعار السوق والتكاليف وهوامش الربح
                </p>
              </div>

              <select
                value={period}
                onChange={(event) => setPeriod(event.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-green-500"
              >
                <option value="week">آخر 7 أيام</option>
                <option value="month">آخر 30 يومًا</option>
                <option value="year">آخر 12 شهرًا</option>
              </select>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {POULTRY_STATS.map((item) => (
                <StatCard key={item.title} item={item} />
              ))}
            </div>

            {/* Charts */}
            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm xl:col-span-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-gray-800">
                      حركة أسعار البورصة
                    </h3>
                    <p className="mt-1 text-xs text-gray-400">
                      متابعة حركة الأسعار خلال الفترة المحددة
                    </p>
                  </div>

                  <span className="rounded-lg bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
                    بيانات تجريبية
                  </span>
                </div>

                <ExchangeChart />
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <h3 className="font-bold text-gray-800">توزيع أقسام العمل</h3>
                <p className="mt-1 text-xs text-gray-400">
                  الشاشات الرئيسية لقسم الدواجن
                </p>

                <div className="mt-6 space-y-5">
                  {ACTIVITIES.map((activity, index) => (
                    <button
                      key={activity.path}
                      type="button"
                      onClick={() => navigate(activity.path)}
                      className="flex w-full items-center gap-3 rounded-xl p-2 text-right transition hover:bg-gray-50"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-xl">
                        {activity.icon}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800">
                          {activity.title}
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          {activity.description}
                        </p>
                      </div>

                      <span className="text-gray-400">←</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Profit Table */}
            <div className="mt-6 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-2 border-b border-gray-100 p-5 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-bold text-gray-800">
                    ملخص هوامش ربح الأصناف
                  </h3>
                  <p className="mt-1 text-xs text-gray-400">
                    مقارنة التكلفة بسعر البيع
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/pricing/selling-prices")}
                  className="text-sm font-semibold text-green-700 hover:text-green-800"
                >
                  عرض كل الأصناف ←
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-162.5 text-right text-sm">
                  <thead className="bg-gray-50 text-gray-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">الصنف</th>
                      <th className="px-5 py-4 font-semibold">التكلفة</th>
                      <th className="px-5 py-4 font-semibold">سعر البيع</th>
                      <th className="px-5 py-4 font-semibold">هامش الربح</th>
                      <th className="px-5 py-4 font-semibold">الحالة</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {PRODUCTS.map((product) => (
                      <tr key={product.name} className="hover:bg-gray-50">
                        <td className="px-5 py-4 font-semibold text-gray-800">
                          {product.name}
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {product.cost.toLocaleString("en-US")} ج.م
                        </td>
                        <td className="px-5 py-4 text-gray-600">
                          {product.selling.toLocaleString("en-US")} ج.م
                        </td>
                        <td className="px-5 py-4 font-bold text-green-700">
                          {product.profit.toFixed(2)}%
                        </td>
                        <td className="px-5 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              product.profit < 10
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                            }`}
                          >
                            {product.profit < 10 ? "يحتاج مراجعة" : "جيد"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Alerts */}
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-5">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-bold text-amber-800">تنبيه هامش الربح</h3>
                  <p className="mt-1 text-sm text-amber-700">
                    يوجد صنف يحتاج إلى مراجعة هامش الربح الخاص به.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <span className="text-2xl">ℹ️</span>
                <div>
                  <h3 className="font-bold text-blue-800">تحديث الأسعار</h3>
                  <p className="mt-1 text-sm text-blue-700">
                    الأرقام المعروضة تجريبية، وسيتم ربطها بالبيانات الفعلية
                    لاحقًا.
                  </p>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Future Sections */}
        {selectedSectionData?.status === "coming" && (
          <section className="mt-9 rounded-2xl border border-dashed border-gray-300 bg-white px-5 py-16 text-center">
            <div className="text-5xl">{selectedSectionData.icon}</div>
            <h2 className="mt-5 text-2xl font-bold text-gray-800">
              لوحة تحكم {selectedSectionData.title}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-gray-500">
              سيتم تجهيز لوحة التحكم الخاصة بهذا القسم بعد الانتهاء من بناء
              شاشاته، بنفس تصميم وتنظيم لوحة تحكم الدواجن.
            </p>
            <span className="mt-5 inline-flex rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-500">
              القسم قيد التجهيز
            </span>
          </section>
        )}

        <footer className="mt-10 border-t border-gray-200 py-5 text-center text-xs text-gray-400">
          لوحة تحكم إدارة التسعير
        </footer>
      </main>
    </div>
  );
}

export default PoultryDashboard;
