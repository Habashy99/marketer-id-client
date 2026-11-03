
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { getPhotoUrl } from "../../helpers/coordinatorHelpers";
import { sendHttpReq } from "../../lib/httpHandler";

import {
    SAMPLE_VALUES,
    getElementLabel,
} from "../../utils/templateUtils";

const TEMPLATES_ENDPOINT = "card-templates";
const PRINT_LOG_ENDPOINT = "printLog/createLog";

const PRINT_TYPES = [
    { value: "جديد", label: "جديد" },
    { value: "بدل فاقد", label: "بدل فاقد" },
];

const DEFAULT_CANVAS = {
    width: 856,
    height: 540,
    background: "#ffffff",
};

const DEFAULT_SPACING = {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
};

const DEFAULT_PADDING = {
    top: 15,
    right: 15,
    bottom: 15,
    left: 15,
};

/* -------------------------------------------------------
   General helpers
------------------------------------------------------- */

function parseObject(value) {
    if (typeof value === "string") {
        try {
            return parseObject(JSON.parse(value));
        } catch {
            return {};
        }
    }

    return value &&
        typeof value === "object" &&
        !Array.isArray(value)
        ? value
        : {};
}

function toFiniteNumber(value, fallback = 0) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return fallback;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : fallback;
}

function toPositiveDimension(value, fallback) {
    const number = toFiniteNumber(value, NaN);

    return Number.isFinite(number) && number > 0
        ? number
        : fallback;
}

function normalizeSpacing(value, fallback) {
    if (typeof value === "number") {
        return {
            top: value,
            right: value,
            bottom: value,
            left: value,
        };
    }

    const source = parseObject(value);

    return {
        top: toFiniteNumber(source.top, fallback.top),
        right: toFiniteNumber(source.right, fallback.right),
        bottom: toFiniteNumber(source.bottom, fallback.bottom),
        left: toFiniteNumber(source.left, fallback.left),
    };
}

function getTemplateSource(record) {
    const root = parseObject(record);
    const template = parseObject(root.template);

    if (Object.keys(template).length > 0) {
        return template;
    }

    const data = parseObject(root.data);
    const nestedTemplate = parseObject(data.template);

    if (Object.keys(nestedTemplate).length > 0) {
        return nestedTemplate;
    }

    if (Object.keys(data).length > 0) {
        return data;
    }

    return root;
}

/* -------------------------------------------------------
   Template normalization

   Keep all saved element coordinates in their original
   pixel dimensions.
------------------------------------------------------- */

function normalizeTemplate(record, index = 0) {
    const source = getTemplateSource(record);

    let design = parseObject(
        source.design ??
        source.template_design ??
        source.templateDesign
    );

    if (design.design) {
        design = parseObject(design.design);
    }

    const canvas = parseObject(design.canvas);

    const width = toPositiveDimension(
        canvas.width ?? design.width ?? source.width,
        DEFAULT_CANVAS.width
    );

    const height = toPositiveDimension(
        canvas.height ?? design.height ?? source.height,
        DEFAULT_CANVAS.height
    );

    const margins = normalizeSpacing(
        design.margins ?? source.margins,
        DEFAULT_SPACING
    );

    const padding = normalizeSpacing(
        design.padding ?? source.padding,
        DEFAULT_PADDING
    );

    const rawElements = Array.isArray(design.elements)
        ? design.elements
        : Array.isArray(source.elements)
            ? source.elements
            : [];

    const elements = rawElements.map(
        (rawElement, elementIndex) => {
            const element = parseObject(rawElement);

            return {
                ...element,

                id:
                    element.id ??
                    element.element_id ??
                    `template-${index}-element-${elementIndex}`,

                x: toFiniteNumber(element.x, 0),
                y: toFiniteNumber(element.y, 0),

                width: toPositiveDimension(element.width, 1),
                height: toPositiveDimension(element.height, 1),
            };
        }
    );

    return {
        ...source,

        id:
            source.id ??
            source.template_id ??
            `template-${index}`,

        name: source.name ?? "تصميم بدون اسم",

        width,
        height,
        margins,
        padding,
        elements,

        canvas: {
            ...canvas,
            width,
            height,
            background:
                canvas.background ??
                design.background ??
                DEFAULT_CANVAS.background,
        },
    };
}

function getTemplateKey(template) {
    return String(
        template?.id ??
        template?.template_id ??
        template?.name ??
        ""
    );
}

/* -------------------------------------------------------
   Coordinator values
------------------------------------------------------- */

function getCoordinatorValue(type, coordinator) {
    const photoUrl = getPhotoUrl(
        coordinator?.profile_picture
    );

    const values = {
        name: coordinator?.name,
        company_name: coordinator?.company_name,
        date: new Date().toLocaleDateString("en-GB"),
        code: coordinator?.code,
        national_id_number: coordinator?.national_id_number,
        job: coordinator?.job,

        photo: photoUrl,
        image: photoUrl,
        profile_picture: photoUrl,
    };

    return values[type];
}

function getElementValue(element, coordinator) {
    const value = getCoordinatorValue(
        element.type,
        coordinator
    );

    if (value !== undefined && value !== null) {
        return String(value);
    }

    return (
        element.value ??
        SAMPLE_VALUES[element.type] ??
        getElementLabel(element.type)
    );
}

function createPreviewTemplate(template, coordinator) {
    return {
        ...template,

        margins: { ...template.margins },
        padding: { ...template.padding },

        elements: template.elements.map((element) => ({
            ...element,
            value: getElementValue(element, coordinator),
        })),
    };
}

/* -------------------------------------------------------
   Printable element helpers
------------------------------------------------------- */

function isPhotoElement(element) {
    return [
        "photo",
        "image",
        "profile_picture",
    ].includes(
        String(element?.type ?? "").toLowerCase()
    );
}

function getElementStyle(element) {
    return {
        position: "absolute",

        left: `${toFiniteNumber(element.x, 0)}px`,
        top: `${toFiniteNumber(element.y, 0)}px`,

        width: `${toPositiveDimension(element.width, 1)}px`,
        height: `${toPositiveDimension(element.height, 1)}px`,

        boxSizing: "border-box",
        margin: 0,
        padding: 2,

        border: "none",
        outline: "none",
        boxShadow: "none",
        overflow: "hidden",

        background:
            element.backgroundColor ??
            element.background ??
            "transparent",

        color: element.color ?? "#000000",

        fontSize: `${toPositiveDimension(
            element.fontSize,
            16
        )}px`,

        fontFamily: element.fontFamily ?? "Arial, sans-serif",

        fontWeight:
            element.fontWeight ??
            (element.bold ? "bold" : "normal"),

        fontStyle: element.fontStyle ?? "normal",

        textAlign:
            element.textAlign ??
            element.align ??
            "right",

        textDecoration: element.textDecoration ?? "none",

        lineHeight: 1.3,
        whiteSpace: "pre-wrap",
        overflowWrap: "anywhere",

        printColorAdjust: "exact",
        WebkitPrintColorAdjust: "exact",
    };
}

/* -------------------------------------------------------
   Image loading helpers
------------------------------------------------------- */

function waitForImage(img) {
    if (!img.src) {
        return Promise.resolve();
    }

    if (img.complete) {
        return img.naturalWidth > 0
            ? Promise.resolve()
            : Promise.reject(
                new Error(`Failed to load image: ${img.src}`)
            );
    }

    return new Promise((resolve, reject) => {
        const handleLoad = () => {
            cleanup();
            resolve();
        };

        const handleError = () => {
            cleanup();
            reject(
                new Error(`Failed to load image: ${img.src}`)
            );
        };

        const cleanup = () => {
            img.removeEventListener("load", handleLoad);
            img.removeEventListener("error", handleError);
        };

        img.addEventListener("load", handleLoad, {
            once: true,
        });

        img.addEventListener("error", handleError, {
            once: true,
        });
    });
}

async function waitForImages(container) {
    const images = Array.from(
        container.querySelectorAll("img")
    );

    await Promise.all(images.map(waitForImage));
}

/* -------------------------------------------------------
   Card rendering
------------------------------------------------------- */

function PrintableCard({ design, coordinator }) {
    if (!design) return null;

    const width = toPositiveDimension(
        design.width,
        DEFAULT_CANVAS.width
    );

    const height = toPositiveDimension(
        design.height,
        DEFAULT_CANVAS.height
    );

    const elements = Array.isArray(design.elements)
        ? design.elements
        : [];

    const photoUrl = getPhotoUrl(
        coordinator?.profile_picture
    );

    return (
        <div
            className="coordinator-print-card"
            style={{
                position: "relative",

                width: `${width}px`,
                height: `${height}px`,

                boxSizing: "border-box",
                margin: 0,
                padding: 0,

                border: "none",
                outline: "none",
                boxShadow: "none",
                overflow: "hidden",

                background:
                    design.canvas?.background ??
                    design.design?.canvas?.background ??
                    DEFAULT_CANVAS.background,

                fontFamily: "Arial, sans-serif",
                direction: "ltr",

                flex: "none",

                printColorAdjust: "exact",
                WebkitPrintColorAdjust: "exact",
            }}
        >
            {elements.map((element, index) => {
                const photoElement = isPhotoElement(element);

                const elementWidth = toPositiveDimension(
                    element.width,
                    1
                );

                const elementHeight = toPositiveDimension(
                    element.height,
                    1
                );

                return (
                    <div
                        key={
                            element.id ??
                            element.element_id ??
                            `print-element-${index}`
                        }
                        className="coordinator-print-element"
                        style={{
                            ...getElementStyle(element),

                            position: "absolute",
                            left: `${toFiniteNumber(element.x, 0)}px`,
                            top: `${toFiniteNumber(element.y, 0)}px`,
                            width: `${elementWidth}px`,
                            height: `${elementHeight}px`,

                            boxSizing: "border-box",
                            margin: 0,
                            transform: "none",
                            float: "none",
                        }}
                    >
                        {photoElement ? (
                            photoUrl ? (
                                <img
                                    src={photoUrl}
                                    alt=""
                                    draggable={false}
                                    style={{
                                        display: "block",
                                        position: "static",
                                        width: "100%",
                                        height: "100%",
                                        maxWidth: "100%",
                                        maxHeight: "100%",
                                        margin: 0,
                                        padding: 0,
                                        border: "none",
                                        outline: "none",
                                        objectFit:
                                            element.objectFit ?? "cover",
                                    }}
                                />
                            ) : null
                        ) : (
                            getElementValue(element, coordinator)
                        )}
                    </div>
                );
            })}
        </div>
    );
}

/* -------------------------------------------------------
   Card preview

   Scale only the outer visual representation.
------------------------------------------------------- */

function CoordinatorCardPreview({
    design,
    coordinator,
    scale,
}) {
    if (!design) return null;

    const width = toPositiveDimension(
        design.width,
        DEFAULT_CANVAS.width
    );

    const height = toPositiveDimension(
        design.height,
        DEFAULT_CANVAS.height
    );

    return (
        <div
            style={{
                position: "relative",
                width: `${width * scale}px`,
                height: `${height * scale}px`,
                margin: "0 auto",
                overflow: "hidden",
                flex: "none",
            }}
        >
            <div
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,

                    width: `${width}px`,
                    height: `${height}px`,

                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                }}
            >
                <PrintableCard
                    design={design}
                    coordinator={coordinator}
                />
            </div>
        </div>
    );
}

/* -------------------------------------------------------
   Print coordinator modal
------------------------------------------------------- */

export default function PrintCoordinatorModal({
    coordinator,
    onClose,
}) {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] =
        useState("");

    const [printType, setPrintType] = useState("جديد");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [printBusy, setPrintBusy] = useState(false);

    const modalRef = useRef(null);
    const printAreaRef = useRef(null);
    const printInProgressRef = useRef(false);
    const afterPrintHandlerRef = useRef(null);
    const fallbackTimerRef = useRef(null);

    const selectedTemplate = useMemo(
        () =>
            templates.find(
                (template) =>
                    getTemplateKey(template) === selectedTemplateId
            ) ?? null,
        [templates, selectedTemplateId]
    );

    const previewTemplate = useMemo(() => {
        if (!selectedTemplate || !coordinator) {
            return null;
        }

        return createPreviewTemplate(
            selectedTemplate,
            coordinator
        );
    }, [selectedTemplate, coordinator]);

    const clearPrintResources = useCallback(() => {
        if (fallbackTimerRef.current) {
            window.clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
        }

        if (afterPrintHandlerRef.current) {
            window.removeEventListener(
                "afterprint",
                afterPrintHandlerRef.current
            );

            afterPrintHandlerRef.current = null;
        }

        document
            .getElementById("temporary-coordinator-print")
            ?.remove();

        printInProgressRef.current = false;
        setPrintBusy(false);
    }, []);

    const loadTemplates = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const response = await sendHttpReq(
                TEMPLATES_ENDPOINT
            );

            const result =
                typeof response?.json === "function"
                    ? await response.json()
                    : response;

            if (
                response &&
                typeof response.status === "number" &&
                response.ok === false
            ) {
                throw new Error(
                    result?.message ??
                    "تعذر تحميل تصميمات البطاقات."
                );
            }

            let records = Array.isArray(result)
                ? result
                : result?.templates ??
                result?.data?.templates ??
                result?.data ??
                result?.results ??
                [];

            if (!Array.isArray(records)) {
                const nested = parseObject(records);

                records = Array.isArray(nested.templates)
                    ? nested.templates
                    : Array.isArray(nested.results)
                        ? nested.results
                        : [];
            }

            if (!Array.isArray(records)) {
                throw new Error(
                    "استجابة السيرفر لا تحتوي على قائمة تصميمات صحيحة."
                );
            }

            const normalized = records.map(
                (record, index) =>
                    normalizeTemplate(record, index)
            );

            setTemplates(normalized);

            if (normalized.length > 0) {
                setSelectedTemplateId((currentId) => {
                    const stillExists = normalized.some(
                        (template) =>
                            getTemplateKey(template) === currentId
                    );

                    return stillExists
                        ? currentId
                        : getTemplateKey(normalized[0]);
                });

                setError("");
            } else {
                setSelectedTemplateId("");
                setError("لا توجد تصميمات محفوظة.");
            }
        } catch (err) {
            setTemplates([]);
            setSelectedTemplateId("");

            setError(
                err?.message ??
                "حدث خطأ أثناء تحميل تصميمات البطاقات."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTemplates();
    }, [loadTemplates]);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape" && !printBusy) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [onClose, printBusy]);

    useEffect(() => {
        return () => {
            if (fallbackTimerRef.current) {
                window.clearTimeout(fallbackTimerRef.current);
            }

            if (afterPrintHandlerRef.current) {
                window.removeEventListener(
                    "afterprint",
                    afterPrintHandlerRef.current
                );
            }

            document
                .getElementById("temporary-coordinator-print")
                ?.remove();
        };
    }, []);

    const previewScale = useMemo(() => {
        if (!previewTemplate) {
            return 1;
        }

        const maxPreviewWidth = 700;
        const maxPreviewHeight = 450;

        const width = toPositiveDimension(
            previewTemplate.width,
            DEFAULT_CANVAS.width
        );

        const height = toPositiveDimension(
            previewTemplate.height,
            DEFAULT_CANVAS.height
        );

        return Math.min(
            1,
            maxPreviewWidth / width,
            maxPreviewHeight / height
        );
    }, [previewTemplate]);

    /* ---------------------------------------------------
       Log a print using the selected print type.

       The backend must determine created_by from req.user.code.
       Do not send created_by from the frontend.
    --------------------------------------------------- */

    const savePrintLog = useCallback(async () => {
        if (!coordinator?.code) {
            throw new Error(
                "كود المندوب أو المنسق غير موجود."
            );
        }

        const response = await sendHttpReq(
            PRINT_LOG_ENDPOINT,
            "POST",
            {
                code: String(coordinator.code),
                name: String(coordinator.name ?? ""),
                type: printType,
            }
        );

        const result =
            typeof response?.json === "function"
                ? await response.json()
                : response;

        if (
            response &&
            typeof response.status === "number" &&
            response.ok === false
        ) {
            throw new Error(
                result?.message ??
                "تعذر تسجيل عملية الطباعة."
            );
        }

        if (result?.success === false) {
            throw new Error(
                result?.message ??
                "تعذر تسجيل عملية الطباعة."
            );
        }

        return result;
    }, [coordinator, printType]);

    /* ---------------------------------------------------
       Print handler
    --------------------------------------------------- */

    const handlePrint = async () => {
        if (
            !previewTemplate ||
            !printAreaRef.current ||
            printInProgressRef.current
        ) {
            return;
        }

        if (!PRINT_TYPES.some((item) => item.value === printType)) {
            setError("اختر نوع الطباعة.");
            return;
        }

        if (!coordinator?.code) {
            setError("كود المندوب أو المنسق غير موجود.");
            return;
        }

        printInProgressRef.current = true;
        setPrintBusy(true);
        setError("");

        let printContainer = null;
        let printFinished = false;

        const finishPrint = () => {
            if (printFinished) return;

            printFinished = true;

            if (fallbackTimerRef.current) {
                window.clearTimeout(fallbackTimerRef.current);
                fallbackTimerRef.current = null;
            }

            if (afterPrintHandlerRef.current) {
                window.removeEventListener(
                    "afterprint",
                    afterPrintHandlerRef.current
                );

                afterPrintHandlerRef.current = null;
            }

            printContainer?.remove();
            printContainer = null;

            printInProgressRef.current = false;
            setPrintBusy(false);
        };

        const handleAfterPrint = async () => {
            if (printFinished) return;

            if (afterPrintHandlerRef.current) {
                window.removeEventListener(
                    "afterprint",
                    afterPrintHandlerRef.current
                );

                afterPrintHandlerRef.current = null;
            }

            if (fallbackTimerRef.current) {
                window.clearTimeout(fallbackTimerRef.current);
                fallbackTimerRef.current = null;
            }

            try {
                const confirmed = window.confirm(
                    "هل تمت طباعة البطاقة بنجاح؟"
                );

                if (!confirmed) {
                    return;
                }

                await savePrintLog();

                setError("");
                window.alert("تم تسجيل عملية الطباعة بنجاح.");
            } catch (err) {
                setError(
                    err?.message ??
                    "حدث خطأ أثناء تسجيل عملية الطباعة."
                );
            } finally {
                finishPrint();
            }
        };

        try {
            const originalCard =
                printAreaRef.current.querySelector(
                    ".coordinator-print-card"
                );

            if (!originalCard) {
                throw new Error(
                    "لم يتم العثور على تصميم البطاقة."
                );
            }

            // Clone the card without moving React's original DOM.
            printContainer = document.createElement("div");
            printContainer.id = "temporary-coordinator-print";


            Object.assign(printContainer.style, {
                position: "fixed",
                left: "-100000px",
                top: "0",
                width: `${previewTemplate.width}px`,
                height: `${previewTemplate.height}px`,
                margin: "0",
                padding: "0",
                background: "#ffffff",
                zIndex: "-1",
            });


            printContainer.appendChild(
                originalCard.cloneNode(true)
            );

            // Hide the application UI only while printing.
            const printStyle = document.createElement("style");

            printStyle.id = "temporary-coordinator-print-style";

            printStyle.textContent = `
    @page {
        size: auto;
        margin: 0;
    }

    @media print {
        html,
        body {
            width: 100% !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
        }

        body * {
            visibility: hidden !important;
        }

        #temporary-coordinator-print,
        #temporary-coordinator-print * {
            visibility: visible !important;
        }

        #temporary-coordinator-print {
            position: fixed !important;
            inset: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            width: 100% !important;
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            overflow: visible !important;
            background: white !important;
        }

        #temporary-coordinator-print .coordinator-print-card {
            position: relative !important;
            flex: 0 0 auto !important;
            margin: 0 !important;
            transform: none !important;
            box-shadow: none !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
        }
    }
`;

            document.head.appendChild(printStyle);
            document.body.appendChild(printContainer);

            await waitForImages(printContainer);

            if (document.fonts?.ready) {
                await document.fonts.ready;
            }

            await new Promise((resolve) => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(resolve);
                });
            });

            afterPrintHandlerRef.current = handleAfterPrint;

            window.addEventListener(
                "afterprint",
                handleAfterPrint,
                { once: true }
            );

            window.print();

            // Fallback: prevent the UI from remaining locked forever
            // if the browser does not fire afterprint.
            fallbackTimerRef.current = window.setTimeout(() => {
                if (!printFinished) {
                    finishPrint();
                }
            }, 120000);
        } catch (err) {
            finishPrint();

            setError(
                err?.message ??
                "تعذر تجهيز البطاقة للطباعة."
            );
        }
    };

    /* ---------------------------------------------------
       Render
    --------------------------------------------------- */

    return (
        <>
            <div
                ref={modalRef}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6"
                onMouseDown={(event) => {
                    if (
                        event.target === event.currentTarget &&
                        !printBusy
                    ) {
                        onClose();
                    }
                }}
            >
                <section
                    dir="rtl"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="print-coordinator-title"
                    className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                >
                    <header className="flex items-center justify-between border-b px-5 py-4">
                        <h2
                            id="print-coordinator-title"
                            className="text-xl font-bold text-slate-800"
                        >
                            طباعة بطاقة مندوب أو منسق
                        </h2>

                        <button
                            type="button"
                            onClick={onClose}
                            disabled={printBusy}
                            aria-label="إغلاق"
                            className="rounded-lg px-3 py-1 text-2xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                        >
                            ×
                        </button>
                    </header>

                    <div className="space-y-5 p-5">
                        {/* Coordinator information */}
                        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                            <p className="font-semibold text-slate-800">
                                {coordinator?.name ?? "—"}
                            </p>

                            <p className="mt-1 text-sm text-slate-600">
                                الكود: {coordinator?.code ?? "—"}

                                {coordinator?.job
                                    ? ` — ${coordinator.job}`
                                    : ""}
                            </p>
                        </div>

                        {/* Loading state */}
                        {loading ? (
                            <p className="py-10 text-center text-slate-500">
                                جارٍ تحميل التصميمات...
                            </p>
                        ) : templates.length === 0 ? (
                            <div className="space-y-4 rounded-xl bg-red-50 p-4 text-red-700">
                                <p role="alert">{error}</p>

                                <button
                                    type="button"
                                    onClick={loadTemplates}
                                    className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                                >
                                    إعادة المحاولة
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Template selector */}
                                <div className="space-y-2">
                                    <label
                                        htmlFor="print-template-select"
                                        className="block font-semibold text-slate-700"
                                    >
                                        اختر تصميم البطاقة
                                    </label>

                                    <select
                                        id="print-template-select"
                                        value={selectedTemplateId}
                                        disabled={printBusy}
                                        onChange={(event) => {
                                            setSelectedTemplateId(
                                                event.target.value
                                            );

                                            setError("");
                                        }}
                                        className="w-full rounded-lg border border-slate-300 bg-white p-3 disabled:bg-slate-100"
                                    >
                                        {templates.map((template) => (
                                            <option
                                                key={getTemplateKey(template)}
                                                value={getTemplateKey(template)}
                                            >
                                                {template.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Card preview */}
                                <h3 className="font-semibold text-slate-700">
                                    معاينة البطاقة
                                </h3>

                                {previewTemplate && (
                                    <div className="overflow-auto rounded-xl border bg-slate-100 p-4">
                                        <CoordinatorCardPreview
                                            design={previewTemplate}
                                            coordinator={coordinator}
                                            scale={previewScale}
                                        />
                                    </div>
                                )}

                                {/* Print type selector */}
                                <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                                    <label
                                        htmlFor="print-type"
                                        className="mb-2 block font-semibold text-slate-800"
                                    >
                                        نوع الطباعة
                                    </label>

                                    <select
                                        id="print-type"
                                        value={printType}
                                        disabled={printBusy}
                                        onChange={(event) => {
                                            setPrintType(
                                                event.target.value
                                            );

                                            setError("");
                                        }}
                                        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                                    >
                                        {PRINT_TYPES.map((type) => (
                                            <option
                                                key={type.value}
                                                value={type.value}
                                            >
                                                {type.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Error message */}
                                {error && (
                                    <p
                                        role="alert"
                                        className="text-sm text-red-600"
                                    >
                                        {error}
                                    </p>
                                )}

                                {/* Action buttons */}
                                <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
                                    <button
                                        type="button"
                                        onClick={onClose}
                                        disabled={printBusy}
                                        className="rounded-lg border border-slate-300 px-5 py-3 hover:bg-slate-50 disabled:opacity-50"
                                    >
                                        إلغاء
                                    </button>

                                    <button
                                        type="button"
                                        onClick={handlePrint}
                                        disabled={
                                            printBusy ||
                                            !previewTemplate
                                        }
                                        className="rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
                                    >
                                        {printBusy
                                            ? "جارٍ تجهيز البطاقة..."
                                            : "طباعة البطاقة"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </section>
            </div>

            {/* Hidden card source used for printing */}
            {previewTemplate && (
                <div
                    ref={printAreaRef}
                    aria-hidden="true"
                    style={{
                        position: "fixed",
                        left: "-100000px",
                        top: 0,
                        width: `${previewTemplate.width}px`,
                        height: `${previewTemplate.height}px`,
                        overflow: "hidden",
                        pointerEvents: "none",
                    }}
                >
                    <PrintableCard
                        design={previewTemplate}
                        coordinator={coordinator}
                    />
                </div>
            )}
        </>
    );
}
