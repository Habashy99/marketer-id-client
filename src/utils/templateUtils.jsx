export const MIN_CANVAS_SIZE = 100;
export const MAX_CANVAS_SIZE = 3000;

export const DEFAULT_SPACING = {
    top: 10,
    right: 10,
    bottom: 10,
    left: 10,
};

export const ELEMENT_TYPES = [
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

export const SAMPLE_VALUES = {
    name: "اسم الموظف",
    company_name: "جملة ماركت",
    date: "2026-10-25",
    code: "1001",
    national_id_number: "00000000000000",
    job: "مندوب",
};

export function clamp(value, min, max = Infinity) {
    const number = Number(value);

    if (!Number.isFinite(number)) {
        return min;
    }

    return Math.max(min, Math.min(max, number));
}

export function createElement(type) {
    const definition = ELEMENT_TYPES.find(
        (item) => item.type === type
    );

    if (!definition) {
        throw new Error(`Unknown element type: ${type}`);
    }

    const isPhoto = type === "photo";

    return {
        id: crypto.randomUUID(),
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

export function getElementLabel(type) {
    return (
        ELEMENT_TYPES.find((item) => item.type === type)?.label ??
        type
    );
}

export const DEFAULT_TEMPLATE = {
    name: "Employee Card",
    width: 856,
    height: 540,
    margins: { ...DEFAULT_SPACING },
    padding: {
        top: 15,
        right: 15,
        bottom: 15,
        left: 15,
    },
    elements: [
        {
            ...createElement("photo"),
            width: 150,
            height: 180,
        },
        {
            ...createElement("name"),
            width: 300,
            height: 50,
            fontSize: 24,
        },
        {
            ...createElement("company_name"),
            width: 300,
            height: 40,
            fontSize: 20,
        },
        {
            ...createElement("code"),
            width: 200,
            height: 35,
            fontSize: 18,
        },
    ],
};

export function cloneDefaultTemplate() {
    return {
        ...DEFAULT_TEMPLATE,
        margins: { ...DEFAULT_TEMPLATE.margins },
        padding: { ...DEFAULT_TEMPLATE.padding },
        elements: DEFAULT_TEMPLATE.elements.map((element) => ({
            ...element,
            id: crypto.randomUUID(),
        })),
    };
}

/*
 * Keep the design shape consistent for JSON export and card preview.
 * The top-level template fields are retained for the API request.
 */
export function createTemplatePayload(template) {
    const elements = template.elements.map((element) => ({
        ...element,
    }));

    return {
        ...template,
        name: template.name.trim(),
        margins: { ...template.margins },
        padding: { ...template.padding },
        elements,
        design: {
            canvas: {
                width: template.width,
                height: template.height,
                background: "#ffffff",
            },
            margins: { ...template.margins },
            padding: { ...template.padding },
            elements,
        },
    };
}