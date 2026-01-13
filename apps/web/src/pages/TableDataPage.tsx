/**
 * Table Data Page
 * Page wrapper for viewing data within a custom table
 */

import { DynamicTableView } from '@/components/features/dashboard/DynamicTableView';

export default function TableDataPage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="p-6">
        <DynamicTableView />
      </main>
    </div>
  );
}
