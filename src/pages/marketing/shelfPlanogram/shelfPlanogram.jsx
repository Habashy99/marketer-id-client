
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../../components/header";
import SearchableSelect from "../../../components/SearchableSelect";

/* -------------------------------------------------------------------------- */
/* Constants                                                                   */
/* -------------------------------------------------------------------------- */

const STORAGE_KEY = "marketing_shelf_planograms_v1";

const COLORS = [
  "#3979C6",
  "#279B78",
  "#B17A37",
  "#8757A5",
  "#D15C72",
  "#368F9B",
  "#64748B",
  "#9B7B45",
];

const uid = () => crypto.randomUUID();

/* -------------------------------------------------------------------------- */
/* Data Helpers                                                                */
/* -------------------------------------------------------------------------- */

const createShelf = (number) => ({
  id: uid(),
  number,
  companies: [],
});

const createBay = (name, shelfCount) => ({
  id: uid(),
  name,
  shelfCount,
  createdAt: new Date().toISOString(),
  images: [],
  shelves: Array.from({ length: shelfCount }, (_, index) =>
    createShelf(index + 1),
  ),
});

function readSavedDesigns() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    return parsed.map((bay) => ({
      ...bay,
      images: Array.isArray(bay.images) ? bay.images : [],
      shelves: Array.isArray(bay.shelves) ? bay.shelves : [],
    }));
  } catch {
    return [];
  }
}

function getTotal(shelf) {
  return shelf.companies.reduce(
    (sum, company) => sum + Number(company.percentage || 0),
    0,
  );
}

function formatPercentage(value) {
  return Number(value.toFixed(2));
}

/* -------------------------------------------------------------------------- */
/* Image Helpers                                                               */
/* -------------------------------------------------------------------------- */

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const maxSize = 1200;

        let width = image.width;
        let height = image.height;

        if (width > maxSize || height > maxSize) {
          const ratio = Math.min(maxSize / width, maxSize / height);

          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");

        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");

        if (!context) {
          reject(new Error("تعذر تجهيز الصورة"));
          return;
        }

        context.drawImage(image, 0, 0, width, height);

        resolve({
          id: uid(),
          name: file.name,
          data: canvas.toDataURL("image/jpeg", 0.7),
          createdAt: new Date().toISOString(),
        });
      };

      image.onerror = () => reject(new Error("تعذر قراءة الصورة"));
      image.src = reader.result;
    };

    reader.onerror = () => reject(new Error("تعذر قراءة الملف"));
    reader.readAsDataURL(file);
  });
}

/* -------------------------------------------------------------------------- */
/* Bay Preview                                                                 */
/* -------------------------------------------------------------------------- */

function BayPreview({ bay, onClick, active = false }) {
  const companyCount = bay.shelves.reduce(
    (sum, shelf) => sum + shelf.companies.length,
    0,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full min-w-0 rounded-2xl border-2 bg-white p-3 text-right shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
        active
          ? "border-[#76517E] ring-2 ring-purple-100"
          : "border-gray-200 hover:border-[#76517E]"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-bold text-[#192440]">{bay.name}</h3>

          <p className="mt-1 text-xs text-gray-400">
            {bay.shelves.length} رفوف
          </p>
        </div>

        <span className="shrink-0 rounded-lg bg-purple-50 px-2 py-1 text-xs font-bold text-[#76517E]">
          {companyCount} شركات
        </span>
      </div>

      <div className="space-y-2 rounded-xl bg-gray-100 p-2">
        {bay.shelves.map((shelf) => {
          const total = getTotal(shelf);

          const complete =
            shelf.companies.length > 0 &&
            Math.abs(total - 100) < 0.001;

          return (
            <div
              key={shelf.id}
              className="overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              <div className="flex items-center justify-between border-b border-gray-100 px-2 py-1">
                <span className="text-[10px] font-bold text-gray-500">
                  رف {shelf.number}
                </span>

                <span
                  className={`text-[10px] font-bold ${
                    complete
                      ? "text-green-600"
                      : total > 100
                        ? "text-red-500"
                        : "text-gray-400"
                  }`}
                >
                  {formatPercentage(total)}%
                </span>
              </div>

              <div className="flex min-h-10 overflow-hidden">
                {shelf.companies.length === 0 ? (
                  <div className="flex w-full items-center justify-center px-2 text-[10px] text-gray-300">
                    رف فارغ
                  </div>
                ) : (
                  shelf.companies.map((company, index) => (
                    <div
                      key={company.id}
                      title={`${company.name} - ${company.percentage}%`}
                      className="flex min-w-0 flex-col items-center justify-center overflow-hidden border-l border-white/30 px-1 text-center text-white"
                      style={{
                        width: `${Math.max(
                          0,
                          Number(company.percentage || 0),
                        )}%`,
                        backgroundColor: COLORS[index % COLORS.length],
                      }}
                    >
                      <span className="w-full truncate text-[9px] font-bold">
                        {company.name}
                      </span>

                      <span className="text-[10px] font-extrabold">
                        {company.percentage}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="font-semibold text-[#76517E]">
          اضغط لفتح التصميم
        </span>

        <span className="text-gray-400">عرض الباكية ←</span>
      </div>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Component                                                              */
/* -------------------------------------------------------------------------- */

export default function ShelfPlanogram() {
  const navigate = useNavigate();

  const [bays, setBays] = useState(readSavedDesigns);

  const [selectedBayId, setSelectedBayId] = useState(null);
  const [selectedShelfId, setSelectedShelfId] = useState(null);

  const [showCreateBay, setShowCreateBay] = useState(false);

  const [bayQuantity, setBayQuantity] = useState(2);
  const [defaultShelfCount, setDefaultShelfCount] = useState(6);

  const [bayDrafts, setBayDrafts] = useState([
    { name: "باكية 1", shelfCount: 6 },
    { name: "باكية 2", shelfCount: 6 },
  ]);

  const [selectedImageBayId, setSelectedImageBayId] = useState("");
  const [uploadingImages, setUploadingImages] = useState(false);

  const [savedMessage, setSavedMessage] = useState("الحفظ المحلي مفعل");

  /* ------------------------------------------------------------------------ */
  /* Local Storage                                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(bays));
      setSavedMessage("تم الحفظ محلياً");
    } catch (error) {
      console.error("Local storage error:", error);
      setSavedMessage("مساحة التخزين ممتلئة");
    }
  }, [bays]);

  /* ------------------------------------------------------------------------ */
  /* Selected Data                                                            */
  /* ------------------------------------------------------------------------ */

  const selectedBay = useMemo(
    () => bays.find((bay) => bay.id === selectedBayId) || null,
    [bays, selectedBayId],
  );

  const selectedShelf = useMemo(
    () =>
      selectedBay?.shelves.find((shelf) => shelf.id === selectedShelfId) ||
      null,
    [selectedBay, selectedShelfId],
  );

  const totalPercentage = selectedShelf ? getTotal(selectedShelf) : 0;

  const isComplete = Math.abs(totalPercentage - 100) < 0.001;

  const totalImages = useMemo(
    () =>
      bays.reduce(
        (total, bay) => total + (bay.images?.length || 0),
        0,
      ),
    [bays],
  );

  /* ------------------------------------------------------------------------ */
  /* Bay Functions                                                            */
  /* ------------------------------------------------------------------------ */

  function openBay(bay) {
    setSelectedBayId(bay.id);
    setSelectedShelfId(bay.shelves[0]?.id || null);
  }

  function prepareBayDrafts(quantity) {
    const count = Math.max(1, Math.min(50, Number(quantity) || 1));

    setBayQuantity(count);

    setBayDrafts((current) =>
      Array.from({ length: count }, (_, index) => ({
        name: current[index]?.name || `باكية ${index + 1}`,
        shelfCount:
          current[index]?.shelfCount || Number(defaultShelfCount),
      })),
    );
  }

  function updateDraft(index, field, value) {
    setBayDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index
          ? { ...draft, [field]: value }
          : draft,
      ),
    );
  }

  function createMultipleBays() {
    if (!bayDrafts.length) {
      alert("حدد عدد الباكيات أولاً");
      return;
    }

    const invalid = bayDrafts.some(
      (draft) =>
        !draft.name.trim() ||
        !Number.isInteger(Number(draft.shelfCount)) ||
        Number(draft.shelfCount) < 1 ||
        Number(draft.shelfCount) > 50,
    );

    if (invalid) {
      alert(
        "راجع أسماء الباكيات وعدد الرفوف. العدد يجب أن يكون بين 1 و 50.",
      );
      return;
    }

    const newBays = bayDrafts.map((draft) =>
      createBay(draft.name.trim(), Number(draft.shelfCount)),
    );

    setBays((current) => [...current, ...newBays]);

    openBay(newBays[0]);

    setShowCreateBay(false);
    setBayQuantity(2);
    setDefaultShelfCount(6);

    setBayDrafts([
      { name: "باكية 1", shelfCount: 6 },
      { name: "باكية 2", shelfCount: 6 },
    ]);
  }

  function updateBayName(value) {
    if (!selectedBay) return;

    setBays((current) =>
      current.map((bay) =>
        bay.id === selectedBay.id
          ? { ...bay, name: value }
          : bay,
      ),
    );
  }

  function deleteBay(bayId) {
    if (!window.confirm("هل تريد حذف هذه الباكية بكل رفوفها وصورها؟")) {
      return;
    }

    setBays((current) => current.filter((bay) => bay.id !== bayId));

    if (selectedBayId === bayId) {
      setSelectedBayId(null);
      setSelectedShelfId(null);
    }

    if (selectedImageBayId === bayId) {
      setSelectedImageBayId("");
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Shelf Functions                                                          */
  /* ------------------------------------------------------------------------ */

  function updateShelfCompanies(shelfId, companies) {
    setBays((current) =>
      current.map((bay) => ({
        ...bay,
        shelves: bay.shelves.map((shelf) =>
          shelf.id === shelfId
            ? { ...shelf, companies }
            : shelf,
        ),
      })),
    );
  }

  function addCompany(option) {
    if (!option || !selectedShelf) return;

    const alreadyExists = selectedShelf.companies.some(
      (company) => company.supplierId === String(option.value),
    );

    if (alreadyExists) {
      alert("الشركة موجودة بالفعل في هذا الرف");
      return;
    }

    updateShelfCompanies(selectedShelf.id, [
      ...selectedShelf.companies,
      {
        id: uid(),
        supplierId: String(option.value),
        name: option.label,
        percentage: 0,
      },
    ]);
  }

  function updateCompanyPercentage(companyId, percentage) {
    if (!selectedShelf) return;

    const value = Math.max(0, Math.min(100, Number(percentage) || 0));

    updateShelfCompanies(
      selectedShelf.id,
      selectedShelf.companies.map((company) =>
        company.id === companyId
          ? { ...company, percentage: value }
          : company,
      ),
    );
  }

  function removeCompany(companyId) {
    if (!selectedShelf) return;

    updateShelfCompanies(
      selectedShelf.id,
      selectedShelf.companies.filter(
        (company) => company.id !== companyId,
      ),
    );
  }

  function goToShelf(direction) {
    if (!selectedBay || !selectedShelf) return;

    const nextNumber = selectedShelf.number + direction;

    const nextShelf = selectedBay.shelves.find(
      (shelf) => shelf.number === nextNumber,
    );

    if (nextShelf) {
      setSelectedShelfId(nextShelf.id);
    }
  }

  /* ------------------------------------------------------------------------ */
  /* Bay Images                                                               */
  /* ------------------------------------------------------------------------ */

  async function handleBayImages(event) {
    const files = Array.from(event.target.files || []);

    if (!selectedImageBayId || files.length === 0) {
      return;
    }

    const allowedFiles = files.filter((file) =>
      file.type.startsWith("image/"),
    );

    if (allowedFiles.length !== files.length) {
      alert("يمكن رفع ملفات الصور فقط.");
    }

    if (allowedFiles.length === 0) {
      event.target.value = "";
      return;
    }

    const maxFileSize = 15 * 1024 * 1024;

    const oversizedFiles = allowedFiles.filter(
      (file) => file.size > maxFileSize,
    );

    if (oversizedFiles.length > 0) {
      alert("حجم الصورة الواحدة يجب ألا يتجاوز 15 ميجابايت.");
    }

    const validFiles = allowedFiles.filter(
      (file) => file.size <= maxFileSize,
    );

    if (validFiles.length === 0) {
      event.target.value = "";
      return;
    }

    try {
      setUploadingImages(true);

      const compressedImages = await Promise.all(
        validFiles.map(compressImage),
      );

      setBays((current) =>
        current.map((bay) =>
          bay.id === selectedImageBayId
            ? {
                ...bay,
                images: [
                  ...(bay.images || []),
                  ...compressedImages,
                ],
              }
            : bay,
        ),
      );
    } catch (error) {
      console.error("Image upload error:", error);
      alert("حدث خطأ أثناء تجهيز الصور.");
    } finally {
      setUploadingImages(false);
      event.target.value = "";
    }
  }

  function deleteBayImage(bayId, imageId) {
    if (!window.confirm("هل تريد حذف هذه الصورة؟")) return;

    setBays((current) =>
      current.map((bay) =>
        bay.id === bayId
          ? {
              ...bay,
              images: (bay.images || []).filter(
                (image) => image.id !== imageId,
              ),
            }
          : bay,
      ),
    );
  }

  /* ------------------------------------------------------------------------ */
  /* Render                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-screen bg-[#F4F6FA]" dir="rtl">
      <Header />

      <main className="mx-auto max-w-[1700px] space-y-6 p-4 md:p-6">
        {/* ---------------------------------------------------------------- */}
        {/* Page Header                                                      */}
        {/* ---------------------------------------------------------------- */}

        <section className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
              <span>التسويق</span>
              <span>/</span>
              <span className="text-[#76517E]">
                تصميم الباكيات والرفوف
              </span>
            </div>

            <h1 className="text-2xl font-bold text-[#192440] md:text-3xl">
              تصميم الباكيات والرفوف
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              أنشئ أكثر من باكية، ووزّع الشركات على الرفوف، وأضف صورًا
              حقيقية لكل باكية.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-green-50 px-3 py-2 text-xs font-semibold text-green-700">
              ● {savedMessage}
            </span>

            <button
              type="button"
              onClick={() => navigate("/marketing")}
              className="rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700"
            >
              العودة لنظام التسويق
            </button>

            <button
              type="button"
              onClick={() => setShowCreateBay(true)}
              className="rounded-xl bg-[#76517E] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-[#62416A]"
            >
              + إنشاء باكيات
            </button>
          </div>
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Create Multiple Bays                                             */}
        {/* ---------------------------------------------------------------- */}

        {showCreateBay && (
          <section className="rounded-2xl border border-purple-100 bg-white p-5 shadow-sm">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-[#192440]">
                  إنشاء مجموعة باكيات
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  حدد العدد، ثم اكتب اسم وعدد رفوف كل باكية.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateBay(false)}
                className="rounded-lg px-3 py-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
              >
                ✕ إغلاق
              </button>
            </div>

            <div className="mb-5 grid gap-4 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  عدد الباكيات المراد إنشاؤها
                </label>

                <input
                  type="number"
                  min="1"
                  max="50"
                  value={bayQuantity}
                  onChange={(event) =>
                    prepareBayDrafts(event.target.value)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#76517E]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  عدد الرفوف الافتراضي
                </label>

                <input
                  type="number"
                  min="1"
                  max="50"
                  value={defaultShelfCount}
                  onChange={(event) =>
                    setDefaultShelfCount(Number(event.target.value))
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#76517E]"
                />

                <button
                  type="button"
                  onClick={() =>
                    setBayDrafts((current) =>
                      current.map((draft) => ({
                        ...draft,
                        shelfCount: defaultShelfCount,
                      })),
                    )
                  }
                  className="mt-2 text-xs font-semibold text-[#76517E] hover:underline"
                >
                  تطبيق العدد على كل الباكيات
                </button>
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-gray-700">بيانات الباكيات</h3>

              <span className="text-xs text-gray-400">
                {bayDrafts.length} باكيات
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {bayDrafts.map((draft, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-gray-200 p-4"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-sm font-bold text-[#76517E]">
                      {index + 1}
                    </span>

                    <span className="font-bold text-[#192440]">
                      الباكية رقم {index + 1}
                    </span>
                  </div>

                  <label className="mb-1 block text-xs font-semibold text-gray-500">
                    اسم الباكية
                  </label>

                  <input
                    value={draft.name}
                    onChange={(event) =>
                      updateDraft(index, "name", event.target.value)
                    }
                    placeholder={`باكية ${index + 1}`}
                    className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#76517E]"
                  />

                  <label className="mb-1 block text-xs font-semibold text-gray-500">
                    عدد الرفوف
                  </label>

                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={draft.shelfCount}
                    onChange={(event) =>
                      updateDraft(index, "shelfCount", event.target.value)
                    }
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#76517E]"
                  />
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowCreateBay(false)}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-600"
              >
                إلغاء
              </button>

              <button
                type="button"
                onClick={createMultipleBays}
                className="rounded-xl bg-[#192440] px-6 py-3 text-sm font-bold text-white hover:bg-[#293958]"
              >
                إنشاء {bayDrafts.length} باكيات
              </button>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- */}
        {/* All Bays Overview                                                */}
        {/* ---------------------------------------------------------------- */}

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#192440]">
                معاينة جميع الباكيات
              </h2>

              <p className="mt-1 text-xs text-gray-400">
                كل باكية تظهر كمستطيل مستقل، والرفوف وتوزيع الشركات ظاهرين
                بداخلها.
              </p>
            </div>

            <span className="rounded-lg bg-purple-50 px-3 py-2 text-sm font-bold text-[#76517E]">
              {bays.length} باكية
            </span>
          </div>

          {bays.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center">
              <div className="mb-3 text-4xl">▤</div>

              <h3 className="font-bold text-gray-700">
                لا توجد باكيات حتى الآن
              </h3>

              <p className="mt-2 text-sm text-gray-400">
                أنشئ باكية واحدة أو مجموعة باكيات للبدء.
              </p>

              <button
                type="button"
                onClick={() => setShowCreateBay(true)}
                className="mt-4 rounded-xl bg-[#76517E] px-5 py-2.5 text-sm font-bold text-white"
              >
                إنشاء باكيات
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {bays.map((bay) => (
                <BayPreview
                  key={bay.id}
                  bay={bay}
                  active={selectedBayId === bay.id}
                  onClick={() => openBay(bay)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Bay Images Gallery                                               */}
        {/* ---------------------------------------------------------------- */}

        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-[#192440]">
                معرض صور الباكيات
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                أضف صورًا حقيقية لكل باكية واعرضها أسفل التصميمات.
              </p>
            </div>

            <span className="rounded-lg bg-purple-50 px-3 py-2 text-sm font-bold text-[#76517E]">
              {totalImages} صورة
            </span>
          </div>

          {/* Upload Controls */}

          <div className="mb-6 grid gap-4 rounded-xl bg-gray-50 p-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                اختر الباكية
              </label>

              <select
                value={selectedImageBayId}
                onChange={(event) =>
                  setSelectedImageBayId(event.target.value)
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#76517E]"
              >
                <option value="">اختر الباكية لإضافة الصور</option>

                {bays.map((bay) => (
                  <option key={bay.id} value={bay.id}>
                    {bay.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                رفع الصور
              </label>

              <label
                className={`flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-200 bg-white px-4 py-3 font-semibold text-[#76517E] transition hover:bg-purple-50 ${
                  !selectedImageBayId || uploadingImages
                    ? "cursor-not-allowed opacity-50"
                    : "cursor-pointer"
                }`}
              >
                <span className="text-xl">＋</span>

                {uploadingImages
                  ? "جاري تجهيز الصور..."
                  : "اختيار صور من الجهاز"}

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={!selectedImageBayId || uploadingImages}
                  onChange={handleBayImages}
                  className="hidden"
                />
              </label>

              <p className="mt-2 text-xs text-gray-400">
                يمكنك اختيار أكثر من صورة في نفس الوقت. الحد الأقصى
                لحجم الصورة الواحدة 15 ميجابايت قبل الضغط.
              </p>
            </div>
          </div>

          {/* Images By Bay */}

          {bays.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
              أنشئ باكية أولاً حتى تتمكن من إضافة الصور.
            </div>
          ) : (
            <div className="space-y-6">
              {bays.map((bay) => (
                <div
                  key={bay.id}
                  className="rounded-xl border border-gray-100 p-4"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-[#192440]">
                        {bay.name}
                      </h3>

                      <p className="mt-1 text-xs text-gray-400">
                        {(bay.images || []).length} صورة
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedImageBayId(bay.id)}
                      className="rounded-lg bg-purple-50 px-3 py-2 text-xs font-bold text-[#76517E] hover:bg-purple-100"
                    >
                      إضافة صور لهذه الباكية
                    </button>
                  </div>

                  {!bay.images?.length ? (
                    <div className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-400">
                      لا توجد صور مضافة لهذه الباكية حتى الآن.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                      {bay.images.map((image) => (
                        <div
                          key={image.id}
                          className="group overflow-hidden rounded-xl border border-gray-200 bg-white"
                        >
                          <div className="aspect-square overflow-hidden bg-gray-100">
                            <img
                              src={image.data}
                              alt={image.name || bay.name}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          </div>

                          <div className="p-2">
                            <p
                              className="truncate text-xs font-semibold text-gray-600"
                              title={image.name}
                            >
                              {image.name}
                            </p>

                            <button
                              type="button"
                              onClick={() =>
                                deleteBayImage(bay.id, image.id)
                              }
                              className="mt-2 w-full rounded-lg bg-red-50 px-2 py-2 text-xs font-semibold text-red-600 hover:bg-red-100"
                            >
                              حذف الصورة
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ---------------------------------------------------------------- */}
        {/* Bay Editor                                                       */}
        {/* ---------------------------------------------------------------- */}

        {selectedBay && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex-1">
                <label className="mb-2 block text-xs font-semibold text-gray-400">
                  اسم الباكية المحددة
                </label>

                <input
                  value={selectedBay.name}
                  onChange={(event) => updateBayName(event.target.value)}
                  className="w-full max-w-md border-b border-transparent bg-transparent py-1 text-xl font-bold text-[#192440] outline-none focus:border-[#76517E]"
                />

                <p className="mt-2 text-sm text-gray-500">
                  {selectedBay.shelves.length} رفوف
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => deleteBay(selectedBay.id)}
                  className="rounded-xl border border-red-100 px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"
                >
                  حذف الباكية
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedBayId(null);
                    setSelectedShelfId(null);
                  }}
                  className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600"
                >
                  إغلاق المحرر
                </button>
              </div>
            </div>

            {/* Shelf Navigation */}

            <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-bold text-[#192440]">
                  رفوف {selectedBay.name}
                </h2>

                <span className="text-xs text-gray-400">
                  اختر الرف للتعديل
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-8 lg:grid-cols-10">
                {selectedBay.shelves.map((shelf) => {
                  const active = selectedShelfId === shelf.id;
                  const total = getTotal(shelf);

                  const complete =
                    shelf.companies.length > 0 &&
                    Math.abs(total - 100) < 0.001;

                  return (
                    <button
                      type="button"
                      key={shelf.id}
                      onClick={() => setSelectedShelfId(shelf.id)}
                      className={`rounded-xl border p-3 text-center transition ${
                        active
                          ? "border-[#76517E] bg-purple-50 text-[#76517E]"
                          : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      <div className="text-xs">رف</div>

                      <div className="my-1 text-xl font-bold">
                        {shelf.number}
                      </div>

                      <div
                        className={`text-[10px] font-semibold ${
                          complete
                            ? "text-green-600"
                            : total > 100
                              ? "text-red-500"
                              : "text-gray-400"
                        }`}
                      >
                        {formatPercentage(total)}%
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Shelf */}

            {selectedShelf && (
              <div className="grid items-start gap-5 2xl:grid-cols-2">
                {/* Company Editor */}

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-[#192440]">
                        توزيع الشركات - الرف {selectedShelf.number}
                      </h2>

                      <p className="mt-1 text-xs text-gray-400">
                        اختر الشركات وحدد نسبة المساحة لكل شركة.
                      </p>
                    </div>

                    <span className="rounded-lg bg-purple-50 px-3 py-2 text-sm font-bold text-[#76517E]">
                      {selectedShelf.companies.length} شركات
                    </span>
                  </div>

                  <div className="mb-5">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      إضافة شركة / مورد
                    </label>

                    <SearchableSelect
                      endpoint="retail/suppliers/search"
                      value=""
                      onChange={(value, option) => {
                        if (value && option) addCompany(option);
                      }}
                      placeholder="ابحث عن الشركة / المورد..."
                      isClearable
                    />
                  </div>

                  {selectedShelf.companies.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 p-7 text-center">
                      <p className="font-semibold text-gray-600">
                        لم تتم إضافة شركات لهذا الرف
                      </p>

                      <p className="mt-1 text-xs text-gray-400">
                        ابحث عن الشركة من القائمة بالأعلى.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedShelf.companies.map((company, index) => (
                        <div
                          key={company.id}
                          className="rounded-xl border border-gray-100 p-3"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span
                                className="h-3 w-3 shrink-0 rounded"
                                style={{
                                  backgroundColor:
                                    COLORS[index % COLORS.length],
                                }}
                              />

                              <span className="truncate font-semibold text-gray-800">
                                {company.name}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => removeCompany(company.id)}
                              className="shrink-0 rounded-lg px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                            >
                              حذف
                            </button>
                          </div>

                          <div className="flex items-center gap-3">
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="1"
                              value={company.percentage}
                              onChange={(event) =>
                                updateCompanyPercentage(
                                  company.id,
                                  event.target.value,
                                )
                              }
                              className="min-w-0 flex-1 accent-[#76517E]"
                            />

                            <div className="relative w-24 shrink-0">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={company.percentage}
                                onChange={(event) =>
                                  updateCompanyPercentage(
                                    company.id,
                                    event.target.value,
                                  )
                                }
                                className="w-full rounded-lg border border-gray-200 py-2 pl-7 pr-3 text-center font-bold outline-none focus:border-[#76517E]"
                              />

                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                                %
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Percentage Summary */}

                  <div className="mt-5 rounded-xl bg-gray-50 p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-600">
                        إجمالي المساحة الموزعة
                      </span>

                      <span
                        className={`text-lg font-bold ${
                          isComplete
                            ? "text-green-600"
                            : totalPercentage > 100
                              ? "text-red-600"
                              : "text-[#76517E]"
                        }`}
                      >
                        {formatPercentage(totalPercentage)}%
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className={`h-full rounded-full transition-all ${
                          totalPercentage > 100
                            ? "bg-red-500"
                            : isComplete
                              ? "bg-green-500"
                              : "bg-[#76517E]"
                        }`}
                        style={{
                          width: `${Math.min(totalPercentage, 100)}%`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-xs text-gray-500">
                      {isComplete
                        ? "التوزيع مكتمل بنسبة 100%"
                        : totalPercentage > 100
                          ? "النسب تجاوزت 100%، راجع التوزيع"
                          : `متبقي ${formatPercentage(100 - totalPercentage)}% من مساحة الرف`}
                    </p>
                  </div>

                  {/* Shelf Navigation Buttons */}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      disabled={selectedShelf.number === 1}
                      onClick={() => goToShelf(-1)}
                      className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 disabled:opacity-30"
                    >
                      الرف السابق
                    </button>

                    <button
                      type="button"
                      disabled={
                        selectedShelf.number === selectedBay.shelfCount
                      }
                      onClick={() => goToShelf(1)}
                      className="rounded-xl bg-[#192440] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-30"
                    >
                      الرف التالي ←
                    </button>
                  </div>
                </div>

                {/* Shelf Preview */}

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="mb-5">
                    <h2 className="text-lg font-bold text-[#192440]">
                      معاينة الرف
                    </h2>

                    <p className="mt-1 text-xs text-gray-400">
                      شكل توزيع الشركات ونسب المساحة.
                    </p>
                  </div>

                  <div className="rounded-2xl border-2 border-gray-300 bg-[#F8F9FC] p-3">
                    <div className="mb-3 rounded-lg bg-[#192440] p-3 text-center text-sm font-bold text-white">
                      {selectedBay.name} - الرف {selectedShelf.number}
                    </div>

                    <div className="flex min-h-42.5 overflow-hidden rounded-lg border-2 border-[#D4D9E3] bg-white">
                      {selectedShelf.companies.length === 0 ? (
                        <div className="flex w-full items-center justify-center text-sm text-gray-400">
                          لا توجد شركات في هذا الرف
                        </div>
                      ) : (
                        selectedShelf.companies.map((company, index) => (
                          <div
                            key={company.id}
                            className="flex min-w-0 flex-col items-center justify-center gap-3 overflow-hidden border-l border-white/30 px-1 text-center text-white"
                            style={{
                              flex: `${Math.max(
                                Number(company.percentage) || 0,
                                0.5,
                              )} 1 0`,
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          >
                            <span className="wrap-break-word text-xs font-bold sm:text-sm">
                              {company.name}
                            </span>

                            <span className="text-lg font-extrabold">
                              {company.percentage}%
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-2 h-3 rounded-b-md bg-gray-400 shadow-inner" />
                  </div>

                  {/* Space Details */}

                  <div className="mt-5 space-y-3">
                    <h3 className="text-sm font-bold text-gray-700">
                      تفاصيل المساحات
                    </h3>

                    {selectedShelf.companies.map((company, index) => (
                      <div
                        key={company.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            className="h-3 w-3 shrink-0 rounded"
                            style={{
                              backgroundColor: COLORS[index % COLORS.length],
                            }}
                          />

                          <span className="truncate text-gray-600">
                            {company.name}
                          </span>
                        </div>

                        <span className="shrink-0 font-bold text-[#192440]">
                          {company.percentage}%
                        </span>
                      </div>
                    ))}

                    <div className="border-t border-gray-100 pt-3">
                      <div className="flex justify-between font-bold">
                        <span>الإجمالي</span>

                        <span
                          className={
                            isComplete
                              ? "text-green-600"
                              : "text-[#76517E]"
                          }
                        >
                          {formatPercentage(totalPercentage)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
