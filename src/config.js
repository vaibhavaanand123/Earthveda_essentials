const preview = import.meta.env.VITE_PREVIEW_MODE === 'true';
export const config = {
  apiBaseUrl: preview ? '' : '/api',
  publicSiteUrl: import.meta.env.VITE_PUBLIC_SITE_URL || '',
  appName: 'Earthveda Essentials',
  whatsappNumber: '',
  catalogMode: preview ? 'preview' : 'api',
};
export const orderingMode = preview ? 'disabled' : 'api';
