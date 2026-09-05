import * as React from "react";
import { PageHeader } from "../components/layout/PageHeader";

export function PlaceholderPage({ title, description }) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center text-gray-500">
        {title} module will be implemented here.
      </div>
    </div>
  );
}
