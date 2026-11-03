
const ELEMENT_TYPES = [
    { type: "photo", label: "الصورة", x: 30, y: 30 },
    { type: "name", label: "اسم الموظف", x: 220, y: 80 },
    { type: "company_name", label: "الشركة", x: 220, y: 145 },
    { type: "date", label: "التاريخ", x: 220, y: 200 },
    { type: "code", label: "كود الموظف", x: 220, y: 245 },
    { type: "national_id_number", label: "الرقم القومي", x: 220, y: 290 },
    { type: "job", label: "الوظيفة", x: 220, y: 335 },
];

export default function ElementList({ elements, onAdd }) {
    const safeElements = Array.isArray(elements) ? elements : [];

    return (
        <section className="rounded-xl bg-white p-4 shadow">
            <h2 className="mb-2 text-lg font-bold">عناصر القالب</h2>

            <p className="mb-4 text-sm text-slate-500">
                يمكنك إضافة عنصر واحد فقط من كل نوع.
            </p>

            <div className="grid grid-cols-1 gap-3">
                {ELEMENT_TYPES.map((item) => {
                    const existingElement = safeElements.find(
                        (element) => element.type === item.type
                    );

                    const alreadyAdded = Boolean(existingElement);

                    return (
                        <button
                            key={item.type}
                            type="button"
                            onClick={() => onAdd(item.type)}
                            disabled={alreadyAdded}
                            className={`rounded-lg border p-3 text-right transition ${
                                alreadyAdded
                                    ? "cursor-not-allowed border-green-200 bg-green-50 text-green-700"
                                    : "border-slate-200 bg-white hover:border-orange-500 hover:bg-orange-50"
                            }`}
                        >
                            <span className="flex items-center justify-between gap-2">
                                <span className="font-semibold">
                                    {item.label}
                                </span>

                                <span className="text-xs">
                                    {alreadyAdded ? "تمت الإضافة ✓" : "+ إضافة"}
                                </span>
                            </span>

                            <span className="mt-1 block text-xs text-slate-500">
                                {alreadyAdded
                                    ? `X: ${existingElement.x}, Y: ${existingElement.y}`
                                    : `X: ${item.x}, Y: ${item.y}`}
                            </span>
                        </button>
                    );
                })}
            </div>
        </section>
    );
}
