import { t } from '../lib/i18n';
import { Component } from 'react';
export default class ErrorBoundary extends Component {
  state = {
    failed: false,
  };
  static getDerivedStateFromError() {
    return {
      failed: true,
    };
  }
  componentDidCatch(error, info) {
    // Hook an error tracker (e.g. Sentry) here.
    console.error('Storefront crashed', error, info?.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="page container empty">
        <h1>{t('This page didn\u2019t load properly')}</h1>
        <p>{t('Your cart is saved. Reload the page to continue shopping.')}</p>
        <button className="btn btn--ink" type="button" onClick={() => window.location.reload()}>
          {t('Reload page')}
        </button>
      </main>
    );
  }
}
