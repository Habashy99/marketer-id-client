
export const SUPPLIERS = [
  { id: 1, name: "مورد الإسكندرية" },
  { id: 2, name: "مورد النور" },
  { id: 3, name: "مورد الصفوة" },
  { id: 4, name: "مورد الأمل" },
  { id: 5, name: "مورد الخير" },
  { id: 6, name: "مورد المستقبل" },
  { id: 7, name: "مورد الدلتا" },
  { id: 8, name: "مورد المتحدة" },
  { id: 9, name: "مورد السلام" },
  { id: 10, name: "مورد المدينة" },
];

export const POULTRY_TYPES = {
  white: { label: "دواجن بيضاء" },
  baladi: { label: "دواجن بلدي" },
};

export const INITIAL_PRODUCTS = [
  { barcode: "2302012000008", name: "دجاج بلدي فريش", type: "baladi" },
  { barcode: "2302012000009", name: "دجاج أبيض فريش", type: "white" },
  { barcode: "2302012000010", name: "دجاج مجمد", type: "white" },
  { barcode: "2302012000011", name: "صدور دجاج", type: "white" },
  { barcode: "2302009000004", name: "فيليه دجاج فريش", type: "white" },
];

export const createExchange = (date) => ({
  date,
  whitePrice: "",
  baladiPrice: "",
  supplierPrices: {},
});

export const createProduct = (product) => ({
  id: `${product.barcode}-${Date.now()}-${Math.random()}`,
  barcode: product.barcode,
  name: product.name,
  type: product.type || "white",
  supplierId: product.supplierId || "",
});
