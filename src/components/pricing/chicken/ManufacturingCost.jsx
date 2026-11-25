import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../header.jsx";
import { sendHttpReq } from "../../../lib/httpHandler";
import {
  DEMO_RAW_MATERIALS,
  EMPTY_INGREDIENT,
} from "./data/constantsManufacturingCost";

import {
  getPoultryProducts,
  getDailyExchangeData,
  getExchangeByDate,
  getSupplierExchangePrice,
  getActiveSupplierPeriod,
  getHighestSupplierFactor,
  getManufacturingProducts,
  saveManufacturingProducts,
} from "./data/dailyExchangeStorage";

/* -------------------------------------------------------------------------- */
/* Base Products and Selling Categories                                       */
/* -------------------------------------------------------------------------- */

const SELLING_CATEGORIES = [
  "الإسكندرية",
  "القاهرة",
  "المنصورة",
  "الساحل الشمالي",
  "الغردقة",
  "الجيزة",
  "أسيوط",
];

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const WEIGHT_UNITS = ["جرام", "كيلو"];
const VOLUME_UNITS = ["مل", "لتر"];
const COUNT_UNITS = ["قطعة"];

const CALCULATION_TYPES = [
  { value: "weight", label: "بالوزن" },
  { value: "volume", label: "بالحجم" },
  { value: "piece", label: "بالقطعة" },
];

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const money = (value) =>
  Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getQuantityKg = (quantity, unit) => {
  const value = Number(quantity || 0);

  if (unit === "جرام") return value / 1000;
  if (unit === "كيلو") return value;

  return 0;
};

const isPoultryMaterial = (material) => Boolean(material?.isPoultry === true);

const normalizeSupplierName = (value = "") =>
  String(value)
    .trim()
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/[ًٌٍَُِّْـ]/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();

const toPoultryMaterial = (product = {}) => {
  const barcode = String(product.barcode ?? product.id ?? "").trim();
  const itemean = String(product.itemean ?? "").trim();
  const factorProductKey = itemean
    ? `itemean:${itemean}`
    : barcode
      ? `barcode:${barcode}`
      : "";

  const name = String(
    product.name ||
      product.productName ||
      product.product_name ||
      product.a_name ||
      "",
  ).trim();

  const linkedSuppliers = Array.isArray(product.suppliers)
    ? product.suppliers
    : [];

  const supplierIds = [
    ...new Set(
      [
        product.supplierId,
        ...(Array.isArray(product.supplierIds) ? product.supplierIds : []),
        ...linkedSuppliers.map(
          (supplier) =>
            supplier?.supplierId ?? supplier?.supplier_id ?? supplier?.id,
        ),
      ]
        .filter((id) => id !== undefined && id !== null && id !== "")
        .map(String),
    ),
  ];

  const rawType = String(
    product.poultryType || product.poultry_type || product.type || "",
  )
    .trim()
    .toLowerCase();

  return {
    ...product,
    id: barcode || factorProductKey,
    barcode,
    itemean,
    factorProductKey,
    code: String(product.code || itemean || barcode),
    name,
    supplierId: supplierIds[0] || "",
    supplierIds,
    supplierName: String(
      product.supplierName ||
        product.supplier ||
        linkedSuppliers[0]?.supplierName ||
        linkedSuppliers[0]?.name ||
        "",
    ),
    suppliers: linkedSuppliers,
    pricePerKg: null,
    unit: "كيلو",
    isPoultry: true,
    poultryType:
      rawType === "baladi" || rawType.includes("بلدي") || /بلدي/.test(name)
        ? "baladi"
        : "white",
    regionalPrices: product.regionalPrices || {},
  };
};

const getExchangeTypeLabel = (type) => (type === "baladi" ? "بلدي" : "أبيض");

const getUnitBaseValue = (value, unit, type) => {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) return 0;

  if (type === "weight") {
    return unit === "كيلو" ? number * 1000 : number;
  }

  if (type === "volume") {
    return unit === "لتر" ? number * 1000 : number;
  }

  return number;
};

const getBaseUnitLabel = (type) => {
  if (type === "weight") return "جرام";
  if (type === "volume") return "مل";
  return "قطعة";
};

const getUsageUnits = (type) => {
  if (type === "weight") return WEIGHT_UNITS;
  if (type === "volume") return VOLUME_UNITS;
  return COUNT_UNITS;
};

const getDefaultCalculation = (material) => {
  if (!material) {
    return {
      calculationType: "weight",
      packageSize: "",
      packageUnit: "جرام",
      pieceMode: "weight",
      packagePieces: "1",
      pieceWeight: "",
      pieceWeightUnit: "جرام",
      quantity: "",
      unit: "جرام",
    };
  }

  if (material.unit === "لتر") {
    return {
      calculationType: "volume",
      packageSize: String(material.packageSize || 1000),
      packageUnit: "مل",
      pieceMode: "weight",
      packagePieces: "1",
      pieceWeight: "",
      pieceWeightUnit: "جرام",
      quantity: "",
      unit: "مل",
    };
  }

  if (material.unit === "حبة") {
    return {
      calculationType: "piece",
      packageSize: "",
      packageUnit: "جرام",
      pieceMode: "count",
      packagePieces: "1",
      pieceWeight: "",
      pieceWeightUnit: "جرام",
      quantity: "",
      unit: "قطعة",
    };
  }

  if (material.unit === "كيلو") {
    return {
      calculationType: "weight",
      packageSize: "1000",
      packageUnit: "جرام",
      pieceMode: "weight",
      packagePieces: "1",
      pieceWeight: "",
      pieceWeightUnit: "جرام",
      quantity: "",
      unit: "جرام",
    };
  }

  if (material.unit === "عبوة" && material.packageSize) {
    const usageUnit = material.usageUnit || "جرام";
    const isVolume = ["مل", "لتر"].includes(usageUnit);
    const isCount = ["حبة", "قطعة"].includes(usageUnit);

    return {
      calculationType: isVolume ? "volume" : isCount ? "piece" : "weight",
      packageSize: String(material.packageSize),
      packageUnit: usageUnit,
      pieceMode: isCount ? "count" : "weight",
      packagePieces: "1",
      pieceWeight: "",
      pieceWeightUnit: "جرام",
      quantity: "",
      unit: usageUnit,
    };
  }

  return {
    calculationType: "weight",
    packageSize: "",
    packageUnit: "جرام",
    pieceMode: "weight",
    packagePieces: "1",
    pieceWeight: "",
    pieceWeightUnit: "جرام",
    quantity: "",
    unit: "جرام",
  };
};

const getDefaultUsageUnit = (material) => {
  const defaults = getDefaultCalculation(material);
  return defaults.unit;
};

const getDraftForMaterial = (material, previous = {}) => ({
  ...getDefaultCalculation(material),
  catalogId: String(material?.id || ""),
  supplierId: "",
  poultryType: material?.poultryType || "white",
  ...previous,
});

const normalizeProductBarcode = (value) => String(value ?? "").trim();

/* -------------------------------------------------------------------------- */
/* Selling Price Calculation                                                  */
/* -------------------------------------------------------------------------- */

const normalizeMarginIdentifier = (value) => {
  const normalized = String(value ?? "").trim();

  if (!normalized) return [];

  const identifiers = [normalized];

  if (normalized.startsWith("itemean:")) {
    identifiers.push(normalized.slice("itemean:".length));
  }

  if (normalized.startsWith("barcode:")) {
    identifiers.push(normalized.slice("barcode:".length));
  }

  return identifiers;
};

const getMarginProductIdentifiers = (item) => {
  return [item?.productId, item?.barcode, item?.itemean, item?.id, item?.key]
    .flatMap(normalizeMarginIdentifier)
    .filter(Boolean);
};

const getBaseProductItemean = (ingredients = [], baseProductId = "") => {
  const baseId = String(baseProductId ?? "").trim();

  const baseIngredient =
    ingredients.find((item) => item.isBaseProduct) ||
    ingredients.find(
      (item) =>
        String(item.barcode ?? "").trim() === baseId ||
        String(item.ingredientProductId ?? "").trim() === baseId,
    );

  return String(baseIngredient?.itemean ?? "").trim();
};

const getProductSellingPrices = ({
  costPerKg,
  baseProductId,
  baseProductItemean,
  costDate,
  profitMargins,
}) => {
  const roundedCostPerKg = Math.round(Number(costPerKg || 0));

  const baseIdentifiers = new Set(
    [
      ...normalizeMarginIdentifier(baseProductId),
      ...normalizeMarginIdentifier(baseProductItemean),
    ].filter(Boolean),
  );

  return SELLING_CATEGORIES.map((category) => {
    if (
      baseIdentifiers.size === 0 ||
      !costDate ||
      !Number.isFinite(roundedCostPerKg) ||
      roundedCostPerKg <= 0 ||
      !Array.isArray(profitMargins)
    ) {
      return {
        category,
        profitMargin: null,
        sellingPrice: null,
      };
    }

    const activeMargins = profitMargins
      .filter((item) => {
        const marginIdentifiers = getMarginProductIdentifiers(item);

        const sameProduct = marginIdentifiers.some((identifier) =>
          baseIdentifiers.has(identifier),
        );

        const sameCategory = item.category === category;

        const validStartDate = item.startDate && item.startDate <= costDate;

        const validEndDate = !item.endDate || item.endDate >= costDate;

        const validMargin =
          item.profitMargin !== null &&
          item.profitMargin !== undefined &&
          item.profitMargin !== "" &&
          Number.isFinite(Number(item.profitMargin));

        return (
          sameProduct &&
          sameCategory &&
          validStartDate &&
          validEndDate &&
          validMargin
        );
      })
      .sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));

    const activeMargin = activeMargins[0];

    if (!activeMargin) {
      return {
        category,
        profitMargin: null,
        sellingPrice: null,
      };
    }

    const profitMargin = Number(activeMargin.profitMargin);

    const sellingPrice = Math.round(
      roundedCostPerKg * (1 + profitMargin / 100),
    );

    return {
      category,
      profitMargin,
      sellingPrice,
      startDate: activeMargin.startDate,
      endDate: activeMargin.endDate || null,
    };
  });
};

/* -------------------------------------------------------------------------- */
/* Ordinary Material Pricing                                                  */
/* -------------------------------------------------------------------------- */

const getMaterialUsageConfig = (material) => {
  if (!material) return null;

  const price = Number(material.pricePerKg);

  if (!Number.isFinite(price) || price <= 0) return null;

  return {
    price,
    priceUnit: material.unit || "عبوة",
    priceLabel:
      material.unit === "كيلو"
        ? "سعر الكيلو"
        : material.unit === "لتر"
          ? "سعر اللتر"
          : material.unit === "حبة"
            ? "سعر القطعة"
            : "سعر العبوة",
  };
};

/* -------------------------------------------------------------------------- */
/* Ingredient Calculation                                                     */
/* -------------------------------------------------------------------------- */

const calculateIngredientCost = (draft, material, pricing) => {
  const quantity = Number(draft.quantity);

  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !pricing ||
    pricing.price === null ||
    pricing.price === undefined
  ) {
    return 0;
  }

  if (pricing.isPoultry) {
    return getQuantityKg(quantity, draft.unit) * pricing.price;
  }

  const price = Number(pricing.price);

  if (draft.calculationType === "weight") {
    const packageAmount = getUnitBaseValue(
      draft.packageSize,
      draft.packageUnit,
      "weight",
    );

    const usedAmount = getUnitBaseValue(quantity, draft.unit, "weight");

    if (packageAmount <= 0 || usedAmount <= 0) return 0;

    return (price / packageAmount) * usedAmount;
  }

  if (draft.calculationType === "volume") {
    const packageAmount = getUnitBaseValue(
      draft.packageSize,
      draft.packageUnit,
      "volume",
    );

    const usedAmount = getUnitBaseValue(quantity, draft.unit, "volume");

    if (packageAmount <= 0 || usedAmount <= 0) return 0;

    return (price / packageAmount) * usedAmount;
  }

  if (draft.calculationType === "piece") {
    const packagePieces = Number(draft.packagePieces);

    if (!Number.isFinite(packagePieces) || packagePieces <= 0) {
      return 0;
    }

    if (draft.pieceMode === "count") {
      return (price / packagePieces) * quantity;
    }

    const pieceWeight = getUnitBaseValue(
      draft.pieceWeight,
      draft.pieceWeightUnit,
      "weight",
    );

    const usedWeight = getUnitBaseValue(quantity, draft.unit, "weight");

    const packageWeight = packagePieces * pieceWeight;

    if (packageWeight <= 0 || usedWeight <= 0) return 0;

    return (price / packageWeight) * usedWeight;
  }

  return 0;
};

const calculateIngredientQuantityKg = (draft, pricing) => {
  if (pricing?.isPoultry) {
    return getQuantityKg(draft.quantity, draft.unit);
  }

  if (
    draft.calculationType === "weight" ||
    (draft.calculationType === "piece" && draft.pieceMode === "weight")
  ) {
    if (draft.calculationType === "weight") {
      return getQuantityKg(draft.quantity, draft.unit);
    }

    return 0;
  }

  return 0;
};

/* -------------------------------------------------------------------------- */
/* Selling Prices Table                                                       */
/* -------------------------------------------------------------------------- */

function SellingPricesTable({ prices, costPerKg }) {
  const roundedCost = Math.round(Number(costPerKg || 0));

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-emerald-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-emerald-100 bg-emerald-50 px-4 py-4">
        <div>
          <h3 className="font-extrabold text-emerald-900">
            أسعار البيع المقترحة
          </h3>

          <p className="mt-1 text-xs text-emerald-700">
            بناءً على هامش ربح المنتج الأساسي وتاريخ التكلفة المحدد
          </p>
        </div>

        <div className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-emerald-800">
          تكلفة الكيلو بعد التقريب: {money(roundedCost)} جنيه
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-150 text-right">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th className="whitespace-nowrap px-4 py-3 text-sm">الفئة</th>

              <th className="whitespace-nowrap px-4 py-3 text-sm">
                هامش الربح
              </th>

              <th className="whitespace-nowrap px-4 py-3 text-sm">
                سعر البيع للكيلو
              </th>
            </tr>
          </thead>

          <tbody>
            {prices.map((item) => (
              <tr
                key={item.category}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="px-4 py-3 text-sm font-bold text-slate-700">
                  {item.category}
                </td>

                <td className="px-4 py-3 text-sm text-slate-600">
                  {item.profitMargin !== null
                    ? `${item.profitMargin}%`
                    : "غير متاح"}
                </td>

                <td className="px-4 py-3">
                  {item.sellingPrice !== null ? (
                    <span className="font-extrabold text-emerald-700">
                      {money(item.sellingPrice)} جنيه
                    </span>
                  ) : (
                    <span className="text-sm font-semibold text-slate-400">
                      غير متاح
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
        معادلة الحساب: تكلفة الكيلو بعد التقريب × (1 + هامش الربح ÷ 100)، ثم
        تقريب الناتج لأقرب جنيه.
      </p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Component                                                                  */
/* -------------------------------------------------------------------------- */

function ManufacturingCost() {
  const navigate = useNavigate();

  /* Shared Data */

  const [sharedData, setSharedData] = useState(() => {
    const data = getDailyExchangeData() || {};

    return {
      ...data,
      exchanges: Array.isArray(data.exchanges) ? data.exchanges : [],
      supplierFactors: data.supplierFactors || {
        suppliers: [],
        stockPrices: [],
      },
      profitMargins: Array.isArray(data.profitMargins)
        ? data.profitMargins
        : [],
    };
  });

  const [products, setProducts] = useState([]);
  const [poultryCatalog, setPoultryCatalog] = useState(() =>
    getPoultryProducts(),
  );
  const [isHydrated, setIsHydrated] = useState(false);

  const exchanges = sharedData.exchanges || [];
  const suppliers = sharedData.supplierFactors?.suppliers || [];

  const profitMargins = Array.isArray(sharedData.profitMargins)
    ? sharedData.profitMargins
    : [];

  const [search, setSearch] = useState("");
  const [productName, setProductName] = useState("");
  const [baseProductId, setBaseProductId] = useState("");
  const [baseProductName, setBaseProductName] = useState("");
  const [baseProductSearch, setBaseProductSearch] = useState("");
  const [pendingBaseProduct, setPendingBaseProduct] = useState(null);
  const [baseProductQuantity, setBaseProductQuantity] = useState("1");
  const [isSearchingBarcode, setIsSearchingBarcode] = useState(false);
  const [barcodeSearchError, setBarcodeSearchError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [costDate, setCostDate] = useState(getTodayDate());

  const [ingredientDraft, setIngredientDraft] = useState({
    ...EMPTY_INGREDIENT,
    ...getDefaultCalculation(null),
    supplierId: "",
    poultryType: "white",
  });

  const [ingredients, setIngredients] = useState([]);

  /* Modal Details */

  const [selectedProductId, setSelectedProductId] = useState(null);

  const [detailDraft, setDetailDraft] = useState({
    ...EMPTY_INGREDIENT,
    ...getDefaultCalculation(null),
    supplierId: "",
    poultryType: "white",
  });

  const [editingIngredientId, setEditingIngredientId] = useState(null);
  const [catalogSearch, setCatalogSearch] = useState("");
  const [detailCatalogSearch, setDetailCatalogSearch] = useState("");

  /* Load and Save */

  useEffect(() => {
    const data = getDailyExchangeData() || {};

    setSharedData({
      ...data,
      exchanges: Array.isArray(data.exchanges) ? data.exchanges : [],
      supplierFactors: data.supplierFactors || {
        suppliers: [],
        stockPrices: [],
      },
      profitMargins: Array.isArray(data.profitMargins)
        ? data.profitMargins
        : [],
    });

    setProducts(getManufacturingProducts());
    setPoultryCatalog(getPoultryProducts());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    saveManufacturingProducts(products);
  }, [products, isHydrated]);

  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key !== "dailyExchangeData" || !event.newValue) return;

      try {
        const parsed = JSON.parse(event.newValue);

        setPoultryCatalog(
          Array.isArray(parsed.poultryProducts) ? parsed.poultryProducts : [],
        );
        setSharedData({
          ...parsed,
          exchanges: Array.isArray(parsed.exchanges) ? parsed.exchanges : [],
          supplierFactors: parsed.supplierFactors || {
            suppliers: [],
            stockPrices: [],
          },
          profitMargins: Array.isArray(parsed.profitMargins)
            ? parsed.profitMargins
            : [],
        });
      } catch (error) {
        console.error("Failed to sync shared data:", error);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  /* Catalog */

  const rawMaterials = useMemo(() => {
    const poultryMaterials = poultryCatalog
      .map(toPoultryMaterial)
      .filter((item) => item.id && item.name);

    const byBarcode = new Map();
    const withoutBarcode = [];
    [...DEMO_RAW_MATERIALS, ...poultryMaterials].forEach((item) => {
      const barcode = normalizeProductBarcode(item.barcode);
      if (!barcode) {
        withoutBarcode.push(item);
        return;
      }
      if (!byBarcode.has(barcode) || item.isPoultry)
        byBarcode.set(barcode, item);
    });
    return [...byBarcode.values(), ...withoutBarcode];
  }, [poultryCatalog]);

  const filteredCatalog = useMemo(() => {
    const keyword = catalogSearch.trim().toLowerCase();

    return rawMaterials.filter(
      (item) =>
        String(item.name || "")
          .toLowerCase()
          .includes(keyword) || String(item.barcode || "").includes(keyword),
    );
  }, [catalogSearch, rawMaterials]);

  const filteredDetailCatalog = useMemo(() => {
    const keyword = detailCatalogSearch.trim().toLowerCase();

    return rawMaterials.filter(
      (item) =>
        String(item.name || "")
          .toLowerCase()
          .includes(keyword) || String(item.barcode || "").includes(keyword),
    );
  }, [detailCatalogSearch, rawMaterials]);

  const selectedMaterial = useMemo(
    () =>
      rawMaterials.find(
        (item) => String(item.id) === String(ingredientDraft.catalogId),
      ),
    [ingredientDraft.catalogId, rawMaterials],
  );

  const selectedDetailMaterial = useMemo(
    () =>
      rawMaterials.find(
        (item) => String(item.id) === String(detailDraft.catalogId),
      ),
    [detailDraft.catalogId, rawMaterials],
  );

  /* Supplier Helpers */

  const getSuppliersForMaterial = (material) => {
    if (!material) return [];

    const supplierIds = [
      ...(Array.isArray(material.supplierIds) ? material.supplierIds : []),
      material.supplierId,
      ...(Array.isArray(material.suppliers)
        ? material.suppliers.map(
            (supplier) =>
              supplier?.supplierId ?? supplier?.supplier_id ?? supplier?.id,
          )
        : []),
    ]
      .filter((id) => id !== undefined && id !== null && id !== "")
      .map(String);

    const uniqueSupplierIds = [...new Set(supplierIds)];

    // البحث باستخدام معرفات الموردين القادمة من API.
    if (uniqueSupplierIds.length) {
      return suppliers.filter((supplier) =>
        uniqueSupplierIds.includes(
          String(supplier.id ?? supplier.supplierId ?? supplier.supplier_id),
        ),
      );
    }

    // الرجوع للاسم فقط عند عدم وجود أي معرف.
    const supplierName =
      material.supplierName ||
      material.suppliers?.[0]?.supplierName ||
      material.suppliers?.[0]?.name ||
      "";

    if (!supplierName) return [];

    const targetName = normalizeSupplierName(supplierName);

    return suppliers.filter(
      (supplier) =>
        normalizeSupplierName(supplier.name || supplier.supplierName || "") ===
        targetName,
    );
  };

  /* Ingredient Pricing */

  const getIngredientPricing = (draft, material, selectedDate) => {
    if (!material) {
      return {
        isPoultry: false,
        price: null,
        error: "اختر الخامة أولاً",
      };
    }

    const isPoultry = isPoultryMaterial(material);

    if (!isPoultry) {
      const config = getMaterialUsageConfig(material);

      if (!config) {
        return {
          isPoultry: false,
          price: null,
          error: "لا يوجد سعر شراء صالح لهذه الخامة في ملف الخامات",
        };
      }

      return {
        isPoultry: false,
        price: config.price,
        priceUnit: config.priceUnit,
        priceLabel: config.priceLabel,
        error: null,
      };
    }

    const supplierProductId = String(
      material.factorProductKey ||
        (material.itemean
          ? `itemean:${String(material.itemean).trim()}`
          : material.barcode
            ? `barcode:${String(material.barcode).trim()}`
            : material.id || ""),
    ).trim();

    if (!supplierProductId) {
      return {
        isPoultry: true,
        price: null,
        error: "الصنف لا يحتوي على باركود صالح لربطه بمعامل المورد",
      };
    }

    if (!draft.poultryType) {
      return {
        isPoultry: true,
        price: null,
        error: "اختر نوع البورصة",
      };
    }

    if (!selectedDate) {
      return {
        isPoultry: true,
        price: null,
        error: "حدد تاريخ التكلفة أولاً",
      };
    }

    const exchange = getExchangeByDate(exchanges, selectedDate);

    if (!exchange) {
      return {
        isPoultry: true,
        price: null,
        error: "لا توجد بورصة في هذا التاريخ أو قبله",
      };
    }

    // نبدأ بالموردين المرتبطين بالصنف، ثم نضيف بقية الموردين
    // حتى لا يمنع نقص supplierIds ظهور مورد لديه معامل صالح بالفعل.
    const linkedSuppliers = getSuppliersForMaterial(material);
    const allSuppliers = [...linkedSuppliers, ...suppliers];
    const uniqueSuppliers = [
      ...new Map(
        allSuppliers
          .map((supplier) => {
            const id = String(
              supplier?.id ??
                supplier?.supplierId ??
                supplier?.supplier_id ??
                "",
            ).trim();
            return [id, supplier];
          })
          .filter(([id]) => Boolean(id)),
      ).values(),
    ];

    const validCandidates = [];

    // لا يُقبل المورد إلا إذا كان لديه فترة فعالة وسعر بورصة ومعامل صالح.

    uniqueSuppliers.forEach((supplier) => {
      const period = getActiveSupplierPeriod(supplier, selectedDate);

      if (!period) return;

      const supplierId =
        supplier.id ?? supplier.supplierId ?? supplier.supplier_id;

      const supplierPrice = getSupplierExchangePrice({
        exchange,
        supplierId,
        type: draft.poultryType,
      });

      if (
        supplierPrice === null ||
        supplierPrice === undefined ||
        !Number.isFinite(Number(supplierPrice)) ||
        Number(supplierPrice) <= 0
      ) {
        return;
      }

      // أعلى معامل = معامل الصنف الأساسي أو أعلى override لأي فرع.
      const highestFactor = getHighestSupplierFactor({
        supplier,
        productId: supplierProductId,
        date: selectedDate,
      });

      if (
        !Number.isFinite(Number(highestFactor)) ||
        Number(highestFactor) <= 0
      ) {
        return;
      }

      const finalPrice = Number(supplierPrice) * highestFactor;

      if (!Number.isFinite(finalPrice) || finalPrice <= 0) {
        return;
      }

      validCandidates.push({
        supplier,
        supplierId,
        supplierPrice: Number(supplierPrice),
        factor: highestFactor,
        price: finalPrice,
        period,
      });
    });

    if (!validCandidates.length) {
      return {
        isPoultry: true,
        price: null,
        error: "لا يوجد مورد لديه سعر بورصة ومعامل ساري في التاريخ المحدد",
      };
    }

    // اختيار المورد صاحب أعلى معامل.
    // عند تساوي المعامل نختار الأعلى في السعر النهائي.

    validCandidates.sort((a, b) => {
      if (b.factor !== a.factor) {
        return b.factor - a.factor;
      }

      return b.price - a.price;
    });

    const selectedCandidate = validCandidates[0];

    return {
      isPoultry: true,
      price: selectedCandidate.price,
      priceUnit: "كيلو",
      priceLabel: "سعر الكيلو",

      supplierPrice: selectedCandidate.supplierPrice,
      factor: selectedCandidate.factor,

      supplier: selectedCandidate.supplier,
      supplierId: selectedCandidate.supplierId,
      supplierProductId,
      exchange,
      period: selectedCandidate.period,
      exchangeDate: exchange.date,

      error: null,
    };
  };

  /* Ingredient Selector */

  const renderIngredientSelector = (
    draft,
    setDraft,
    catalog,
    material,
    catalogKeyword,
    setCatalogKeyword,
    selectedDate,
  ) => {
    const updateDraft = (changes) => {
      setDraft((previous) => ({
        ...previous,
        ...changes,
      }));
    };

    const isPoultry = isPoultryMaterial(material);

    const pricing = material
      ? getIngredientPricing(draft, material, selectedDate)
      : null;

    const previewCost =
      pricing && !pricing.error
        ? calculateIngredientCost(draft, material, pricing)
        : 0;

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Material */}

        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-bold text-slate-700">
            اختر الخامة
          </label>

          <input
            value={catalogKeyword}
            onChange={(event) => setCatalogKeyword(event.target.value)}
            placeholder="ابحث باسم الخامة أو الباركود..."
            className={inputClass}
          />

          <select
            value={draft.catalogId || ""}
            onChange={(event) => {
              const selected = rawMaterials.find(
                (item) => String(item.id) === event.target.value,
              );

              setDraft({
                ...EMPTY_INGREDIENT,
                ...getDraftForMaterial(selected),
              });
            }}
            className={`${inputClass} mt-2`}
          >
            <option value="">اختر الخامة</option>

            {catalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} {item.barcode ? `- ${item.barcode}` : ""}
              </option>
            ))}
          </select>
        </div>

        {material && (
          <>
            {/* Poultry Information */}

            {isPoultry && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 md:col-span-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">⚡</span>

                  <p className="font-bold text-orange-900">
                    اختيار المورد والمعامل تلقائيًا
                  </p>
                </div>

                <p className="mt-2 text-xs leading-6 text-orange-800">
                  يتم البحث في جميع الموردين المرتبطين بالصنف واختيار المورد
                  صاحب أعلى معامل ساري في جميع الفروع.
                </p>
              </div>
            )}

            {isPoultry && (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  نوع البورصة
                </label>

                <select
                  value={draft.poultryType || "white"}
                  onChange={(event) =>
                    updateDraft({
                      poultryType: event.target.value,
                    })
                  }
                  className={inputClass}
                >
                  <option value="white">دجاج أبيض</option>
                  <option value="baladi">دجاج بلدي</option>
                </select>
              </div>
            )}

            {/* Calculation Type */}

            {!isPoultry && (
              <div>
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  طريقة حساب الاستخدام
                </label>

                <select
                  value={draft.calculationType}
                  onChange={(event) => {
                    const type = event.target.value;

                    updateDraft({
                      calculationType: type,
                      packageSize: "",
                      packageUnit: getBaseUnitLabel(type),
                      pieceMode: type === "piece" ? "count" : "weight",
                      packagePieces: "1",
                      pieceWeight: "",
                      pieceWeightUnit: "جرام",
                      quantity: "",
                      unit: getUsageUnits(type)[0],
                    });
                  }}
                  className={inputClass}
                >
                  {CALCULATION_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Package Size */}

            {!isPoultry && draft.calculationType !== "piece" && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    حجم أو وزن العبوة
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={draft.packageSize}
                    onChange={(event) =>
                      updateDraft({
                        packageSize: event.target.value,
                      })
                    }
                    placeholder="أدخل الكمية"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    وحدة العبوة
                  </label>

                  <select
                    value={draft.packageUnit}
                    onChange={(event) =>
                      updateDraft({
                        packageUnit: event.target.value,
                      })
                    }
                    className={inputClass}
                  >
                    {getUsageUnits(draft.calculationType).map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Piece Calculation */}

            {!isPoultry && draft.calculationType === "piece" && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    عدد القطع في العبوة
                  </label>

                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={draft.packagePieces}
                    onChange={(event) =>
                      updateDraft({
                        packagePieces: event.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    طريقة حساب القطعة
                  </label>

                  <select
                    value={draft.pieceMode}
                    onChange={(event) => {
                      const mode = event.target.value;

                      updateDraft({
                        pieceMode: mode,
                        unit: mode === "count" ? "قطعة" : "جرام",
                      });
                    }}
                    className={inputClass}
                  >
                    <option value="count">بالعدد</option>
                    <option value="weight">بالوزن</option>
                  </select>
                </div>

                {draft.pieceMode === "weight" && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        وزن القطعة الواحدة
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={draft.pieceWeight}
                        onChange={(event) =>
                          updateDraft({
                            pieceWeight: event.target.value,
                          })
                        }
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        وحدة وزن القطعة
                      </label>

                      <select
                        value={draft.pieceWeightUnit}
                        onChange={(event) =>
                          updateDraft({
                            pieceWeightUnit: event.target.value,
                          })
                        }
                        className={inputClass}
                      >
                        {WEIGHT_UNITS.map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Usage Quantity */}

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                الكمية المستخدمة
              </label>

              <input
                type="number"
                min="0"
                step="any"
                value={draft.quantity}
                onChange={(event) =>
                  updateDraft({
                    quantity: event.target.value,
                  })
                }
                placeholder="أدخل الكمية المستخدمة"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-slate-700">
                وحدة الاستخدام
              </label>

              <select
                value={draft.unit}
                onChange={(event) =>
                  updateDraft({
                    unit: event.target.value,
                  })
                }
                className={inputClass}
              >
                {(isPoultry
                  ? WEIGHT_UNITS
                  : getUsageUnits(draft.calculationType)
                ).map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </select>
            </div>

            {/* Price Preview */}

            <div className="rounded-xl border border-slate-200 bg-white p-4 md:col-span-2">
              {pricing?.error ? (
                <p className="text-sm font-semibold text-red-600">
                  {pricing.error}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">
                      {pricing?.priceLabel || "سعر الشراء"}
                    </p>

                    <p className="mt-1 font-extrabold text-slate-800">
                      {pricing ? money(pricing.price) : "—"} جنيه
                    </p>
                  </div>

                  {pricing?.isPoultry && (
                    <>
                      <div>
                        <p className="text-xs text-slate-500">
                          المورد المختار تلقائيًا
                        </p>

                        <p className="mt-1 font-extrabold text-slate-800">
                          {pricing.supplier?.name || "—"}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-500">أعلى معامل</p>

                        <p className="mt-1 font-extrabold text-slate-800">
                          {pricing.factor ?? "—"}
                        </p>
                      </div>
                    </>
                  )}

                  <div>
                    <p className="text-xs text-slate-500">
                      تكلفة الكمية المستخدمة
                    </p>

                    <p className="mt-1 font-extrabold text-orange-700">
                      {money(previewCost)} جنيه
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    );
  };

  /* Ingredient Validation */

  const validateIngredientDraft = (draft, material, pricing) => {
    if (!material) return "اختر الخامة أولاً";
    if (pricing.error) return pricing.error;

    const quantity = Number(draft.quantity);

    if (!Number.isFinite(quantity) || quantity <= 0) {
      return "أدخل كمية استخدام صحيحة أكبر من صفر";
    }

    if (pricing.isPoultry) {
      if (!WEIGHT_UNITS.includes(draft.unit)) {
        return "وحدة الدواجن يجب أن تكون جرام أو كيلو";
      }

      return null;
    }

    if (draft.calculationType === "weight") {
      if (!WEIGHT_UNITS.includes(draft.packageUnit)) {
        return "اختر وحدة وزن العبوة";
      }

      if (!Number(draft.packageSize) || Number(draft.packageSize) <= 0) {
        return "أدخل وزن العبوة";
      }

      if (!WEIGHT_UNITS.includes(draft.unit)) {
        return "اختر وحدة استخدام صحيحة: جرام أو كيلو";
      }
    }

    if (draft.calculationType === "volume") {
      if (!VOLUME_UNITS.includes(draft.packageUnit)) {
        return "اختر وحدة حجم العبوة";
      }

      if (!Number(draft.packageSize) || Number(draft.packageSize) <= 0) {
        return "أدخل حجم العبوة";
      }

      if (!VOLUME_UNITS.includes(draft.unit)) {
        return "اختر وحدة استخدام صحيحة: مل أو لتر";
      }
    }

    if (draft.calculationType === "piece") {
      if (!Number(draft.packagePieces) || Number(draft.packagePieces) <= 0) {
        return "أدخل عدد القطع الموجودة في العبوة";
      }

      if (draft.pieceMode === "weight") {
        if (!Number(draft.pieceWeight) || Number(draft.pieceWeight) <= 0) {
          return "أدخل وزن القطعة الواحدة";
        }

        if (!WEIGHT_UNITS.includes(draft.pieceWeightUnit)) {
          return "اختر وحدة وزن القطعة";
        }

        if (!WEIGHT_UNITS.includes(draft.unit)) {
          return "وحدة الاستخدام يجب أن تكون جرام أو كيلو";
        }
      } else if (!COUNT_UNITS.includes(draft.unit)) {
        return "وحدة الاستخدام يجب أن تكون قطعة";
      }
    }

    return null;
  };

  /* Ingredient Creation */

  const createIngredient = (
    draft,
    selectedDate = costDate,
    materialOverride = null,
  ) => {
    const material =
      materialOverride ||
      rawMaterials.find((item) => String(item.id) === String(draft.catalogId));

    if (!material) return null;

    const pricing = getIngredientPricing(draft, material, selectedDate);

    const validationError = validateIngredientDraft(draft, material, pricing);

    if (validationError) return { error: validationError };

    const totalCost = calculateIngredientCost(draft, material, pricing);

    if (!Number.isFinite(totalCost) || totalCost <= 0) {
      return {
        error: "تعذر حساب تكلفة المكون، راجع بيانات العبوة والكمية",
      };
    }

    const quantityKg = calculateIngredientQuantityKg(draft, pricing);

    const ingredient = {
      id: Date.now() + Math.random(),
      ingredientProductId: material.id,
      name: material.name,
      barcode: material.barcode,
      itemean: material.itemean || "",
      factorProductKey: material.factorProductKey || "",

      unitPrice: pricing.price,
      priceUnit: pricing.priceUnit,
      priceLabel: pricing.priceLabel,

      quantity: Number(draft.quantity),
      unit: draft.unit,
      quantityKg,
      totalCost,

      calculationType: pricing.isPoultry ? "weight" : draft.calculationType,
      packageSize: draft.packageSize || "",
      packageUnit: draft.packageUnit || "",
      pieceMode: draft.pieceMode || "",
      packagePieces: draft.packagePieces || "",
      pieceWeight: draft.pieceWeight || "",
      pieceWeightUnit: draft.pieceWeightUnit || "",

      costDate: selectedDate,
      isPoultry: pricing.isPoultry,
      isBaseProduct: Boolean(draft.isBaseProduct),
    };

    if (pricing.isPoultry) {
      ingredient.supplierId = String(
        pricing.supplierId ??
          pricing.supplier.id ??
          pricing.supplier.supplierId ??
          pricing.supplier.supplier_id ??
          "",
      );
      ingredient.supplierName =
        pricing.supplier.name || pricing.supplier.supplierName || "مورد";
      ingredient.supplierProductId = pricing.supplierProductId;
      ingredient.poultryType = draft.poultryType;
      ingredient.poultryTypeLabel = getExchangeTypeLabel(draft.poultryType);
      ingredient.exchangeDate = pricing.exchangeDate;
      ingredient.exchangePrice = pricing.supplierPrice;
      ingredient.factor = pricing.factor;

      const supplierExchangePrice =
        pricing.exchange.supplierPrices?.[pricing.supplier.id]?.[
          draft.poultryType
        ];

      ingredient.priceSource =
        supplierExchangePrice !== undefined &&
        supplierExchangePrice !== null &&
        supplierExchangePrice !== ""
          ? "سعر مورد معدل"
          : "سعر البورصة الأساسي";
    } else {
      ingredient.priceSource = "سعر الكتالوج";
      ingredient.purchaseUnit = material.unit;
      ingredient.usagePrice = totalCost / Number(draft.quantity);
    }

    return ingredient;
  };

  /* Product Calculations */

  const calculateProduct = (product, productIngredients) => {
    const totalCost = productIngredients.reduce(
      (sum, item) => sum + Number(item.totalCost || 0),
      0,
    );

    const totalQuantityKg = productIngredients.reduce((sum, item) => {
      const quantityKg =
        item.quantityKg !== undefined && item.quantityKg !== null
          ? Number(item.quantityKg)
          : getQuantityKg(item.quantity, item.unit);

      return sum + (Number.isFinite(quantityKg) ? quantityKg : 0);
    }, 0);

    const costPerKg = totalQuantityKg > 0 ? totalCost / totalQuantityKg : 0;

    return {
      ...product,
      ingredients: productIngredients,
      totalCost,
      totalQuantityKg,
      costPerKg,
    };
  };

  /* Reset Helpers */

  const resetIngredientDraft = () => {
    setIngredientDraft({
      ...EMPTY_INGREDIENT,
      ...getDefaultCalculation(null),
      supplierId: "",
      poultryType: "white",
    });

    setCatalogSearch("");
  };

  const resetDetailDraft = () => {
    setDetailDraft({
      ...EMPTY_INGREDIENT,
      ...getDefaultCalculation(null),
      supplierId: "",
      poultryType: "white",
    });

    setEditingIngredientId(null);
    setDetailCatalogSearch("");
  };

  const closeDetailsModal = () => {
    setSelectedProductId(null);
    resetDetailDraft();
  };

  const resetForm = () => {
    setProductName("");
    setBaseProductId("");
    setBaseProductName("");
    setBaseProductSearch("");
    setBarcodeSearchError("");
    setIngredients([]);
    setEditingId(null);
    setCostDate(getTodayDate());
    resetIngredientDraft();
  };

  /* Modal Keyboard Handling */

  useEffect(() => {
    if (selectedProductId === null) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") closeDetailsModal();
    };

    const previousOverflow = document.body.style.overflow;

    window.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedProductId]);

  /* Main Form Calculations */

  const totalCost = useMemo(
    () =>
      ingredients.reduce(
        (total, item) => total + Number(item.totalCost || 0),
        0,
      ),
    [ingredients],
  );

  const totalQuantityKg = useMemo(
    () =>
      ingredients.reduce((total, item) => {
        const quantityKg =
          item.quantityKg !== undefined && item.quantityKg !== null
            ? Number(item.quantityKg)
            : getQuantityKg(item.quantity, item.unit);

        return total + (Number.isFinite(quantityKg) ? quantityKg : 0);
      }, 0),
    [ingredients],
  );

  const costPerKg = totalQuantityKg > 0 ? totalCost / totalQuantityKg : 0;

  /* Main Form Selling Prices */

  const mainSellingPrices = useMemo(
    () =>
      getProductSellingPrices({
        costPerKg,
        baseProductId,
        costDate,
        profitMargins,
      }),
    [costPerKg, baseProductId, costDate, profitMargins],
  );

  /* Products and Statistics */

  const filteredProducts = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return products.filter((item) =>
      String(item.name || "")
        .toLowerCase()
        .includes(keyword),
    );
  }, [products, search]);

  const stats = useMemo(
    () => ({
      count: products.length,

      totalManufacturingCost: products.reduce(
        (sum, item) => sum + Number(item.totalCost || 0),
        0,
      ),

      totalManufacturingQuantity: products.reduce(
        (sum, item) => sum + Number(item.totalQuantityKg || 0),
        0,
      ),

      ingredientsCount: products.reduce(
        (sum, item) => sum + (item.ingredients?.length || 0),
        0,
      ),
    }),
    [products],
  );

  const selectedProduct = products.find(
    (item) => item.id === selectedProductId,
  );

  const selectedProductSellingPrices = selectedProduct
    ? getProductSellingPrices({
        costPerKg: selectedProduct.costPerKg,
        baseProductId: selectedProduct.baseProductId,
        baseProductItemean: getBaseProductItemean(
          selectedProduct.ingredients || [],
          selectedProduct.baseProductId,
        ),
        costDate: selectedProduct.costDate,
        profitMargins,
      })
    : [];

  /* Main Form: Add Ingredient */

  const selectBaseProduct = async () => {
    const searchValue = normalizeProductBarcode(
      baseProductId || baseProductSearch,
    );

    if (!searchValue) {
      setBarcodeSearchError("اكتب باركود المنتج أولاً.");
      return;
    }

    setIsSearchingBarcode(true);
    setBarcodeSearchError("");

    try {
      // مصدر المنتج الأساسي هو قاعدة البيانات فقط، بدون أي كتالوج محلي أو LEGACY.
      const result = await sendHttpReq(
        `manufacturing-cost/product/${encodeURIComponent(searchValue)}`,
      );

      if (result?.success === false) {
        throw new Error(result?.message || "لم يتم العثور على المنتج.");
      }

      const apiProduct =
        result?.product || result?.data?.product || result?.data || null;

      if (!apiProduct || typeof apiProduct !== "object") {
        throw new Error("السيرفر لم يُرجع بيانات المنتج.");
      }

      const barcode = normalizeProductBarcode(
        apiProduct.barcode ||
          apiProduct.itemean ||
          apiProduct.id ||
          searchValue,
      );
      const name = String(
        apiProduct.name ||
          apiProduct.productName ||
          apiProduct.product_name ||
          apiProduct.a_name ||
          "",
      ).trim();

      if (!barcode || !name) {
        throw new Error("بيانات المنتج لا تحتوي على باركود واسم صالحين.");
      }

      const itemean = String(apiProduct.itemean ?? "").trim();
      // طابق المنتج مع كتالوج الدواجن بأكثر من مفتاح؛ بعض مصادر البيانات
      // تحفظ id كـ itemean وليس كـ barcode.
      const catalogPoultryProduct = (poultryCatalog || []).find((item) => {
        const catalogBarcode = String(item?.barcode ?? "").trim();
        const catalogId = String(item?.id ?? "").trim();
        const catalogItean = String(item?.itemean ?? "").trim();
        const catalogCode = String(item?.code ?? "").trim();
        const catalogName = normalizeSupplierName(
          item?.name || item?.a_name || "",
        );
        const targetName = normalizeSupplierName(name);

        return (
          (barcode &&
            [catalogBarcode, catalogId, catalogCode].includes(barcode)) ||
          (itemean &&
            [catalogItean, catalogId, catalogCode].includes(itemean)) ||
          (targetName && catalogName && targetName === catalogName)
        );
      });

      const rawType = String(
        apiProduct.poultryType ||
          apiProduct.poultry_type ||
          apiProduct.type ||
          apiProduct.productType ||
          apiProduct.product_type ||
          "",
      )
        .trim()
        .toLowerCase();
      const poultryName = normalizeSupplierName(name);
      const hasPoultryName = /دجاج|دواجن|فراخ|كبد وقوانص|قوانص/.test(
        poultryName,
      );
      const truthyPoultryFlag = [
        apiProduct.isPoultry,
        apiProduct.is_poultry,
        apiProduct.isPoultryProduct,
      ].some(
        (value) =>
          value === true || value === 1 || value === "1" || value === "true",
      );
      const isPoultry =
        Boolean(catalogPoultryProduct) ||
        truthyPoultryFlag ||
        hasPoultryName ||
        [
          "white",
          "baladi",
          "balady",
          "دواجن",
          "دواجن بيضاء",
          "دواجن بلدي",
        ].includes(rawType);

      const selectedProduct = {
        ...(catalogPoultryProduct || {}),
        ...apiProduct,
        id: barcode,
        barcode,
        itemean,
        name,
        suppliers:
          Array.isArray(apiProduct.suppliers) && apiProduct.suppliers.length
            ? apiProduct.suppliers
            : catalogPoultryProduct?.suppliers || [],
        supplierIds:
          Array.isArray(apiProduct.supplierIds) && apiProduct.supplierIds.length
            ? apiProduct.supplierIds
            : catalogPoultryProduct?.supplierIds || [],
      };

      const material = isPoultry
        ? toPoultryMaterial({ ...selectedProduct, isPoultry: true })
        : {
            ...selectedProduct,
            id: barcode,
            barcode,
            itemean,
            name,
            unit: String(
              apiProduct.unitName ||
                apiProduct.unit ||
                apiProduct.uom ||
                apiProduct.unit_name ||
                "قطعة",
            ).trim(),
            pricePerKg: apiProduct.pricePerKg,
            isPoultry: false,
          };

      if (!material?.id || !material?.name) {
        throw new Error("تعذر تجهيز بيانات المنتج الأساسي.");
      }

      // لا نضيف المنتج مباشرة: نعرض أولاً خانة كمية واضحة داخل الصفحة.
      setPendingBaseProduct({ material, isPoultry, barcode, name });
      setBaseProductQuantity("1");
      setBaseProductId("");
      setBaseProductName(name);
      setBaseProductSearch(`${name} - ${barcode}`);
    } catch (error) {
      console.error("Base product lookup failed:", error);
      setBarcodeSearchError(error?.message || "حدث خطأ أثناء البحث عن المنتج.");
    } finally {
      setIsSearchingBarcode(false);
    }
  };

  const confirmBaseProduct = () => {
    if (!pendingBaseProduct) return;

    const requestedQuantity = Number(
      String(baseProductQuantity).trim().replace(",", "."),
    );
    if (!Number.isFinite(requestedQuantity) || requestedQuantity <= 0) {
      setBarcodeSearchError("أدخل كمية صحيحة أكبر من صفر.");
      return;
    }

    const { material, isPoultry, barcode, name } = pendingBaseProduct;
    const draft = {
      ...getDraftForMaterial(material),
      catalogId: String(material.id),
      quantity: String(requestedQuantity),
      unit: isPoultry ? "كيلو" : material.unit || "قطعة",
      poultryType: isPoultry ? material.poultryType || "white" : undefined,
      isBaseProduct: true,
    };

    const baseIngredient = createIngredient(draft, costDate, material);
    if (!baseIngredient) {
      setBarcodeSearchError("تعذر إضافة المنتج الأساسي إلى جدول التكلفة.");
      return;
    }
    if (baseIngredient.error) {
      setBarcodeSearchError(baseIngredient.error);
      return;
    }

    setBaseProductId(barcode);
    setBaseProductName(name);
    setBaseProductSearch(`${name} - ${barcode}`);
    setIngredients((previous) => [
      { ...baseIngredient, isBaseProduct: true },
      ...previous.filter((item) => !item.isBaseProduct),
    ]);
    setPendingBaseProduct(null);
    setBarcodeSearchError("");
  };

  const cancelBaseProductSelection = () => {
    setPendingBaseProduct(null);
    setBaseProductQuantity("1");
    setBaseProductId("");
    setBaseProductName("");
    setBaseProductSearch("");
  };

  const addIngredient = () => {
    if (!ingredientDraft.catalogId) {
      alert("اختر الخامة من قائمة الأصناف");
      return;
    }

    const newIngredient = createIngredient(ingredientDraft);

    if (!newIngredient) {
      alert("تعذر إضافة المكون");
      return;
    }

    if (newIngredient.error) {
      alert(newIngredient.error);
      return;
    }

    setIngredients((prev) => [...prev, newIngredient]);

    resetIngredientDraft();
  };

  const removeIngredient = (id, { preserveBaseSelection = false } = {}) => {
    const removedIngredient = ingredients.find((item) => item.id === id);

    if (removedIngredient?.isBaseProduct && !preserveBaseSelection) {
      setBaseProductId("");
      setBaseProductName("");
      setBaseProductSearch("");
    }

    setIngredients((prev) => prev.filter((item) => item.id !== id));
  };

  const editIngredient = (item) => {
    const material = rawMaterials.find(
      (entry) => String(entry.id) === String(item.ingredientProductId),
    );

    setIngredientDraft({
      ...getDefaultCalculation(material),
      catalogId: String(item.ingredientProductId),
      quantity: String(item.quantity),
      unit: item.unit,
      supplierId: item.supplierId || "",
      poultryType: item.poultryType || "white",
      isBaseProduct: Boolean(item.isBaseProduct),

      calculationType: item.calculationType || "weight",
      packageSize: item.packageSize ?? "",
      packageUnit: item.packageUnit || "جرام",
      pieceMode: item.pieceMode || "weight",
      packagePieces: item.packagePieces || "1",
      pieceWeight: item.pieceWeight || "",
      pieceWeightUnit: item.pieceWeightUnit || "جرام",
    });

    removeIngredient(item.id, { preserveBaseSelection: true });

    window.scrollTo({ top: 300, behavior: "smooth" });
  };

  /* Save Product */

  const saveProduct = (event) => {
    event.preventDefault();

    if (!productName.trim()) {
      alert("أدخل اسم المنتج المصنع");
      return;
    }

    if (!baseProductId) {
      alert("اختر المنتج الأساسي المرتبط بالمنتج المصنع");
      return;
    }

    if (!costDate) {
      alert("حدد تاريخ التكلفة");
      return;
    }

    if (ingredients.length === 0) {
      alert("أضف مكونًا واحدًا على الأقل");
      return;
    }

    if (totalCost <= 0) {
      alert("تأكد من وجود تكلفة صحيحة للمنتج");
      return;
    }

    const existingProduct =
      editingId !== null
        ? products.find((item) => item.id === editingId)
        : null;

    const product = calculateProduct(
      {
        id: editingId ?? Date.now(),
        name: productName.trim(),
        baseProductId: String(baseProductId),
        baseProductName: baseProductName || baseProductSearch,
        costDate,
        createdAt: existingProduct?.createdAt || new Date().toISOString(),
      },
      [...ingredients],
    );

    if (editingId !== null) {
      setProducts((prev) =>
        prev.map((item) => (item.id === editingId ? product : item)),
      );
    } else {
      setProducts((prev) => [product, ...prev]);
    }

    resetForm();

    alert("تم حفظ المنتج بنجاح");
  };

  const editProduct = (product) => {
    setEditingId(product.id);
    setProductName(product.name);

    const savedBaseBarcode = String(product.baseProductId || "");
    const savedBaseName = String(product.baseProductName || "");
    setBaseProductId(savedBaseBarcode);
    setBaseProductName(savedBaseName);
    setBaseProductSearch(
      savedBaseName
        ? `${savedBaseName} - ${savedBaseBarcode}`
        : savedBaseBarcode,
    );

    setIngredients((product.ingredients || []).map((item) => ({ ...item })));

    setCostDate(product.costDate || getTodayDate());

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteProduct = (id) => {
    if (!window.confirm("هل تريد حذف المنتج؟")) return;

    setProducts((prev) => prev.filter((item) => item.id !== id));

    if (editingId === id) resetForm();

    if (selectedProductId === id) closeDetailsModal();
  };

  /* Modal: Components Details */

  const updateSelectedProduct = (updatedIngredients) => {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === selectedProductId
          ? calculateProduct(product, updatedIngredients)
          : product,
      ),
    );
  };

  const saveDetailIngredient = (event) => {
    event.preventDefault();

    if (!detailDraft.catalogId) {
      alert("اختر الخامة من قائمة الأصناف");
      return;
    }

    if (!selectedProduct) return;

    const newIngredient = createIngredient(
      detailDraft,
      selectedProduct.costDate || getTodayDate(),
    );

    if (!newIngredient) {
      alert("تعذر إضافة المكون");
      return;
    }

    if (newIngredient.error) {
      alert(newIngredient.error);
      return;
    }

    let updatedIngredients;

    if (editingIngredientId !== null) {
      updatedIngredients = (selectedProduct.ingredients || []).map((item) =>
        item.id === editingIngredientId
          ? { ...newIngredient, id: editingIngredientId }
          : item,
      );
    } else {
      updatedIngredients = [
        ...(selectedProduct.ingredients || []),
        newIngredient,
      ];
    }

    updateSelectedProduct(updatedIngredients);

    resetDetailDraft();
  };

  const editDetailIngredient = (item) => {
    const material = rawMaterials.find(
      (entry) => String(entry.id) === String(item.ingredientProductId),
    );

    setEditingIngredientId(item.id);

    setDetailDraft({
      ...getDefaultCalculation(material),
      catalogId: String(item.ingredientProductId),
      quantity: String(item.quantity),
      unit: item.unit,
      supplierId: item.supplierId || "",
      poultryType: item.poultryType || "white",

      calculationType: item.calculationType || "weight",
      packageSize: item.packageSize ?? "",
      packageUnit: item.packageUnit || "جرام",
      pieceMode: item.pieceMode || "weight",
      packagePieces: item.packagePieces || "1",
      pieceWeight: item.pieceWeight || "",
      pieceWeightUnit: item.pieceWeightUnit || "جرام",
    });

    setDetailCatalogSearch("");
  };

  const removeDetailIngredient = (id) => {
    if (!window.confirm("هل تريد حذف هذا المكون من المنتج؟")) return;

    if (!selectedProduct) return;

    const updatedIngredients = (selectedProduct.ingredients || []).filter(
      (item) => item.id !== id,
    );

    updateSelectedProduct(updatedIngredients);

    if (editingIngredientId === id) resetDetailDraft();
  };

  /* Statistics Cards */

  const statCards = [
    {
      title: "المنتجات المصنعة",
      value: stats.count.toLocaleString("en-US"),
      description: "عدد المنتجات المحفوظة",
      icon: "📦",
      color: "text-blue-700",
      bg: "bg-blue-50",
    },
    {
      title: "إجمالي المكونات",
      value: stats.ingredientsCount.toLocaleString("en-US"),
      description: "عدد المكونات داخل المنتجات",
      icon: "🧂",
      color: "text-purple-700",
      bg: "bg-purple-50",
    },
    {
      title: "إجمالي الكميات",
      value: `${stats.totalManufacturingQuantity.toFixed(3)} كجم`,
      description: "مجموع الكميات الوزنية للمنتجات المحفوظة",
      icon: "⚖️",
      color: "text-orange-700",
      bg: "bg-orange-50",
    },
    {
      title: "إجمالي تكلفة التصنيع",
      value: money(stats.totalManufacturingCost),
      description: "مجموع تكاليف المنتجات المحفوظة",
      icon: "💰",
      color: "text-green-700",
      bg: "bg-green-50",
    },
  ];

  /* Header */

  const pageHeader = (
    <div className="sticky top-0 z-50">
      <Header user={true} />
    </div>
  );

  /* ------------------------------------------------------------------------ */
  /* Main Page                                                                */
  /* ------------------------------------------------------------------------ */

  return (
    <>
      {pageHeader}

      <main
        dir="rtl"
        className="min-h-screen bg-slate-100 px-3 py-6 md:px-6 md:py-8"
      >
        <div className="mx-auto max-w-375">
          {/* Page Header */}

          <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-2xl shadow-sm">
                🏭
              </div>

              <div>
                <h1 className="text-2xl font-extrabold text-slate-800 md:text-3xl">
                  تكاليف المصنعات
                </h1>

                <p className="mt-2 text-sm text-slate-500">
                  حساب تكلفة المنتجات المصنعة بناءً على أسعار الخامات والكميات
                  المستخدمة
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/pricing/poultry")}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              ← إدارة قطاع الدواجن
            </button>
          </div>

          {/* Data Notice */}

          <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4">
            <span className="text-xl">ℹ️</span>

            <div>
              <p className="font-bold text-blue-800">
                ربط أسعار الدواجن بالبورصة ومعاملات الموردين
              </p>

              <p className="mt-1 text-sm text-blue-700">
                تكلفة خامة الدواجن = سعر المورد من البورصة × أعلى معامل ساري
                للمورد في جميع الفروع × الكمية بالكيلو. السعر المعدل للمورد يحل
                محل السعر الأساسي عند وجوده.
              </p>
            </div>
          </div>

          {/* Statistics */}

          <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {statCards.map((stat) => (
              <div
                key={stat.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-500">
                      {stat.title}
                    </p>

                    <p
                      className={`mt-3 wrap-break-word text-xl font-extrabold ${stat.color}`}
                    >
                      {stat.value}
                    </p>
                  </div>

                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-xl ${stat.bg}`}
                  >
                    {stat.icon}
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  {stat.description}
                </p>
              </div>
            ))}
          </div>

          {/* Manufacturing Form */}

          <section className="mb-7 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 md:px-7">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">
                  {editingId !== null
                    ? "تعديل المنتج المصنع"
                    : "إنشاء تكلفة منتج مصنع"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  حدد المنتج الأساسي والتاريخ، ثم أضف الخامات والكميات المستخدمة
                </p>
              </div>

              {editingId !== null && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            <form onSubmit={saveProduct} className="p-5 md:p-7">
              {/* Product Name, Base Product and Date */}

              <div className="mb-7 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    اسم المنتج المصنع
                  </label>

                  <input
                    value={productName}
                    onChange={(event) => setProductName(event.target.value)}
                    placeholder="مثال: دجاج متبل"
                    className={inputClass}
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    المنتج الأساسي المرتبط
                  </label>

                  <div className="relative">
                    <div className="flex gap-2">
                      <input
                        value={baseProductSearch}
                        onChange={(event) => {
                          setBaseProductSearch(event.target.value);
                          setBaseProductId("");
                          setBaseProductName("");
                          setPendingBaseProduct(null);
                          setBarcodeSearchError("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !baseProductId) {
                            event.preventDefault();
                            selectBaseProduct();
                          }
                        }}
                        placeholder="اكتب باركود المنتج الأساسي..."
                        className={`${inputClass} min-w-0 flex-1`}
                        autoComplete="off"
                        required
                      />

                      <button
                        type="button"
                        onClick={() => selectBaseProduct()}
                        disabled={
                          isSearchingBarcode || !baseProductSearch.trim()
                        }
                        className="shrink-0 rounded-xl bg-orange-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                      >
                        {isSearchingBarcode ? "جاري البحث..." : "بحث"}
                      </button>
                    </div>
                  </div>

                  {isSearchingBarcode && (
                    <p className="mt-2 text-sm font-semibold text-orange-600">
                      جاري البحث عن المنتج...
                    </p>
                  )}

                  {pendingBaseProduct && (
                    <div className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-4">
                      <p className="mb-2 text-sm font-bold text-slate-800">
                        {pendingBaseProduct.name}
                      </p>
                      <label className="mb-2 block text-sm font-bold text-slate-700">
                        {pendingBaseProduct.isPoultry
                          ? "الكمية المطلوبة بالكيلو"
                          : `الكمية المطلوبة (${pendingBaseProduct.material.unit || "وحدة"})`}
                      </label>
                      <input
                        type="number"
                        min="0.001"
                        step="0.001"
                        inputMode="decimal"
                        value={baseProductQuantity}
                        onChange={(event) =>
                          setBaseProductQuantity(event.target.value)
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            confirmBaseProduct();
                          }
                        }}
                        className={inputClass}
                        placeholder="مثال: 1.5 أو 2"
                        autoFocus
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={confirmBaseProduct}
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                        >
                          تأكيد وإضافة للجدول
                        </button>
                        <button
                          type="button"
                          onClick={cancelBaseProductSelection}
                          className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  {barcodeSearchError && (
                    <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-600">
                      {barcodeSearchError}
                    </p>
                  )}

                  <p className="mt-2 text-xs text-slate-400">
                    بعد البحث، حدد الكمية واضغط «تأكيد وإضافة للجدول».
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-slate-700">
                    تاريخ حساب التكلفة
                  </label>

                  <input
                    type="date"
                    value={costDate}
                    onChange={(event) => setCostDate(event.target.value)}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              {/* Add Ingredient */}

              <div className="mb-6 rounded-2xl border border-orange-100 bg-orange-50/60 p-4 md:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-xl">
                    🧂
                  </div>

                  <div>
                    <h3 className="font-extrabold text-slate-800">
                      إضافة خامة أو مكون
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      اختر طريقة حساب الخامة، ثم أدخل بيانات العبوة والكمية
                      المستخدمة
                    </p>
                  </div>
                </div>

                {renderIngredientSelector(
                  ingredientDraft,
                  setIngredientDraft,
                  filteredCatalog,
                  selectedMaterial,
                  catalogSearch,
                  setCatalogSearch,
                  costDate,
                )}

                <button
                  type="button"
                  onClick={addIngredient}
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-700 active:scale-[0.98]"
                >
                  <span className="text-lg">+</span>
                  إضافة المكون
                </button>
              </div>

              {/* Ingredients Table */}

              <div className="mb-7 overflow-hidden rounded-xl border border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-4">
                  <h3 className="font-extrabold text-slate-800">
                    مكونات المنتج
                  </h3>

                  <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
                    {ingredients.length} مكون
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-262.5 border-separate border-spacing-0 text-right">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="whitespace-nowrap px-4 py-3 text-sm">
                          #
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-sm">
                          اسم الخامة
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-sm">
                          المورد / المصدر
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-sm">
                          نوع البورصة
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-sm">
                          سعر الشراء
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-sm">
                          الكمية
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-sm">
                          الوحدة
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-sm">
                          التكلفة
                        </th>
                        <th className="whitespace-nowrap px-4 py-3 text-center text-sm">
                          الإجراءات
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {ingredients.map((item, index) => (
                        <tr
                          key={item.id}
                          className="transition hover:bg-orange-50/50"
                        >
                          <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-400">
                            {index + 1}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4 font-bold text-slate-800">
                            <div>{item.name}</div>
                            {item.isBaseProduct && (
                              <span className="mt-1 inline-flex rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">
                                المنتج الأساسي
                              </span>
                            )}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                            {item.supplierName || item.priceSource || "—"}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                            {item.poultryTypeLabel || "—"}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                            {money(item.unitPrice)} جنيه /{" "}
                            {item.priceUnit || "وحدة"}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                            {item.quantity}
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                              {item.unit}
                            </span>
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4 text-sm font-bold text-slate-700">
                            {money(item.totalCost)} جنيه
                          </td>

                          <td className="border-b border-slate-100 px-4 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => editIngredient(item)}
                                className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                              >
                                تعديل
                              </button>

                              <button
                                type="button"
                                onClick={() => removeIngredient(item.id)}
                                className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                              >
                                حذف
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {ingredients.length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-4 py-12 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                              🧂
                            </div>

                            <p className="mt-3 font-bold text-slate-600">
                              لم تتم إضافة مكونات بعد
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                              اختر الخامات من القائمة بالأعلى
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Calculation Summary */}

              <div className="mb-7">
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xl">🧮</span>

                  <h3 className="font-extrabold text-slate-800">
                    ملخص تكلفة التصنيع
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
                    <p className="text-sm font-medium text-blue-700">
                      إجمالي الكمية الوزنية
                    </p>

                    <p className="mt-3 text-2xl font-extrabold text-blue-800">
                      {totalQuantityKg.toFixed(3)}
                      <span className="mr-2 text-sm font-bold">كيلو</span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-medium text-slate-500">
                      إجمالي تكلفة المكونات
                    </p>

                    <p className="mt-3 text-2xl font-extrabold text-slate-800">
                      {money(totalCost)}

                      <span className="mr-2 text-sm font-bold text-slate-500">
                        جنيه
                      </span>
                    </p>
                  </div>

                  <div className="rounded-xl border border-orange-200 bg-orange-50 p-5">
                    <p className="text-sm font-medium text-orange-700">
                      تكلفة الكيلو الواحد
                    </p>

                    <p className="mt-3 text-2xl font-extrabold text-orange-700">
                      {money(costPerKg)}

                      <span className="mr-2 text-sm font-bold">جنيه</span>
                    </p>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  تكلفة خامة الدواجن = سعر المورد من البورصة × معامل المورد
                  والفرع × الكمية بالكيلو. السعر المعدل للمورد يحل محل السعر
                  الأساسي عند وجوده.
                </p>

                {/* Selling Prices */}

                <SellingPricesTable
                  prices={mainSellingPrices}
                  costPerKg={costPerKg}
                />
              </div>

              {/* Form Actions */}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-8 py-3 font-bold text-white shadow-sm transition hover:bg-orange-700 hover:shadow-md active:scale-[0.98]"
                >
                  <span>{editingId !== null ? "✓" : "+"}</span>

                  {editingId !== null
                    ? "حفظ تعديلات المنتج"
                    : "حفظ المنتج وتكلفته"}
                </button>

                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  تفريغ النموذج
                </button>
              </div>
            </form>
          </section>

          {/* Saved Products */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-7">
              <div>
                <h2 className="text-lg font-extrabold text-slate-800">
                  المنتجات المصنعة
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  عرض وإدارة المنتجات التي تم حساب تكلفتها
                </p>
              </div>

              <div className="relative w-full md:max-w-sm">
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                  🔍
                </span>

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="ابحث باسم المنتج..."
                  className={`${inputClass} pr-11`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-5 py-3 text-xs text-slate-500 md:px-7">
              <span>
                عدد النتائج:{" "}
                <strong className="text-slate-800">
                  {filteredProducts.length}
                </strong>
              </span>

              <span>جميع التكاليف بالجنيه المصري</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-262.5 border-separate border-spacing-0 text-right">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="whitespace-nowrap px-4 py-4 text-sm">#</th>
                    <th className="whitespace-nowrap px-4 py-4 text-sm">
                      اسم المنتج
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-sm">
                      المنتج الأساسي
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-sm">
                      تاريخ التكلفة
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-sm">
                      عدد المكونات
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-sm">
                      إجمالي الكمية
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-sm">
                      إجمالي التكلفة
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-sm">
                      تكلفة الكيلو
                    </th>
                    <th className="whitespace-nowrap px-4 py-4 text-center text-sm">
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredProducts.map((item, index) => {
                    return (
                      <tr
                        key={item.id}
                        className="transition hover:bg-orange-50/50"
                      >
                        <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-400">
                          {index + 1}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 font-bold text-slate-800">
                          {item.name}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                          {item.baseProductName ||
                            item.baseProductId ||
                            "غير محدد"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                          {item.costDate || "—"}
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <button
                            type="button"
                            onClick={() => {
                              resetDetailDraft();
                              setSelectedProductId(item.id);
                            }}
                            className="rounded-lg bg-purple-50 px-3 py-2 text-xs font-bold text-purple-700 transition hover:bg-purple-100 hover:underline"
                            title="عرض وإدارة مكونات المنتج"
                          >
                            {item.ingredients?.length || 0} مكون ←
                          </button>
                        </td>

                        <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                          {Number(item.totalQuantityKg || 0).toFixed(3)} كيلو
                        </td>

                        <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-700">
                          {money(item.totalCost)} جنيه
                        </td>

                        <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4">
                          <span className="font-extrabold text-orange-700">
                            {money(item.costPerKg)} جنيه
                          </span>
                        </td>

                        <td className="border-b border-slate-100 px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => editProduct(item)}
                              className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-100"
                            >
                              تعديل
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteProduct(item.id)}
                              className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-100"
                            >
                              حذف
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-5 py-16 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-3xl">
                          🏭
                        </div>

                        <p className="mt-4 font-bold text-slate-600">
                          {search
                            ? "لا توجد نتائج مطابقة للبحث"
                            : "لا توجد منتجات مصنعة مسجلة"}
                        </p>

                        <p className="mt-2 text-sm text-slate-400">
                          {search
                            ? "جرّب البحث باسم منتج آخر"
                            : "ابدأ بإنشاء منتج مصنع وإضافة مكوناته"}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 text-xs text-slate-400 md:px-7">
              بيانات المنتجات محفوظة في التخزين المشترك مع بيانات البورصة
              ومعاملات الموردين.
            </div>
          </section>
        </div>
      </main>

      {/* Components Details Modal */}

      {selectedProduct && (
        <div
          dir="rtl"
          className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-sm sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDetailsModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="components-modal-title"
            className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-2xl"
          >
            {/* Modal Header */}

            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-xl">
                  🧂
                </div>

                <div className="min-w-0">
                  <h2
                    id="components-modal-title"
                    className="text-lg font-extrabold text-slate-800 sm:text-xl"
                  >
                    مكونات المنتج
                  </h2>

                  <p className="mt-1 truncate text-sm text-slate-500">
                    {selectedProduct.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    تاريخ التكلفة: {selectedProduct.costDate || "بدون تاريخ"}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDetailsModal}
                aria-label="إغلاق النافذة"
                title="إغلاق"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-2xl text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-5 md:p-6">
              {/* Product Summary */}

              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">عدد المكونات</p>

                  <p className="mt-2 text-2xl font-extrabold text-blue-700">
                    {selectedProduct.ingredients?.length || 0}
                  </p>
                </div>

                <div className="rounded-2xl border border-green-100 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">إجمالي التكلفة</p>

                  <p className="mt-2 text-xl font-extrabold text-green-700">
                    {money(selectedProduct.totalCost)} جنيه
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm">
                  <p className="text-sm text-slate-500">تكلفة الكيلو</p>

                  <p className="mt-2 text-xl font-extrabold text-orange-700">
                    {money(selectedProduct.costPerKg)} جنيه
                  </p>
                </div>
              </div>

              {/* Base Product Info */}

              <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-semibold text-indigo-700">
                  المنتج الأساسي المرتبط
                </p>

                <p className="mt-2 font-extrabold text-indigo-900">
                  {selectedProduct.baseProductName ||
                    selectedProduct.baseProductId ||
                    "غير محدد"}
                </p>
              </div>

              {/* Selling Prices */}

              <div className="mb-6">
                <SellingPricesTable
                  prices={selectedProductSellingPrices}
                  costPerKg={selectedProduct.costPerKg}
                />
              </div>

              {/* Add/Edit Component */}

              <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                  <h3 className="font-extrabold text-slate-800">
                    {editingIngredientId !== null
                      ? "تعديل مكون"
                      : "إضافة مكون جديد"}
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    سعر المكون الجديد يُحسب وفق تاريخ تكلفة المنتج المحفوظ.
                  </p>
                </div>

                <form onSubmit={saveDetailIngredient} className="p-4 sm:p-5">
                  {renderIngredientSelector(
                    detailDraft,
                    setDetailDraft,
                    filteredDetailCatalog,
                    selectedDetailMaterial,
                    detailCatalogSearch,
                    setDetailCatalogSearch,
                    selectedProduct.costDate || getTodayDate(),
                  )}

                  <div className="mt-5 flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-orange-700"
                    >
                      {editingIngredientId !== null
                        ? "حفظ التعديل"
                        : "+ إضافة المكون"}
                    </button>

                    {editingIngredientId !== null && (
                      <button
                        type="button"
                        onClick={resetDetailDraft}
                        className="rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                      >
                        إلغاء التعديل
                      </button>
                    )}
                  </div>
                </form>
              </section>

              {/* Components Table */}

              <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
                  <h3 className="font-extrabold text-slate-800">
                    قائمة مكونات {selectedProduct.name}
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-250 border-separate border-spacing-0 text-right">
                    <thead>
                      <tr className="bg-slate-800 text-white">
                        <th className="whitespace-nowrap px-4 py-4 text-sm">
                          #
                        </th>
                        <th className="whitespace-nowrap px-4 py-4 text-sm">
                          اسم الخامة
                        </th>
                        <th className="whitespace-nowrap px-4 py-4 text-sm">
                          المورد / المصدر
                        </th>
                        <th className="whitespace-nowrap px-4 py-4 text-sm">
                          نوع البورصة
                        </th>
                        <th className="whitespace-nowrap px-4 py-4 text-sm">
                          سعر الوحدة
                        </th>
                        <th className="whitespace-nowrap px-4 py-4 text-sm">
                          الكمية
                        </th>
                        <th className="whitespace-nowrap px-4 py-4 text-sm">
                          الوحدة
                        </th>
                        <th className="whitespace-nowrap px-4 py-4 text-sm">
                          إجمالي التكلفة
                        </th>
                        <th className="whitespace-nowrap px-4 py-4 text-center text-sm">
                          الإجراءات
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {(selectedProduct.ingredients || []).map(
                        (item, index) => (
                          <tr
                            key={item.id}
                            className="transition hover:bg-orange-50/50"
                          >
                            <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-400">
                              {index + 1}
                            </td>

                            <td className="border-b border-slate-100 px-4 py-4 font-bold text-slate-800">
                              {item.name}
                            </td>

                            <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                              {item.supplierName || item.priceSource || "—"}
                            </td>

                            <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                              {item.poultryTypeLabel || "—"}
                            </td>

                            <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                              {money(item.unitPrice)} جنيه /{" "}
                              {item.priceUnit || "وحدة"}
                            </td>

                            <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-600">
                              {item.quantity}
                            </td>

                            <td className="border-b border-slate-100 px-4 py-4">
                              <span className="rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                                {item.unit}
                              </span>
                            </td>

                            <td className="border-b border-slate-100 px-4 py-4 text-sm font-extrabold text-green-700">
                              {money(item.totalCost)} جنيه
                            </td>

                            <td className="border-b border-slate-100 px-4 py-4">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => editDetailIngredient(item)}
                                  className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100"
                                >
                                  تعديل
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    removeDetailIngredient(item.id)
                                  }
                                  className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                                >
                                  حذف
                                </button>
                              </div>
                            </td>
                          </tr>
                        ),
                      )}

                      {(selectedProduct.ingredients || []).length === 0 && (
                        <tr>
                          <td colSpan={9} className="px-5 py-14 text-center">
                            <div className="text-4xl">🧂</div>

                            <p className="mt-3 font-bold text-slate-600">
                              لا توجد مكونات لهذا المنتج
                            </p>

                            <p className="mt-1 text-sm text-slate-400">
                              يمكنك إضافة مكونات من النموذج بالأعلى
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Cost Summary */}

                <div className="grid grid-cols-1 gap-4 border-t border-slate-100 bg-slate-50 p-4 sm:grid-cols-3 sm:p-5">
                  <div>
                    <p className="text-xs text-slate-500">
                      إجمالي الكمية الوزنية
                    </p>

                    <p className="mt-1 font-extrabold text-slate-800">
                      {Number(selectedProduct.totalQuantityKg || 0).toFixed(3)}{" "}
                      كيلو
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">إجمالي التكلفة</p>

                    <p className="mt-1 font-extrabold text-green-700">
                      {money(selectedProduct.totalCost)} جنيه
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      تكلفة الكيلو الواحد
                    </p>

                    <p className="mt-1 font-extrabold text-orange-700">
                      {money(selectedProduct.costPerKg)} جنيه
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* Modal Footer */}

            <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
              <p className="text-xs text-slate-400">
                الأسعار المسجلة للمكونات القديمة لا تتغير بتحديث البورصة.
              </p>

              <button
                type="button"
                onClick={closeDetailsModal}
                className="rounded-xl bg-slate-800 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700"
              >
                العودة للمنتجات
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export default ManufacturingCost;
