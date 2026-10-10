import { apiRequest } from './apiClient';

export const orderService = {
  lookup: (orderNumber, phone) =>
    apiRequest('/orders/lookup', { method: 'POST', body: { orderNumber, phone } }).then(
      (r) => r.order,
    ),
};
