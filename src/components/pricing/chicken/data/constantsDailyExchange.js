
export const POULTRY_TYPES = {
  white: { label: "دواجن بيضاء" },
  baladi: { label: "دواجن بلدي" },
};

export const normalizeProductType = (type) => {
  const value = String(type || "").trim().toLowerCase();

  return value === "baladi" ||
    value.includes("بلدي") ||
    value.includes("balady")
    ? "baladi"
    : "white";
};

export const normalizeSupplier = (supplier) => {
  if (!supplier) return null;

  if (typeof supplier === "string") {
    return {
      supplierId: supplier,
      supplierName: supplier,
    };
  }

  return {
    supplierId: String(
      supplier.supplierId ??
      supplier.supplier_id ??
      supplier.id ??
      supplier.code ??
      "",
    ),
    supplierName: String(
      supplier.supplierName ??
      supplier.supplier_name ??
      supplier.name ??
      supplier.a_name ??
      supplier.title ??
      "",
    ).trim(),
  };
};

export const normalizeProductSuppliers = (product) => {
  const suppliers =
    product?.suppliers ??
    product?.selectedSuppliers ??
    product?.selected_suppliers ??
    [];

  if (!Array.isArray(suppliers)) return [];

  return suppliers
    .map(normalizeSupplier)
    .filter((supplier) => supplier?.supplierId && supplier?.supplierName);
};

export const normalizeProduct = (product) => ({
  ...product,
  barcode: String(product?.barcode ?? "").trim(),
  name: String(product?.name ?? product?.a_name ?? ""),
  itemean: product?.itemean ?? "",
  unit: product?.unit ?? null,
  unitName: String(
    product?.unitName ??
    product?.unit_name ??
    product?.unitLabel ??
    product?.unit_label ??
    (typeof product?.unit === "object"
      ? product.unit.a_name ?? product.unit.name
      : "") ??
    "",
  ),
  type: normalizeProductType(product?.type),
  suppliers: normalizeProductSuppliers(product),
});

export const createExchange = (date, createdBy = "غير محدد") => ({
  id: `exchange-${date}`,
  date,
  whitePrice: "",
  baladiPrice: "",
  status: "active",
  createdBy,
  createdAt: new Date().toISOString(),
  products: [],
});

export const createProduct = (product) => {
  const normalized = normalizeProduct(product);

  return {
    id: `product-${normalized.barcode}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    barcode: normalized.barcode,
    itemean: normalized.itemean,
    name: normalized.name,
    unit: normalized.unit,
    unitName: normalized.unitName,
    type: normalized.type,
    suppliers: normalized.suppliers,
    createdAt: new Date().toISOString(),
  };
};
