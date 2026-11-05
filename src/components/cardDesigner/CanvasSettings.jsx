
export default function CanvasSettings({
    template,
    updateTemplate,
    updateSpacing,
    changeOrientation,
    canvasBackgroundImage,
    onCanvasBackgroundUpload,
    onRemoveCanvasBackground,
}) {
    const fields = [
        ["top", "أعلى"],
        ["right", "يمين"],
        ["bottom", "أسفل"],
        ["left", "يسار"],
    ];

    const renderSpacingEditor = (title, group) => (
        <fieldset className="rounded-xl border border-slate-200 p-3">
            <legend className="px-2 text-sm font-bold">{title}</legend>

            <div className="grid grid-cols-2 gap-3">
                {fields.map(([key, label]) => (
                    <label key={key} className="text-sm">
                        {label}
                        <input
                            type="number"
                            min="0"
                            value={template[group][key]}
                            onChange={(event) =>
                                updateSpacing(
                                    group,
                                    key,
                                    Math.max(0, Number(event.target.value) || 0)
                                )
                            }
                            className="mt-1 w-full rounded-lg border p-2"
                        />
                    </label>
                ))}
            </div>
        </fieldset>
    );

    return (
        <section className="rounded-xl bg-white p-4 shadow">
            <h2 className="mb-4 text-lg font-bold">إعدادات القالب</h2>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="text-sm font-semibold">
                    اسم القالب
                    <input
                        value={template.name}
                        maxLength={150}
                        onChange={(event) =>
                            updateTemplate("name", event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border p-2 font-normal"
                    />
                </label>

                <label className="text-sm font-semibold">
                    اتجاه الكارت
                    <select
                        value={
                            template.width >= template.height
                                ? "horizontal"
                                : "vertical"
                        }
                        onChange={(event) =>
                            changeOrientation(event.target.value)
                        }
                        className="mt-1 w-full rounded-lg border p-2 font-normal"
                    >
                        <option value="horizontal">أفقي</option>
                        <option value="vertical">رأسي</option>
                    </select>
                </label>

                <label className="text-sm font-semibold">
                    العرض (px)
                    <input
                        type="number"
                        min="100"
                        max="3000"
                        value={template.width}
                        onChange={(event) =>
                            updateTemplate(
                                "width",
                                Math.max(
                                    100,
                                    Math.min(3000, Number(event.target.value) || 100)
                                )
                            )
                        }
                        className="mt-1 w-full rounded-lg border p-2 font-normal"
                    />
                </label>

                <label className="text-sm font-semibold">
                    الارتفاع (px)
                    <input
                        type="number"
                        min="100"
                        max="3000"
                        value={template.height}
                        onChange={(event) =>
                            updateTemplate(
                                "height",
                                Math.max(
                                    100,
                                    Math.min(3000, Number(event.target.value) || 100)
                                )
                            )
                        }
                        className="mt-1 w-full rounded-lg border p-2 font-normal"
                    />
                </label>
            </div>

            {/* Temporary canvas background */}
            <div className="mt-4 rounded-xl border border-slate-200 p-3">
                <h3 className="mb-3 text-sm font-bold">
                    صورة خلفية الكارت (مؤقتة)
                </h3>

                <div className="flex flex-wrap items-center gap-3">
                    <label className="cursor-pointer rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600">
                        اختيار صورة
                        <input
                            type="file"
                            accept="image/*"
                            onChange={onCanvasBackgroundUpload}
                            className="hidden"
                        />
                    </label>

                    {canvasBackgroundImage && (
                        <button
                            type="button"
                            onClick={onRemoveCanvasBackground}
                            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                            إزالة الخلفية
                        </button>
                    )}

                    <span className="text-xs text-slate-500">
                        الصورة للمعاينة فقط ولن يتم حفظها مع القالب.
                    </span>
                </div>

                {canvasBackgroundImage && (
                    <div className="mt-3">
                        <img
                            src={canvasBackgroundImage}
                            alt="معاينة خلفية الكارت"
                            className="h-24 max-w-full rounded-lg border border-slate-200 object-contain"
                        />
                    </div>
                )}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {renderSpacingEditor("هوامش الكارت", "margins")}
                {renderSpacingEditor("الحشو الداخلي", "padding")}
            </div>
        </section>
    );
}
