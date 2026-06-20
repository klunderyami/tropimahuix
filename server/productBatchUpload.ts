import type { Firestore } from 'firebase-admin/firestore';

export interface ProductPayload {
  name: string;
  description: string;
  price: number;
  volume: string;
  image: string;
  category: 'licor' | 'torito';
  stock: number;
  active?: boolean;
}

export function isProductPayload(value: unknown): value is ProductPayload {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  const p = value as Record<string, unknown>;
  return (
    typeof p.name === 'string' &&
    typeof p.description === 'string' &&
    typeof p.price === 'number' &&
    typeof p.volume === 'string' &&
    typeof p.image === 'string' &&
    (p.category === 'licor' || p.category === 'torito') &&
    typeof p.stock === 'number'
  );
}

export async function batchUploadProducts(db: Firestore, products: ProductPayload[]): Promise<string[]> {
  const batch = db.batch();
  const ids: string[] = [];

  for (const product of products) {
    const docRef = db.collection('products').doc();
    batch.set(docRef, {
      ...product,
      active: product.active ?? true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    ids.push(docRef.id);
  }

  await batch.commit();
  return ids;
}