
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import Header from "../../../components/header";
import { sendHttpReq } from "../../../lib/httpHandler";
import { API_BASE_URL } from "../../../lib/apiBase.js";
import { createId } from "../../../utils/uuid.js";
import { useAuth } from "../../../context/authContext";
import { hasPermission } from "../../../helpers/permissions";

import CanvasSettings from "../../../components/cardDesigner/CanvasSettings";
import CardPreview from "../../../components/cardDesigner/CardPreview";
import ElementList from "../../../components/cardDesigner/ElementList";
import ElementProperties from "../../../components/cardDesigner/ElementProperties";
import TemplateToolbar from "../../../components/cardDesigner/TemplateToolbar";

const TEMPLATES_ENDPOINT = "card-templates";
const COORDINATOR_ENDPOINT = "coordinators/by-code";
const PRINT_LOG_ENDPOINT = "printLog/createLog";

const PRINT_TYPES = [
    { value: "جديد", label: "جديد" },
    { value: "بدل فاقد", label: "بدل فاقد" },
];

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

const ELEMENT_TYPES = [
    { type: "photo", label: "الصورة", x: 30, y: 30 },
    { type: "name", label: "اسم الموظف", x: 220, y: 80 },
    { type: "company_name", label: "الشركة", x: 220, y: 145 },
    { type: "date", label: "التاريخ", x: 220, y: 200 },
    { type: "code", label: "كود الموظف", x: 220, y: 245 },
    {
        type: "national_id_number",
        label: "الرقم القومي",
        x: 220,
        y: 290,
    },
    { type: "job", label: "الوظيفة", x: 220, y: 335 },
];

const SAMPLE_VALUES = {
    name: "اسم الموظف",
    company_name: "جملة ماركت",
    date: new Date().toLocaleDateString("en-CA"),
    code: "1001",
    national_id_number: "00000000000000",
    job: "مندوب",
};

function createElement(type) {
    const definition = ELEMENT_TYPES.find((item) => item.type === type);

    if (!definition) {
        throw new Error(`Unknown element type: ${type}`);
    }

    const isPhoto = type === "photo";

    return {
        id: createId(),
        type,
        value: SAMPLE_VALUES[type] ?? definition.label,
        x: definition.x,
        y: definition.y,
        width: isPhoto ? 150 : 250,
        height: isPhoto ? 180 : 45,
        color: "#000000",
        fontSize: 22,
        maxLines: type === "name" ? 2 : 1,
    };
}

const DEFAULT_TEMPLATE = {
    name: "Employee Card",
    width: 856,
    height: 540,
    margins: { ...DEFAULT_SPACING },
    padding: { ...DEFAULT_PADDING },
    elements: [
        { ...createElement("photo"), width: 150, height: 180 },
        { ...createElement("name"), width: 300, height: 50, fontSize: 24 },
        {
            ...createElement("company_name"),
            width: 300,
            height: 40,
            fontSize: 20,
        },
        { ...createElement("code"), width: 200, height: 35, fontSize: 18 },
    ],
};

function cloneDefaultTemplate() {
    return {
        ...DEFAULT_TEMPLATE,
        margins: { ...DEFAULT_TEMPLATE.margins },
        padding: { ...DEFAULT_TEMPLATE.padding },
        elements: DEFAULT_TEMPLATE.elements.map((element) => ({
            ...element,
            id: createId(),
        })),
    };
}

function getErrorMessage(error, fallback) {
    return error?.message || fallback;
}

function normalizeDesign(record) {
    let design = record?.design ?? record?.template ?? record;

    if (typeof design === "string") {
        try {
            design = JSON.parse(design);
        } catch {
            throw new Error("بيانات تصميم البطاقة المحفوظ غير صحيحة.");
        }
    }

    if (!design || typeof design !== "object") {
        throw new Error("بيانات تصميم البطاقة غير صحيحة.");
    }

    const canvas = design.canvas ?? {};
    const width = Number(canvas.width ?? design.width ?? 856);
    const height = Number(canvas.height ?? design.height ?? 540);
    const elements = design.elements;

    if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0 ||
        !Array.isArray(elements)
    ) {
        throw new Error("تصميم البطاقة لا يحتوي على بيانات صحيحة.");
    }

    return {
        id:
            record?.id ??
            record?.template_id ??
            record?.card_template_id ??
            design.id,
        name: record?.name ?? design.name ?? "تصميم بطاقة",
        design: {
            ...design,
            canvas: {
                ...canvas,
                width,
                height,
                background: canvas.background ?? "#ffffff",
            },
            margins: design.margins ?? { ...DEFAULT_SPACING },
            padding: design.padding ?? { ...DEFAULT_PADDING },
            elements: elements.map((element, index) => ({
                ...element,
                id: element.id ?? `saved-element-${index}`,
                x: Number(element.x ?? 0),
                y: Number(element.y ?? 0),
                width: Number(element.width ?? 100),
                height: Number(element.height ?? 30),
                fontSize: Number(element.fontSize ?? 18),
                color: element.color ?? "#000000",
            })),
        },
    };
}

function getCoordinatorValue(coordinator, type) {
    const values = {
        name: coordinator?.name,
        company_name: coordinator?.company_name,
        code: coordinator?.code,
        job: coordinator?.job,
        national_id_number: coordinator?.national_id_number,
        date: new Date().toLocaleDateString("en-CA"),
    };

    return Object.prototype.hasOwnProperty.call(values, type)
        ? values[type] ?? ""
        : "";
}

function getPhotoUrl(coordinator) {
    const photoPath =
        coordinator?.profile_picture ??
        coordinator?.profile_picture_path ??
        coordinator?.profilePicture ??
        coordinator?.picture ??
        "";

    if (!photoPath) return "";

    if (/^https?:\/\//i.test(String(photoPath))) {
        return String(photoPath);
    }

    return `${API_BASE_URL}/coordinators/photo?path=${encodeURIComponent(
        photoPath
    )}`;
}

function CardArtwork({ design, coordinator }) {
    const canvas = design?.canvas ?? {};
    const elements = Array.isArray(design?.elements)
        ? design.elements
        : [];

    const width = Number(canvas.width ?? 856);
    const height = Number(canvas.height ?? 540);
    const background = canvas.background ?? "#ffffff";
    const photoUrl = getPhotoUrl(coordinator);

    return (
        <div
            className="card-artwork"
            dir="rtl"
            style={{
                position: "relative",
                width: `${width}px`,
                height: `${height}px`,
                maxWidth: "none",
                overflow: "hidden",
                background,
                fontFamily: "Arial, sans-serif",
                printColorAdjust: "exact",
                WebkitPrintColorAdjust: "exact",
            }}
        >
            {elements.map((element, index) => {
                const isPhoto = element.type === "photo";
                const value = getCoordinatorValue(
                    coordinator,
                    element.type
                );

                const displayedValue =
                    value !== "" ? value : element.value ?? "";

                return (
                    <div
                        key={element.id ?? index}
                        style={{
                            position: "absolute",
                            left: `${element.x}px`,
                            top: `${element.y}px`,
                            width: `${element.width}px`,
                            height: `${element.height}px`,
                            boxSizing: "border-box",
                            overflow: "hidden",
                            color: element.color ?? "#000000",
                            fontSize: `${element.fontSize ?? 18}px`,
                            fontFamily:
                                element.fontFamily ?? "Arial, sans-serif",
                            fontWeight: element.fontWeight ?? "normal",
                            textAlign: element.textAlign ?? "right",
                            lineHeight: 1.3,
                            whiteSpace: "pre-wrap",
                            overflowWrap: "anywhere",
                            padding: "2px",
                        }}
                    >
                        {isPhoto ? (
                            photoUrl ? (
                                <img
                                    src={photoUrl}
                                    alt="Coordinator"
                                    style={{
                                        display: "block",
                                        width: "100%",
                                        height: "100%",
                                        objectFit: "cover",
                                    }}
                                    onError={(event) => {
                                        console.error(
                                            "Failed to load coordinator photo:",
                                            event.currentTarget.src
                                        );
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        display: "flex",
                                        width: "100%",
                                        height: "100%",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        border: "1px solid #ccc",
                                        fontSize: "14px",
                                    }}
                                >
                                    لا توجد صورة
                                </div>
                            )
                        ) : (
                            displayedValue
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export default function CardTemplateSettings() {
    const { user } = useAuth();
    const navigate = useNavigate();

    const canCreateDesign =
        hasPermission(user, 2) || hasPermission(user, 5);

    const canDeleteDesign =
        hasPermission(user, 3) || hasPermission(user, 6);

    const canPrintCard = hasPermission(user, 24);

    const [canvasBackgroundImage, setCanvasBackgroundImage] = useState("");

    const [selectedSavedTemplateId, setSelectedSavedTemplateId] =
        useState("");

    const [savedTemplates, setSavedTemplates] = useState([]);
    const [templatesLoading, setTemplatesLoading] = useState(false);
    const [templatesError, setTemplatesError] = useState("");

    const [template, setTemplate] = useState(cloneDefaultTemplate);
    const [selectedId, setSelectedId] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [drag, setDrag] = useState(null);
    const [canvasResize, setCanvasResize] = useState(null);
    const [editingTemplateId, setEditingTemplateId] = useState(null);

    // Print modal state.
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printStep, setPrintStep] = useState("designs");
    const [selectedPrintTemplate, setSelectedPrintTemplate] = useState(null);
    const [coordinatorCode, setCoordinatorCode] = useState("");
    const [printCoordinator, setPrintCoordinator] = useState(null);
    const [printType, setPrintType] = useState("جديد");
    const [printBusy, setPrintBusy] = useState(false);
    const [printError, setPrintError] = useState("");

    const printAreaRef = useRef(null);
    const modalCodeInputRef = useRef(null);
    const printInProgressRef = useRef(false);
    const afterPrintHandlerRef = useRef(null);
    const fallbackTimerRef = useRef(null);

    const selectedSavedTemplate = useMemo(
        () =>
            savedTemplates.find(
                (item) => String(item.id) === String(selectedSavedTemplateId)
            ) ?? null,
        [savedTemplates, selectedSavedTemplateId]
    );

    const selectedElement = useMemo(
        () =>
            template.elements.find(
                (element) => element.id === selectedId
            ) ?? null,
        [template.elements, selectedId]
    );

    const printDesign = selectedPrintTemplate?.design ?? null;

    // BACKGROUND IMAGE:
    // Revoke temporary object URLs when replaced or when this page unmounts.
    useEffect(() => {
        return () => {
            if (canvasBackgroundImage) {
                URL.revokeObjectURL(canvasBackgroundImage);
            }
        };
    }, [canvasBackgroundImage]);

    // Keep selected element valid.
    useEffect(() => {
        if (template.elements.length === 0) {
            if (selectedId) setSelectedId("");
            return;
        }

        const selectedExists = template.elements.some(
            (element) => element.id === selectedId
        );

        if (!selectedExists) {
            const preferred =
                template.elements.find(
                    (element) => element.type === "name"
                ) ?? template.elements[0];

            setSelectedId(preferred.id);
        }
    }, [template.elements, selectedId]);

    const updateTemplate = useCallback((key, value) => {
        setTemplate((current) => ({
            ...current,
            [key]: value,
        }));

        setError("");
        setNotice("");
    }, []);

    const updateSpacing = useCallback((group, key, value) => {
        setTemplate((current) => ({
            ...current,
            [group]: {
                ...(current[group] ?? {}),
                [key]: value,
            },
        }));
    }, []);

    const updateElement = useCallback(
        (key, value) => {
            setTemplate((current) => ({
                ...current,
                elements: current.elements.map((element) =>
                    element.id === selectedId
                        ? { ...element, [key]: value }
                        : element
                ),
            }));
        },
        [selectedId]
    );

    const changeOrientation = useCallback((orientation) => {
        const width = orientation === "horizontal" ? 856 : 540;
        const height = orientation === "horizontal" ? 540 : 856;

        setTemplate((current) => ({
            ...current,
            width,
            height,
            elements: current.elements.map((element) => ({
                ...element,
                x: Math.max(
                    0,
                    Math.min(element.x, Math.max(0, width - element.width))
                ),
                y: Math.max(
                    0,
                    Math.min(element.y, Math.max(0, height - element.height))
                ),
            })),
        }));
    }, []);

    // BACKGROUND IMAGE:
    // Uploading a background only updates this temporary state.
    // It does not update template.width, template.height, or template.elements.
    const handleCanvasBackgroundUpload = useCallback((event) => {
        const file = event.target.files?.[0];

        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setError("يرجى اختيار ملف صورة صحيح.");
            event.target.value = "";
            return;
        }

        const imageUrl = URL.createObjectURL(file);

        setCanvasBackgroundImage(imageUrl);
        setError("");
        setNotice("");

        // Allows selecting the same image again.
        event.target.value = "";
    }, []);

    // BACKGROUND IMAGE:
    // Remove the temporary image and restore the white preview background.
    const removeCanvasBackground = useCallback(() => {
        setCanvasBackgroundImage("");
        setError("");
        setNotice("تمت إزالة صورة الخلفية.");
    }, []);

    const addElement = useCallback((type) => {
        const element = createElement(type);

        setTemplate((current) => {
            const existing = current.elements.find(
                (item) => item.type === type
            );

            if (existing) {
                setSelectedId(existing.id);
                return current;
            }

            return {
                ...current,
                elements: [...current.elements, element],
            };
        });

        setSelectedId(element.id);
        setError("");
        setNotice("");
    }, []);

    const removeElement = useCallback(() => {
        if (!selectedElement) return;

        const remaining = template.elements.filter(
            (element) => element.id !== selectedId
        );

        setTemplate((current) => ({
            ...current,
            elements: current.elements.filter(
                (element) => element.id !== selectedId
            ),
        }));

        setSelectedId(remaining[0]?.id ?? "");
        setError("");
        setNotice("");
    }, [selectedElement, selectedId, template.elements]);

    const createTemplatePayload = useCallback(
        () => ({
            name: template.name.trim(),
            design: {
                version: 1,
                orientation:
                    template.width >= template.height
                        ? "horizontal"
                        : "vertical",
                canvas: {
                    width: template.width,
                    height: template.height,
                    background: template.canvas?.background ?? "#ffffff",
                },
                margins: template.margins,
                padding: template.padding,
                elements: template.elements.map(
                    ({ id, ...element }) => element
                ),
            },
        }),
        [template]
    );

    const handleEditTemplate = (savedTemplate) => {
        if (!canCreateDesign || busy) return;

        if (!savedTemplate?.id || !savedTemplate.design) {
            setError("بيانات التصميم غير مكتملة.");
            return;
        }

        const design = savedTemplate.design;

        const elements = (design.elements ?? []).map((element) => ({
            ...element,
            id: createId(),
        }));

        setTemplate({
            name: savedTemplate.name,
            width: design.canvas.width,
            height: design.canvas.height,
            canvas: { ...design.canvas },
            margins: {
                ...DEFAULT_SPACING,
                ...design.margins,
            },
            padding: {
                ...DEFAULT_PADDING,
                ...design.padding,
            },
            elements,
        });

        // Clear the temporary background when loading another saved design.
        setCanvasBackgroundImage("");

        setEditingTemplateId(savedTemplate.id);
        setSelectedSavedTemplateId(String(savedTemplate.id));

        setSelectedId(
            elements.find((element) => element.type === "name")?.id ??
                elements[0]?.id ??
                ""
        );

        setError("");
        setNotice(`أنت تعدّل التصميم: ${savedTemplate.name}`);
    };

    const loadSavedTemplates = useCallback(async () => {
        setTemplatesLoading(true);
        setTemplatesError("");

        try {
            const result = await sendHttpReq(TEMPLATES_ENDPOINT);

            const records = Array.isArray(result)
                ? result
                : result?.templates ??
                  result?.data?.templates ??
                  result?.data ??
                  [];

            if (!Array.isArray(records)) {
                throw new Error("صيغة بيانات التصميمات غير صحيحة.");
            }

            const normalized = records.map(normalizeDesign);

            setSavedTemplates(normalized);

            setSelectedSavedTemplateId((currentId) => {
                const stillExists = normalized.some(
                    (item) => String(item.id) === String(currentId)
                );

                return stillExists ? currentId : "";
            });

            return normalized;
        } catch (err) {
            console.error("Load templates error:", err);

            setTemplatesError(
                getErrorMessage(err, "تعذر تحميل التصميمات المحفوظة.")
            );

            setSavedTemplates([]);
            throw err;
        } finally {
            setTemplatesLoading(false);
        }
    }, []);

    useEffect(() => {
        loadSavedTemplates().catch(() => {});
    }, [loadSavedTemplates]);

    const handleDeleteTemplate = async () => {
        if (!canDeleteDesign || !selectedSavedTemplate || busy) return;

        const templateToDelete = selectedSavedTemplate;

        const confirmed = window.confirm(
            `هل أنت متأكد من حذف التصميم "${templateToDelete.name}"؟`
        );

        if (!confirmed) return;

        setBusy(true);
        setError("");
        setNotice("");

        try {
            const response = await sendHttpReq(
                `${TEMPLATES_ENDPOINT}/${templateToDelete.id}`,
                "DELETE"
            );

            if (response?.success === false || response?.error) {
                throw new Error(
                    response.message || response.error || "فشل حذف التصميم."
                );
            }

            setSavedTemplates((previous) =>
                previous.filter(
                    (item) => String(item.id) !== String(templateToDelete.id)
                )
            );

            setSelectedSavedTemplateId("");

            if (String(editingTemplateId) === String(templateToDelete.id)) {
                setTemplate(cloneDefaultTemplate());
                setEditingTemplateId(null);
                setSelectedId("");
                setCanvasBackgroundImage("");
            }

            setNotice("تم حذف التصميم بنجاح.");
        } catch (err) {
            console.error("Delete template error:", err);
            setError(getErrorMessage(err, "حدث خطأ أثناء حذف التصميم."));
        } finally {
            setBusy(false);
        }
    };

    const saveTemplate = async () => {
        if (!canCreateDesign || busy) return;

        if (!template.name.trim()) {
            setError("أدخل اسم القالب.");
            return;
        }

        if (template.name.trim().length > 150) {
            setError("اسم التصميم يجب ألا يتجاوز 150 حرفًا.");
            return;
        }

        setBusy(true);
        setError("");
        setNotice("");

        try {
            const payload = createTemplatePayload();

            if (editingTemplateId !== null) {
                await sendHttpReq(
                    `${TEMPLATES_ENDPOINT}/${editingTemplateId}`,
                    "PUT",
                    payload
                );

                await loadSavedTemplates();
                setNotice("تم تحديث التصميم المحفوظ بنجاح.");
            } else {
                await sendHttpReq(
                    `${TEMPLATES_ENDPOINT}/save`,
                    "POST",
                    payload
                );

                const refreshed = await loadSavedTemplates();

                const matchingTemplate = refreshed.find(
                    (item) => item.name === payload.name
                );

                if (matchingTemplate) {
                    setSelectedSavedTemplateId(String(matchingTemplate.id));
                }

                setNotice("تم حفظ التصميم بنجاح.");
            }
        } catch (err) {
            console.error("Save template error:", err);

            setError(
                getErrorMessage(
                    err,
                    editingTemplateId !== null
                        ? "تعذر تحديث التصميم."
                        : "تعذر حفظ التصميم."
                )
            );
        } finally {
            setBusy(false);
        }
    };

    const closePrintModal = () => {
        if (printBusy) return;

        setPrintModalOpen(false);
        setPrintStep("designs");
        setSelectedPrintTemplate(null);
        setCoordinatorCode("");
        setPrintCoordinator(null);
        setPrintType("جديد");
        setPrintError("");
    };

    const selectPrintTemplate = (savedTemplate) => {
        setSelectedPrintTemplate(savedTemplate);
        setCoordinatorCode("");
        setPrintCoordinator(null);
        setPrintError("");
        setPrintStep("code");

        window.setTimeout(() => {
            modalCodeInputRef.current?.focus();
        }, 0);
    };

    const findCoordinator = async (event) => {
        event?.preventDefault();

        if (printBusy) return;

        const normalizedCode = coordinatorCode.trim();

        if (!normalizedCode) {
            setPrintError("أدخل كود المندوب أو المنسق.");
            return;
        }

        if (!/^\d+$/.test(normalizedCode) || Number(normalizedCode) <= 0) {
            setPrintError("يرجى إدخال كود صحيح.");
            return;
        }

        setPrintBusy(true);
        setPrintError("");
        setPrintCoordinator(null);

        try {
            const result = await sendHttpReq(
                `${COORDINATOR_ENDPOINT}/${encodeURIComponent(
                    normalizedCode
                )}`
            );

            const coordinator =
                result?.coordinator ??
                result?.data?.coordinator ??
                result?.data ??
                null;

            if (result?.success === false || result?.error) {
                throw new Error(
                    result?.message ??
                        result?.error ??
                        "تعذر جلب بيانات الموظف."
                );
            }

            if (!coordinator || coordinator.code == null) {
                throw new Error(
                    result?.message ??
                        "لم يتم العثور على المندوب أو المنسق بهذا الكود."
                );
            }

            setPrintCoordinator(coordinator);
            setPrintStep("preview");
        } catch (err) {
            setPrintError(
                getErrorMessage(
                    err,
                    "حدث خطأ أثناء جلب بيانات المندوب أو المنسق."
                )
            );
        } finally {
            setPrintBusy(false);
        }
    };

    const handleManualPrint = async () => {
        if (!canPrintCard || printInProgressRef.current || printBusy) return;

        if (!printCoordinator || !printDesign) {
            setPrintError("اختر تصميمًا وأدخل كود الموظف أولًا.");
            return;
        }

        if (!PRINT_TYPES.some((item) => item.value === printType)) {
            setPrintError("اختر نوع البطاقة.");
            return;
        }

        printInProgressRef.current = true;
        setPrintBusy(true);
        setPrintError("");
        setNotice("");

        let printContainer = null;
        let afterPrintHandled = false;

        const cleanup = () => {
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
            printInProgressRef.current = false;
            setPrintBusy(false);
        };

        const handleAfterPrint = async () => {
            if (afterPrintHandled) return;

            afterPrintHandled = true;

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

            try {
                const confirmed = window.confirm(
                    "هل تمت طباعة البطاقة بنجاح؟"
                );

                if (!confirmed) {
                    setNotice("لم يتم تأكيد الطباعة، ولم يتم تسجيلها.");
                    return;
                }

                await sendHttpReq(PRINT_LOG_ENDPOINT, "POST", {
                    code: String(printCoordinator.code),
                    name: String(printCoordinator.name ?? ""),
                    type: printType,
                });

                setNotice("تم تسجيل طباعة البطاقة بنجاح.");
            } catch (err) {
                setPrintError(
                    getErrorMessage(
                        err,
                        "تعذر تسجيل الطباعة في سجل الطباعة."
                    )
                );
            } finally {
                cleanup();
            }
        };

        try {
            const sourceCard =
                printAreaRef.current?.querySelector(
                    ".coordinator-print-card"
                );

            if (!sourceCard) {
                throw new Error("تعذر العثور على البطاقة المراد طباعتها.");
            }

            const width = Number(printDesign.canvas?.width);
            const height = Number(printDesign.canvas?.height);

            if (
                !Number.isFinite(width) ||
                !Number.isFinite(height) ||
                width <= 0 ||
                height <= 0
            ) {
                throw new Error("أبعاد تصميم البطاقة غير صحيحة.");
            }

            printContainer = document.createElement("div");
            printContainer.id = "temporary-coordinator-print";

            Object.assign(printContainer.style, {
                display: "none",
                position: "fixed",
                left: "-100000px",
                top: "0",
                width: `${width}px`,
                height: `${height}px`,
                margin: "0",
                padding: "0",
                overflow: "hidden",
                background: "#ffffff",
            });

            const cardClone = sourceCard.cloneNode(true);

            Object.assign(cardClone.style, {
                display: "block",
                position: "relative",
                width: `${width}px`,
                height: `${height}px`,
                margin: "0",
                padding: "0",
                overflow: "hidden",
                breakInside: "avoid",
                pageBreakInside: "avoid",
            });

            printContainer.appendChild(cardClone);
            document.body.appendChild(printContainer);

            const images = Array.from(
                printContainer.querySelectorAll("img")
            );

            await Promise.race([
                Promise.all(
                    images.map(async (img) => {
                        if (!img.complete) {
                            await new Promise((resolve) => {
                                img.addEventListener("load", resolve, {
                                    once: true,
                                });

                                img.addEventListener("error", resolve, {
                                    once: true,
                                });
                            });
                        }

                        if (
                            img.complete &&
                            img.naturalWidth > 0 &&
                            typeof img.decode === "function"
                        ) {
                            await img.decode().catch(() => {});
                        }
                    })
                ),
                new Promise((resolve) => window.setTimeout(resolve, 5000)),
            ]);

            if (document.fonts?.ready) {
                await Promise.race([
                    document.fonts.ready,
                    new Promise((resolve) =>
                        window.setTimeout(resolve, 2000)
                    ),
                ]);
            }

            await new Promise((resolve) => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(resolve);
                });
            });

            afterPrintHandlerRef.current = handleAfterPrint;
            window.addEventListener("afterprint", handleAfterPrint);

            fallbackTimerRef.current = window.setTimeout(() => {
                if (!afterPrintHandled) {
                    handleAfterPrint();
                }
            }, 120000);

            window.print();
        } catch (err) {
            cleanup();

            setPrintError(
                getErrorMessage(err, "تعذر تجهيز البطاقة للطباعة.")
            );
        }
    };

    const openPrintModal = async () => {
        if (!canPrintCard || printBusy || templatesLoading) return;

        setPrintType("جديد");
        setPrintModalOpen(true);
        setPrintStep("designs");
        setSelectedPrintTemplate(null);
        setCoordinatorCode("");
        setPrintCoordinator(null);
        setPrintError("");

        try {
            const templates = await loadSavedTemplates();

            if (templates.length === 0) {
                setPrintError("لا توجد تصميمات محفوظة للطباعة.");
            }
        } catch {
            setPrintError("تعذر تحميل التصميمات.");
        }
    };

    // Drag selected element.
    useEffect(() => {
        if (!drag) return undefined;

        const handleMouseMove = (event) => {
            const deltaX = (event.clientX - drag.startX) / drag.scale;
            const deltaY = (event.clientY - drag.startY) / drag.scale;

            const x = Math.round(
                Math.max(
                    0,
                    Math.min(
                        Math.max(0, template.width - drag.elementWidth),
                        drag.elementX + deltaX
                    )
                )
            );

            const y = Math.round(
                Math.max(
                    0,
                    Math.min(
                        Math.max(0, template.height - drag.elementHeight),
                        drag.elementY + deltaY
                    )
                )
            );

            setTemplate((current) => ({
                ...current,
                elements: current.elements.map((element) =>
                    element.id === drag.id ? { ...element, x, y } : element
                ),
            }));
        };

        const handleMouseUp = () => setDrag(null);

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [drag, template.width, template.height]);

    // Resize canvas.
    useEffect(() => {
        if (!canvasResize) return undefined;

        const handleMouseMove = (event) => {
            const deltaX =
                (event.clientX - canvasResize.startX) / canvasResize.scale;

            const deltaY =
                (event.clientY - canvasResize.startY) / canvasResize.scale;

            setTemplate((current) => {
                const width =
                    canvasResize.axis === "width"
                        ? Math.max(
                              100,
                              Math.min(
                                  3000,
                                  Math.round(
                                      canvasResize.startWidth + deltaX
                                  )
                              )
                          )
                        : current.width;

                const height =
                    canvasResize.axis === "height"
                        ? Math.max(
                              100,
                              Math.min(
                                  3000,
                                  Math.round(
                                      canvasResize.startHeight + deltaY
                                  )
                              )
                          )
                        : current.height;

                return {
                    ...current,
                    width,
                    height,
                    elements: current.elements.map((element) => ({
                        ...element,
                        x: Math.max(
                            0,
                            Math.min(
                                element.x,
                                Math.max(0, width - element.width)
                            )
                        ),
                        y: Math.max(
                            0,
                            Math.min(
                                element.y,
                                Math.max(0, height - element.height)
                            )
                        ),
                    })),
                };
            });
        };

        const handleMouseUp = () => setCanvasResize(null);

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [canvasResize]);

    // Move selected element with keyboard.
    useEffect(() => {
        const handleKeyDown = (event) => {
            const arrowKeys = [
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
            ];

            if (
                !arrowKeys.includes(event.key) ||
                !selectedId ||
                drag ||
                canvasResize
            ) {
                return;
            }

            const target = event.target;

            if (
                target instanceof HTMLElement &&
                (target.isContentEditable ||
                    target.closest(
                        'input, textarea, select, [contenteditable="true"]'
                    ))
            ) {
                return;
            }

            if (!template.elements.some((e) => e.id === selectedId)) return;

            event.preventDefault();

            const step = event.shiftKey ? 10 : 1;

            setTemplate((current) => ({
                ...current,
                elements: current.elements.map((element) => {
                    if (element.id !== selectedId) return element;

                    let x = element.x;
                    let y = element.y;

                    if (event.key === "ArrowLeft") x -= step;
                    if (event.key === "ArrowRight") x += step;
                    if (event.key === "ArrowUp") y -= step;
                    if (event.key === "ArrowDown") y += step;

                    return {
                        ...element,
                        x: Math.max(
                            0,
                            Math.min(
                                x,
                                Math.max(0, current.width - element.width)
                            )
                        ),
                        y: Math.max(
                            0,
                            Math.min(
                                y,
                                Math.max(0, current.height - element.height)
                            )
                        ),
                    };
                }),
            }));
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [selectedId, template.elements, drag, canvasResize]);

    // Clean up temporary print resources when this page unmounts.
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

    const previewScale = Math.min(1, 800 / template.width);

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="sticky top-0 z-40">
                <Header user />
            </div>

            <main
                dir="rtl"
                className="mx-auto max-w-[1700px] p-4 md:p-6"
            >
                <TemplateToolbar
                    onBack={() => navigate(-1)}
                    saveTemplate={saveTemplate}
                    onPrint={openPrintModal}
                    onEdit={() => handleEditTemplate(selectedSavedTemplate)}
                    onDelete={handleDeleteTemplate}
                    savedTemplates={savedTemplates}
                    selectedSavedTemplateId={selectedSavedTemplateId}
                    onSelectSavedTemplate={setSelectedSavedTemplateId}
                    hasSelectedDesign={Boolean(selectedSavedTemplate)}
                    templatesLoading={templatesLoading}
                    templatesError={templatesError}
                    busy={busy || printBusy}
                    error={error}
                    notice={notice}
                    canPrintCard={canPrintCard}
                    canCreateDesign={canCreateDesign}
                    canDeleteDesign={canDeleteDesign}
                />

                {editingTemplateId !== null && (
                    <div className="mb-5 flex justify-start">
                        <button
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                setTemplate(cloneDefaultTemplate());
                                setEditingTemplateId(null);
                                setSelectedId("");
                                setCanvasBackgroundImage("");
                                setError("");
                                setNotice("تم بدء تصميم جديد.");
                            }}
                            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            إلغاء التعديل والبدء بتصميم جديد
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_390px]">
                    <div className="min-w-0 space-y-5">
                        <CanvasSettings
                            template={template}
                            updateTemplate={updateTemplate}
                            updateSpacing={updateSpacing}
                            changeOrientation={changeOrientation}
                            canvasBackgroundImage={canvasBackgroundImage}
                            onCanvasBackgroundUpload={
                                handleCanvasBackgroundUpload
                            }
                            onRemoveCanvasBackground={
                                removeCanvasBackground
                            }
                        />

                        <CardPreview
                            template={template}
                            previewScale={previewScale}
                            selectedId={selectedId}
                            setSelectedId={setSelectedId}
                            drag={drag}
                            setDrag={setDrag}
                            setCanvasResize={setCanvasResize}
                            canvasBackgroundImage={canvasBackgroundImage}
                        />
                    </div>

                    <aside className="space-y-5">
                        <ElementProperties
                            selectedElement={selectedElement}
                            updateElement={updateElement}
                            removeElement={removeElement}
                        />

                        <ElementList
                            elements={template.elements}
                            selectedId={selectedId}
                            onSelect={setSelectedId}
                            onAdd={addElement}
                        />
                    </aside>
                </div>
            </main>

            {/* Print modal */}
            {printModalOpen && (
                <div
                    className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-3 sm:p-6"
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            closePrintModal();
                        }
                    }}
                >
                    <section
                        dir="rtl"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="print-modal-title"
                        className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
                    >
                        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-5 py-4">
                            <h2
                                id="print-modal-title"
                                className="text-xl font-bold text-slate-800"
                            >
                                طباعة بطاقة مندوب أو منسق
                            </h2>

                            <button
                                type="button"
                                onClick={closePrintModal}
                                disabled={printBusy}
                                aria-label="إغلاق"
                                className="rounded-lg px-3 py-1 text-2xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                            >
                                ×
                            </button>
                        </div>

                        <div className="space-y-5 p-5">
                            {printStep !== "designs" && (
                                <button
                                    type="button"
                                    disabled={printBusy}
                                    onClick={() => {
                                        setPrintError("");

                                        if (printStep === "preview") {
                                            setPrintStep("code");
                                            setPrintCoordinator(null);
                                        } else {
                                            setPrintStep("designs");
                                            setSelectedPrintTemplate(null);
                                            setPrintCoordinator(null);
                                        }
                                    }}
                                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                                >
                                    ← رجوع
                                </button>
                            )}

                            {printStep === "designs" && (
                                <div className="space-y-4">
                                    <h3 className="font-semibold text-slate-700">
                                        اختر تصميم البطاقة المحفوظ
                                    </h3>

                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                        {savedTemplates.map(
                                            (savedTemplate, index) => {
                                                const scale = Math.min(
                                                    220 /
                                                        savedTemplate.design
                                                            .canvas.width,
                                                    150 /
                                                        savedTemplate.design
                                                            .canvas.height
                                                );

                                                return (
                                                    <div
                                                        key={
                                                            savedTemplate.id ??
                                                            `${savedTemplate.name}-${index}`
                                                        }
                                                        className="rounded-xl border border-slate-200 p-4 text-right transition hover:border-orange-500 hover:bg-orange-50"
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                selectPrintTemplate(
                                                                    savedTemplate
                                                                )
                                                            }
                                                            className="w-full text-right"
                                                        >
                                                            <div className="mb-3 flex aspect-4/3 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                                                                <div
                                                                    style={{
                                                                        transform: `scale(${scale})`,
                                                                        transformOrigin:
                                                                            "center",
                                                                        flexShrink: 0,
                                                                    }}
                                                                >
                                                                    <CardArtwork
                                                                        design={
                                                                            savedTemplate.design
                                                                        }
                                                                        coordinator={
                                                                            null
                                                                        }
                                                                    />
                                                                </div>
                                                            </div>

                                                            <p className="font-semibold text-slate-800">
                                                                {
                                                                    savedTemplate.name
                                                                }
                                                            </p>

                                                            <p className="mt-1 text-sm text-slate-500">
                                                                {
                                                                    savedTemplate
                                                                        .design
                                                                        .canvas
                                                                        .width
                                                                }{" "}
                                                                ×{" "}
                                                                {
                                                                    savedTemplate
                                                                        .design
                                                                        .canvas
                                                                        .height
                                                                }
                                                            </p>
                                                        </button>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                </div>
                            )}

                            {printStep === "code" && printDesign && (
                                <form
                                    onSubmit={findCoordinator}
                                    className="mx-auto max-w-xl space-y-4"
                                >
                                    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                                        <p className="font-semibold text-slate-800">
                                            التصميم المختار:{" "}
                                            {selectedPrintTemplate.name}
                                        </p>

                                        <p className="mt-1 text-sm text-slate-600">
                                            أدخل كود المندوب أو المنسق لعرض
                                            البطاقة ببياناته.
                                        </p>
                                    </div>

                                    <label
                                        htmlFor="coordinator-code"
                                        className="block font-medium text-slate-700"
                                    >
                                        كود المندوب أو المنسق
                                    </label>

                                    <input
                                        ref={modalCodeInputRef}
                                        id="coordinator-code"
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="off"
                                        value={coordinatorCode}
                                        disabled={printBusy}
                                        onChange={(event) => {
                                            setCoordinatorCode(
                                                event.target.value
                                            );
                                            setPrintError("");
                                        }}
                                        placeholder="أدخل الكود"
                                        className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                                    />

                                    {printError && (
                                        <p
                                            role="alert"
                                            className="text-sm text-red-600"
                                        >
                                            {printError}
                                        </p>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={printBusy}
                                        className="w-full rounded-lg bg-orange-600 px-5 py-3 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {printBusy
                                            ? "جارٍ البحث..."
                                            : "عرض البطاقة"}
                                    </button>
                                </form>
                            )}

                            {printStep === "preview" &&
                                printDesign &&
                                printCoordinator && (
                                    <div className="space-y-5">
                                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-slate-50 p-4">
                                            <div>
                                                <p className="font-bold text-slate-800">
                                                    {printCoordinator.name}
                                                </p>

                                                <p className="mt-1 text-sm text-slate-600">
                                                    الكود:{" "}
                                                    {printCoordinator.code}
                                                    {printCoordinator.job
                                                        ? ` — ${printCoordinator.job}`
                                                        : ""}
                                                </p>

                                                <p className="mt-1 text-sm text-slate-500">
                                                    التصميم:{" "}
                                                    {selectedPrintTemplate.name}
                                                </p>
                                            </div>

                                            <button
                                                type="button"
                                                disabled={printBusy}
                                                onClick={() => {
                                                    setPrintStep("code");
                                                    setPrintCoordinator(null);
                                                    setPrintError("");
                                                }}
                                                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-100 disabled:opacity-50"
                                            >
                                                تغيير الكود
                                            </button>
                                        </div>

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
                                                    setPrintError("");
                                                }}
                                                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100 disabled:bg-slate-100"
                                            >
                                                {PRINT_TYPES.map((item) => (
                                                    <option
                                                        key={item.value}
                                                        value={item.value}
                                                    >
                                                        {item.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <h3 className="font-semibold text-slate-700">
                                            معاينة البطاقة قبل الطباعة
                                        </h3>

                                        <div className="overflow-auto rounded-xl border bg-slate-100 p-4">
                                            <div
                                                className="mx-auto"
                                                style={{
                                                    width: "fit-content",
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        transform: `scale(${Math.min(
                                                            1,
                                                            800 /
                                                                printDesign
                                                                    .canvas
                                                                    .width
                                                        )})`,
                                                        transformOrigin:
                                                            "top center",
                                                        marginBottom: `${
                                                            printDesign.canvas
                                                                .height *
                                                            (Math.min(
                                                                1,
                                                                800 /
                                                                    printDesign
                                                                        .canvas
                                                                        .width
                                                            ) -
                                                                1)
                                                        }px`,
                                                    }}
                                                >
                                                    <CardArtwork
                                                        design={printDesign}
                                                        coordinator={
                                                            printCoordinator
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {printError && (
                                            <p
                                                role="alert"
                                                className="text-sm text-red-600"
                                            >
                                                {printError}
                                            </p>
                                        )}

                                        <div className="flex flex-wrap justify-end gap-3 border-t pt-4">
                                            <button
                                                type="button"
                                                onClick={closePrintModal}
                                                disabled={printBusy}
                                                className="rounded-lg border border-slate-300 px-5 py-3 hover:bg-slate-50 disabled:opacity-50"
                                            >
                                                إلغاء
                                            </button>

                                            <button
                                                type="button"
                                                onClick={handleManualPrint}
                                                disabled={printBusy}
                                                className="rounded-lg bg-orange-600 px-6 py-3 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                                            >
                                                {printBusy
                                                    ? "جارٍ تجهيز البطاقة..."
                                                    : "طباعة البطاقة"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                        </div>
                    </section>
                </div>
            )}

            {/* Hidden source card cloned for printing. */}
            <div
                ref={printAreaRef}
                className="coordinator-print-area"
                dir="rtl"
                aria-hidden="true"
            >
                {printCoordinator && printDesign && (
                    <div className="coordinator-print-card">
                        <CardArtwork
                            design={printDesign}
                            coordinator={printCoordinator}
                        />
                    </div>
                )}
            </div>

            <style>{`
                .coordinator-print-area {
                    display: none;
                }

                @media print {
                    @page {
                        size: auto;
                        margin: 0;
                    }

                    html,
                    body,
                    #root {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        min-height: 0 !important;
                        background: #ffffff !important;
                    }

                    body * {
                        visibility: hidden !important;
                    }

                    #temporary-coordinator-print,
                    #temporary-coordinator-print * {
                        visibility: visible !important;
                    }

                    #temporary-coordinator-print {
                        display: block !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden !important;
                        transform: none !important;
                        background: #ffffff !important;
                        print-color-adjust: exact !important;
                        -webkit-print-color-adjust: exact !important;
                    }

                    #temporary-coordinator-print .coordinator-print-card {
                        display: block !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        break-inside: avoid !important;
                        page-break-inside: avoid !important;
                    }

                    #temporary-coordinator-print .card-artwork {
                        max-width: none !important;
                        margin: 0 !important;
                        transform: none !important;
                    }

                    #temporary-coordinator-print img {
                        display: block !important;
                        max-width: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
