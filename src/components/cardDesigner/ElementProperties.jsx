
const ELEMENT_TYPES = [
    { type: "photo", label: "الصورة" },
    { type: "name", label: "اسم الموظف" },
    { type: "company_name", label: "الشركة" },
    { type: "date", label: "التاريخ" },
    { type: "code", label: "كود الموظف" },
    { type: "national_id_number", label: "الرقم القومي" },
    { type: "job", label: "الوظيفة" },
];

function getElementLabel(type) {
    return ELEMENT_TYPES.find((item) => item.type === type)?.label ?? type;
}

export default function ElementProperties({
    selectedElement,
    updateElement,
    removeElement,
}) {
    return (
        <section className="rounded-xl bg-white p-4 shadow">
            <h2 className="mb-4 text-lg font-bold">خصائص العنصر</h2>

            {!selectedElement ? (
                <p className="text-sm text-slate-500">
                    اختر عنصرًا من المعاينة أو قائمة العناصر لتعديل خصائصه.
                </p>
            ) : (
                <>
                    <div className="mb-4 rounded-lg bg-orange-50 p-3">
                        <p className="font-bold text-orange-700">
                            {getElementLabel(selectedElement.type)}
                        </p>
                    </div>

                    {selectedElement.type !== "photo" && (
                        <label className="mb-4 block text-sm font-semibold">
                            قيمة العنصر
                            <input
                                type="text"
                                value={selectedElement.value ?? ""}
                                onChange={(event) =>
                                    updateElement("value", event.target.value)
                                }
                                placeholder={`اكتب ${getElementLabel(selectedElement.type)}`}
                                className="mt-1 w-full rounded-lg border p-2 font-normal"
                            />
                        </label>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        {[
                            ["x", "الموقع X"],
                            ["y", "الموقع Y"],
                            ["width", "العرض"],
                            ["height", "الارتفاع"],
                        ].map(([key, label]) => (
                            <label
                                key={key}
                                className="text-sm font-semibold"
                            >
                                {label}
                                <input
                                    type="number"
                                    min={
                                        key === "width" || key === "height"
                                            ? 1
                                            : 0
                                    }
                                    value={selectedElement[key]}
                                    onChange={(event) =>
                                        updateElement(
                                            key,
                                            Math.max(
                                                key === "width" ||
                                                    key === "height"
                                                    ? 1
                                                    : 0,
                                                Number(event.target.value) || 0
                                            )
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border p-2 font-normal"
                                />
                            </label>
                        ))}
                    </div>

                    {selectedElement.type !== "photo" && (
                        <div className="mt-4 space-y-3">
                            <label className="block text-sm font-semibold">
                                اللون
                                <input
                                    type="color"
                                    value={selectedElement.color}
                                    onChange={(event) =>
                                        updateElement("color", event.target.value)
                                    }
                                    className="mt-1 h-10 w-full rounded-lg border p-1"
                                />
                            </label>

                            <label className="block text-sm font-semibold">
                                حجم الخط
                                <input
                                    type="number"
                                    min="1"
                                    max="200"
                                    value={selectedElement.fontSize}
                                    onChange={(event) =>
                                        updateElement(
                                            "fontSize",
                                            Math.max(
                                                1,
                                                Math.min(
                                                    200,
                                                    Number(event.target.value) || 1
                                                )
                                            )
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border p-2 font-normal"
                                />
                            </label>

                            <label className="block text-sm font-semibold">
                                أقصى عدد أسطر
                                <input
                                    type="number"
                                    min="1"
                                    max="20"
                                    value={selectedElement.maxLines}
                                    onChange={(event) =>
                                        updateElement(
                                            "maxLines",
                                            Math.max(
                                                1,
                                                Math.min(
                                                    20,
                                                    Number(event.target.value) || 1
                                                )
                                            )
                                        )
                                    }
                                    className="mt-1 w-full rounded-lg border p-2 font-normal"
                                />
                            </label>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={removeElement}
                        className="mt-5 w-full rounded-lg border border-red-300 px-4 py-2 text-red-600 hover:bg-red-50"
                    >
                        حذف العنصر
                    </button>
                </>
            )}
        </section>
    );
}
