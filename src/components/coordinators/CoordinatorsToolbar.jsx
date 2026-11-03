import SearchableSelect from "../SearchableSelect";

const JOBS = [
    { value: "", label: "كل الوظائف" },
    { value: "مندوب", label: "مندوب" },
    { value: "مندوبة", label: "مندوبة" },
    { value: "منسق", label: "منسق" },
    { value: "منسقة", label: "منسقة" },
];

export default function CoordinatorsToolbar({
    search,
    setSearch,
    job,
    setJob,
    filter,
    setFilter,

    company,
    setCompany,
    onFilterCompany,

    advertisingCompanyId,
    setAdvertisingCompanyId,
    onFilterAdvertisingCompany,

    branch,
    setBranch,
    onFilterBranch,

    onCreateCoordinator,
    onCreateException,
    onDeleteException,
    canAddCoordinator,
    canAddException,
    canDeleteException,
}) {
    const inputClasses =
        "w-full rounded-lg border border-gray-300 p-2.5 outline-none focus:border-orange-500";

    const buttonClasses =
        "shrink-0 rounded-lg bg-orange-600 px-4 py-2.5 text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50";

    const filterSectionClasses =
        "flex flex-col gap-2 sm:flex-row sm:items-end";

    return (
        <div className="mb-5 flex flex-col gap-4 rounded-xl bg-white p-4 shadow">

            {/* Main filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">

                {/* General search */}
                <div className="min-w-48 flex-1">
                    <label className="mb-1 block text-sm font-semibold">
                        البحث بالكود أو الاسم أو الهاتف
                    </label>

                    <input
                        type="text"
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="اكتب كلمة البحث..."
                        className={inputClasses}
                    />
                </div>

                {/* Job filter */}
                <div className="min-w-40">
                    <label className="mb-1 block text-sm font-semibold">
                        الوظيفة
                    </label>

                    <select
                        value={job}
                        onChange={(event) =>
                            setJob(event.target.value)
                        }
                        className={inputClasses}
                    >
                        {JOBS.map((item) => (
                            <option
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status filter */}
                <div className="min-w-44">
                    <label className="mb-1 block text-sm font-semibold">
                        الحالة
                    </label>

                    <select
                        value={filter}
                        onChange={(event) =>
                            setFilter(event.target.value)
                        }
                        className={inputClasses}
                    >
                        <option value="">الكل</option>

                        <option value="expired">
                            غير مفعل أو الشهادة منتهية
                        </option>
                    </select>
                </div>
            </div>

            {/* Company, advertising company and branch filters */}
            <div className="grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 md:grid-cols-3">

                {/* Supplier filter */}
                <div>
                    <label className="mb-1 block text-sm font-semibold">
                        البحث باسم الشركة
                    </label>

                    <div className={filterSectionClasses}>
                        <div className="min-w-0 flex-1">
                            <SearchableSelect
                                endpoint="retail/suppliers/search"
                                value={company}
                                onChange={setCompany}
                                placeholder="ابحث عن الشركة..."
                            />
                        </div>

                        <button
                            type="button"
                            onClick={onFilterCompany}
                            className={buttonClasses}
                        >
                            بحث
                        </button>
                    </div>
                </div>

                {/* Advertising company filter */}
                <div>
                    <label className="mb-1 block text-sm font-semibold">
                        شركة الدعاية
                    </label>

                    <div className={filterSectionClasses}>
                        <div className="min-w-0 flex-1">
                            <SearchableSelect
                                endpoint="advertising-companies/search"
                                value={advertisingCompanyId}
                                onChange={setAdvertisingCompanyId}
                                placeholder="ابحث عن شركة الدعاية..."
                            />
                        </div>

                        <button
                            type="button"
                            onClick={onFilterAdvertisingCompany}
                            className={buttonClasses}
                        >
                            بحث
                        </button>
                    </div>
                </div>

                {/* Branch filter */}
                <div>
                    <label className="mb-1 block text-sm font-semibold">
                        البحث بالفرع
                    </label>

                    <div className={filterSectionClasses}>
                        <div className="min-w-0 flex-1">
                            <SearchableSelect
                                endpoint="retail/branches/search"
                                value={branch}
                                onChange={setBranch}
                                placeholder="ابحث عن الفرع..."
                            />
                        </div>

                        <button
                            type="button"
                            onClick={onFilterBranch}
                            className={buttonClasses}
                        >
                            بحث
                        </button>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4">

                {canAddCoordinator && (
                    <button
                        type="button"
                        onClick={onCreateCoordinator}
                        className={buttonClasses}
                    >
                        إضافة منسق
                    </button>
                )}

                {canAddException && (
                    <button
                        type="button"
                        onClick={onCreateException}
                        className={buttonClasses}
                    >
                        إضافة استثناء
                    </button>
                )}

                {canDeleteException && (
                    <button
                        type="button"
                        onClick={onDeleteException}
                        className="shrink-0 rounded-lg bg-red-600 px-4 py-2.5 text-white transition hover:bg-red-700"
                    >
                        حذف استثناء
                    </button>
                )}
            </div>
        </div>
    );
}