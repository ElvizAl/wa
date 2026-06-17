export type Product = {
  id: string;
  name: string;
  price: number;
  unit: string;
  stock: number;
  category: string;
  description?: string;
};

export const products: Product[] = [
  { id: "apel", name: "Apel Fuji", price: 25000, unit: "kg", stock: 12, category: "Buah Import", description: "Apel merah manis dan renyah" },
  { id: "pisang", name: "Pisang Cavendish", price: 18000, unit: "sisir", stock: 0, category: "Buah Lokal", description: "Pisang cavendish premium" },
  { id: "mangga", name: "Mangga Harum Manis", price: 30000, unit: "kg", stock: 8, category: "Buah Lokal", description: "Mangga manis dari Perlis" },
  { id: "jeruk", name: "Jeruk Mandarin", price: 22000, unit: "kg", stock: 25, category: "Buah Import", description: "Jeruk mandarin manis" },
  { id: "anggur", name: "Anggur Hijau", price: 45000, unit: "kg", stock: 5, category: "Buah Import", description: "Anggur seedless" },
  { id: "semangka", name: "Semangka Merah", price: 15000, unit: "kg", stock: 20, category: "Buah Lokal", description: "Semangka segar dan manis" },
  { id: "melon", name: "Melon Golden", price: 35000, unit: "buah", stock: 3, category: "Buah Lokal", description: "Melon golden besar" },
  { id: "stroberi", name: "Stroberi", price: 40000, unit: "pack", stock: 7, category: "Buah Import", description: "Stroberi segar 250gr" },
];

export function getProductByName(name: string): Product | undefined {
  const lower = name.toLowerCase();
  return products.find((p) => p.name.toLowerCase().includes(lower) || p.id === lower);
}

export function getAvailableProducts(): Product[] {
  return products.filter((p) => p.stock > 0);
}

export function formatProduct(product: Product): string {
  return `${product.name} - Rp${product.price.toLocaleString("id-ID")}/${product.unit} (stok: ${product.stock} ${product.unit})`;
}

export function getStockSummary(): string {
  const available = getAvailableProducts();
  if (available.length === 0) return "Maaf, semua buah sedang kosong.";
  return available.map(formatProduct).join("\n");
}
