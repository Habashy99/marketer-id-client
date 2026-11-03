
function UsersToolbar({
    searchCode,
    onSearchCodeChange,
    onSearch,
    onShowAll,
    onBack,
    onCreate,
    onGivePermission,
    onDeletePermission,
}) {
    return (
        <>
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-orange-600 sm:text-3xl">
                    إدارة المستخدمين
                </h1>

                <button
                    type="button"
                    onClick={onBack}
                    className="rounded-lg border border-gray-300 px-4 py-2 hover:bg-gray-100"
                >
                    العودة
                </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={onCreate}
                    className="rounded-lg bg-orange-600 px-4 py-3 font-medium text-white hover:bg-orange-700"
                >
                    + إضافة مستخدم
                </button>

                <button
                    type="button"
                    onClick={onGivePermission}
                    className="rounded-lg bg-green-600 px-4 py-3 font-medium text-white hover:bg-green-700"
                >
                    منح صلاحية
                </button>

                <button
                    type="button"
                    onClick={onDeletePermission}
                    className="rounded-lg bg-red-600 px-4 py-3 font-medium text-white hover:bg-red-700"
                >
                    حذف صلاحية
                </button>
            </div>

            <form
                onSubmit={onSearch}
                className="mt-6 flex flex-wrap gap-3"
            >
                <input
                    value={searchCode}
                    onChange={(e) => onSearchCodeChange(e.target.value)}
                    placeholder="ابحث بكود المستخدم"
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3"
                />

                <button
                    type="submit"
                    className="rounded-lg bg-slate-700 px-5 py-3 text-white hover:bg-slate-800"
                >
                    بحث
                </button>

                <button
                    type="button"
                    onClick={onShowAll}
                    className="rounded-lg border border-gray-300 bg-white px-5 py-3 hover:bg-gray-100"
                >
                    عرض الكل
                </button>
            </form>
        </>
    );
}

export default UsersToolbar;
