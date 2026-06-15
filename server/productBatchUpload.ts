import { FieldValue } from 'firebase-admin/firestore';
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

export function isProductPayload(payload: Partial<ProductPayload>): payload is ProductPayload {
  const stock = payload.stock;

  return (
    typeof payload.name === 'string' &&
    typeof payload.description === 'string' &&
    typeof payload.price === 'number' &&
    payload.price > 0 &&
    typeof payload.volume === 'string' &&
    typeof payload.image === 'string' &&
    (payload.category === 'licor' || payload.category === 'torito') &&
    typeof stock === 'number' &&
    Number.isInteger(stock) &&
    stock >= 0
  );
}

export async function batchUploadProducts(db: Firestore, products: ProductPayload[]): Promise<string[]> {
  if (products.length === 0) {
    return [];
  }

  if (products.length > 500) {
    throw new Error('Firestore batch writes are limited to 500 products per request.');
  }

  const batch = db.batch();
  const now = FieldValue.serverTimestamp();
  const refs = products.map((product) => {
    const productRef = db.collection('products').doc();

    batch.set(productRef, {
      ...product,
      active: product.active ?? true,
      createdAt: now,
      updatedAt: now,
    });

    return productRef;
  });

  await batch.commit();

  return refs.map((ref) => ref.id);
}
