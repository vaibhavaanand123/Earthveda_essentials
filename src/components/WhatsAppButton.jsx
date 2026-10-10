import { t } from '../lib/i18n';
import { MessageCircle } from 'lucide-react';
import { config } from '../config';

/** Floating help link. Hidden when no WhatsApp number is configured. */
export default function WhatsAppButton() {
  if (!config.whatsappNumber) return null;
  const text = encodeURIComponent('Hi Earthveda! I have a question about your snacks.');
  return (
    <a
      className="wa-fab"
      href={`https://wa.me/${config.whatsappNumber}?text=${text}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t('Chat with us on WhatsApp (opens in a new tab)')}
    >
      <MessageCircle size={22} aria-hidden="true" />
      <span>{t('Chat with us')}</span>
    </a>
  );
}
