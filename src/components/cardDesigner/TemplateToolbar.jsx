export default function TemplateToolbar({
    saveTemplate,
    onPrint,
    onEdit,
    onDelete,
    onBack,
    savedTemplates = [],
    selectedSavedTemplateId,
    onSelectSavedTemplate,
    hasSelectedDesign,
    templatesLoading,
    templatesError,
    busy,
    error,
    notice,
    canPrintCard,
    canCreateDesign,
    canDeleteDesign,
}) {
    return (
        <div className="mb-5 rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
                <select
                    value={selectedSavedTemplateId}
                    onChange={(event) =>
                        onSelectSavedTemplate(event.target.value)
                    }
                    disabled={busy || templatesLoading}
                    className="min-w-52 rounded-lg border border-slate-300 bg-white px-4 py-2.5"
                >
                    <option value="">
                        {templatesLoading
                            ? "جارٍ تحميل التصميمات..."
                            : "اختر تصميمًا محفوظًا"}
                    </option>

                    {savedTemplates.map((design) => (
                        <option key={design.id} value={String(design.id)}>
                            {design.name}
                        </option>
                    ))}
                </select>

                {canCreateDesign && (
                    <button
                        type="button"
                        onClick={saveTemplate}
                        disabled={busy}
                        className="rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                    >
                        حفظ التصميم
                    </button>
                )}

                {canCreateDesign && (
                    <button
                        type="button"
                        onClick={onEdit}
                        disabled={busy || !hasSelectedDesign}
                        className="rounded-lg bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        تعديل التصميم
                    </button>
                )}

                {canDeleteDesign && (
                    <button
                        type="button"
                        onClick={onDelete}
                        disabled={busy || !hasSelectedDesign}
                        className="rounded-lg bg-red-600 px-5 py-2.5 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        حذف التصميم
                    </button>
                )}

                {canPrintCard && (
                    <button
                        type="button"
                        onClick={onPrint}
                        disabled={busy || templatesLoading}
                        className="rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                        طباعة بطاقة
                    </button>
                )}

                <button
                    type="button"
                    onClick={onBack}
                    disabled={busy}
                    className="rounded-lg bg-gray-600 px-5 py-2.5 font-semibold text-white hover:bg-gray-700 disabled:opacity-50"
                >
                    رجوع
                </button>
            </div>

            {templatesError && (
                <p className="mt-3 text-sm text-red-600">
                    {templatesError}
                </p>
            )}

            {error && (
                <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            {notice && (
                <p className="mt-3 text-sm text-green-600">{notice}</p>
            )}
        </div>
    );
}