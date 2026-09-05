import * as React from "react";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./Table";
import { Spinner } from "./Spinner";
import { EmptyState } from "./EmptyState";

export function DataTable({
  columns,
  data,
  keyExtractor,
  isLoading,
  emptyMessage = "No data found.",
  onSort,
  sortField,
  sortDirection,
  actions
}) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64 bg-white rounded-lg border border-gray-200">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <EmptyState 
          title={emptyMessage} 
          description="Try changing your filters or search criteria." 
        />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead 
              key={col.key} 
              className={col.sortable ? "cursor-pointer hover:bg-gray-100 transition-colors" : ""}
              onClick={() => col.sortable && onSort && onSort(col.key)}
            >
              <div className="flex items-center space-x-1">
                <span>{col.label}</span>
                {col.sortable && sortField === col.key && (
                  <span className="text-xs text-gray-400">
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </span>
                )}
              </div>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={keyExtractor ? keyExtractor(row) : i}>
            {columns.map((col) => (
              <TableCell key={col.key}>
                {col.render ? col.render(row) : row[col.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
