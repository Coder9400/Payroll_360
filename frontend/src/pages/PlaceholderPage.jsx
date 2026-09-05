/**
 * PlaceholderPage
 * ───────────────
 * Generic placeholder used for modules not yet implemented.
 * Will be replaced page-by-page in later phases.
 */
import * as React from 'react';
import { PageHeader } from '../components/layout/PageHeader';

export function PlaceholderPage({ title, description, phase = 'a future phase' }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-xl border border-dashed border-gray-200 bg-white p-12 text-center">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-xs text-gray-400 mt-1">Will be implemented in {phase}</p>
      </div>
    </div>
  );
}
