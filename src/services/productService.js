import { config } from '../config';
import { products } from '../../shared/catalog.js';
import { apiRequest } from './apiClient';

const isProduct = (p) =>
  p &&
  typeof p.id === 'string' &&
  typeof p.slug === 'string' &&
  p.prices &&
  typeof p.image === 'string';

export const productService = {
  async list({ signal, fresh = false } = {}) {
    if (config.catalogMode === 'preview') return products;
    const result = await apiRequest('/products', { signal, cache: fresh ? 'no-store' : 'default' });
    if (!Array.isArray(result) || !result.every(isProduct))
      throw new Error('Invalid catalogue response');
    return result;
  },
};
