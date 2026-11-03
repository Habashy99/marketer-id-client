
const SAMPLE_VALUES = {
    name: "اسم الموظف",
    company_name: "جملة ماركت",
    date: "2026-10-25",
    code: "1001",
    national_id_number: "00000000000000",
    job: "مندوب",
};

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

export default function CardPreview({
    template,
    previewScale,
    selectedId,
    setSelectedId,
    drag,
    setDrag,
    setCanvasResize,
}) {
    return (
        <section className="print-card-only rounded-xl bg-white p-4 shadow">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 no-print">
                <h2 className="text-lg font-bold">معاينة الكارت</h2>

                <span className="text-xs text-slate-500">
                    {template.width} × {template.height} px
                </span>
            </div>

            <div className="overflow-auto rounded-lg bg-slate-800 p-4">
                <div
                    className="print-preview-frame"
                    style={{
                        width: template.width * previewScale,
                        height: template.height * previewScale,
                        margin: "0 auto",
                    }}
                >
                    <div
                        className="print-card-canvas"
                        style={{
                            position: "relative",
                            width: template.width,
                            height: template.height,
                            transform: `scale(${previewScale})`,
                            transformOrigin: "top left",
                            background: "#ffffff",
                            overflow: "hidden",
                            boxShadow: "0 4px 20px #0004",
                        }}
                    >
                        <div
                            style={{
                                position: "absolute",
                                inset: `${template.margins.top}px ${template.margins.right}px ${template.margins.bottom}px ${template.margins.left}px`,
                                border: "1px dashed #f97316",
                                pointerEvents: "none",
                            }}
                        />

                        <div
                            style={{
                                position: "absolute",
                                top: template.padding.top,
                                right: template.padding.right,
                                bottom: template.padding.bottom,
                                left: template.padding.left,
                                border: "1px dashed #94a3b8",
                                pointerEvents: "none",
                            }}
                        />

                        {template.elements.map((element) => (
                            <div
                                key={element.id}
                                onMouseDown={(event) => {
                                    if (event.button !== 0) return;

                                    event.preventDefault();
                                    setSelectedId(element.id);

                                    setDrag({
                                        id: element.id,
                                        startX: event.clientX,
                                        startY: event.clientY,
                                        elementX: element.x,
                                        elementY: element.y,
                                        elementWidth: element.width,
                                        elementHeight: element.height,
                                        scale: previewScale,
                                    });
                                }}
                                style={{
                                    position: "absolute",
                                    left: element.x,
                                    top: element.y,
                                    width: element.width,
                                    height: element.height,
                                    boxSizing: "border-box",
                                    border:
                                        selectedId === element.id
                                            ? "2px solid #f97316"
                                            : "1px dashed #cbd5e1",
                                    color: element.color,
                                    fontSize: element.fontSize,
                                    fontFamily: "Arial, sans-serif",
                                    lineHeight: 1.3,
                                    whiteSpace: "pre-wrap",
                                    overflow: "hidden",
                                    overflowWrap: "anywhere",
                                    cursor:
                                        drag?.id === element.id
                                            ? "grabbing"
                                            : "grab",
                                    padding: 2,
                                    userSelect: "none",
                                }}
                            >
                                {element.type === "photo"
                                    ? "الصورة"
                                    : element.value ??
                                      SAMPLE_VALUES[element.type] ??
                                      getElementLabel(element.type)}
                            </div>
                        ))}

                        {/* Independent width handle */}
                        <div
                            title="اسحب لتغيير عرض الكارت"
                            className="no-print"
                            onMouseDown={(event) => {
                                if (event.button !== 0) return;

                                event.preventDefault();
                                event.stopPropagation();

                                setCanvasResize({
                                    axis: "width",
                                    startX: event.clientX,
                                    startY: event.clientY,
                                    startWidth: template.width,
                                    startHeight: template.height,
                                    scale: previewScale,
                                });
                            }}
                            style={{
                                position: "absolute",
                                right: 0,
                                top: "50%",
                                transform: "translateY(-50%)",
                                width: 12,
                                height: 48,
                                background: "#f97316",
                                border: "2px solid white",
                                cursor: "ew-resize",
                                zIndex: 20,
                            }}
                        />

                        {/* Independent height handle */}
                        <div
                            title="اسحب لتغيير ارتفاع الكارت"
                            className="no-print"
                            onMouseDown={(event) => {
                                if (event.button !== 0) return;

                                event.preventDefault();
                                event.stopPropagation();

                                setCanvasResize({
                                    axis: "height",
                                    startX: event.clientX,
                                    startY: event.clientY,
                                    startWidth: template.width,
                                    startHeight: template.height,
                                    scale: previewScale,
                                });
                            }}
                            style={{
                                position: "absolute",
                                left: "50%",
                                bottom: 0,
                                transform: "translateX(-50%)",
                                width: 48,
                                height: 12,
                                background: "#f97316",
                                border: "2px solid white",
                                cursor: "ns-resize",
                                zIndex: 20,
                            }}
                        />
                    </div>
                </div>
            </div>

            <p className="mt-3 text-xs text-slate-500 no-print">
                اسحب العنصر بالماوس لتغيير مكانه. يمكنك أيضًا
                تحديده وتعديل X وY يدويًا. الإطار البرتقالي
                يحدد العنصر المختار.
            </p>
        </section>
    );
}
