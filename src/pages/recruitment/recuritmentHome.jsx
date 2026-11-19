
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../components/header";
import { useAuth } from "../../context/authContext";
import { isAdmin, hasPermission } from "../../helpers/permissions";

const RECRUITMENT_PERMISSION_ID = 39;

const recruitmentSections = [
  {
    title: "إدارة التعيينات",
    description:
      "رفع ملفات المتقدمين وفحص الأرقام القومية ومراجعة قرارات التعيين.",
    path: "/marketing/recuritment",
    parentPermission: RECRUITMENT_PERMISSION_ID,
  },
];

function RecuritmentHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const admin = isAdmin(user);

  const visibleSections = useMemo(() => {
    if (!user) return [];

    if (admin) return recruitmentSections;

    return recruitmentSections.filter((section) =>
      hasPermission(user, section.parentPermission),
    );
  }, [user, admin]);

  if (!user) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-100 p-6"
      >
        <div className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow">
          <h1 className="text-xl font-bold text-slate-800">
            يجب تسجيل الدخول أولاً
          </h1>

          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="mt-5 rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white transition hover:bg-orange-700"
          >
            تسجيل الدخول
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="sticky top-0 z-50">
        <Header user={user} />
      </div>

      <main dir="rtl" className="min-h-screen bg-slate-100 p-4 sm:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-orange-600">
                نظام إدارة التعيينات
              </h1>

              <p className="mt-3 text-gray-600">
                إدارة المتقدمين وملفات التعيين ومراجعة البيانات.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="self-start rounded-lg border border-gray-300 px-5 py-3 text-gray-700 transition hover:bg-gray-200"
            >
              العودة للرئيسية
            </button>
          </div>

          <section className="mt-8">
            {visibleSections.length > 0 ? (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {visibleSections.map((section) => (
                  <button
                    key={section.path}
                    type="button"
                    onClick={() => navigate(section.path)}
                    className="rounded-xl bg-white p-6 text-right shadow transition hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <h2 className="text-xl font-bold text-orange-600">
                      {section.title}
                    </h2>

                    <p className="mt-3 text-gray-600">
                      {section.description}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <h2 className="text-lg font-semibold text-slate-700">
                  لا توجد أقسام متاحة
                </h2>

                <p className="mt-2 text-slate-500">
                  لا يمتلك حسابك صلاحية الوصول إلى إدارة التعيينات.
                </p>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

export default RecuritmentHome;
