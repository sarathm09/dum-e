import { useMemo, useState } from 'react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { STATUS_LABELS, type Task } from '../types';
import { useTasks } from '../hooks/queries';
import { useSelection, statusColor, priorityStyle } from '../ui';

const col = createColumnHelper<Task>();

export function TaskTable({ projectId }: { projectId?: string }) {
  const { data: tasks = [] } = useTasks(projectId ? { projectId } : {});
  const { select } = useSelection();
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updatedAt', desc: true }]);

  const columns = useMemo(
    () => [
      col.accessor('title', { header: 'Title' }),
      col.accessor('status', {
        header: 'Status',
        cell: (c) => (
          <span style={{ color: statusColor(c.getValue()) }}>
            {STATUS_LABELS[c.getValue()] ?? c.getValue()}
          </span>
        ),
      }),
      col.accessor('priority', {
        header: 'Priority',
        cell: (c) => <span style={priorityStyle(c.getValue())}>{c.getValue()}</span>,
      }),
      col.accessor('type', { header: 'Type' }),
      col.accessor('repo', { header: 'Repo', cell: (c) => c.getValue() ?? '—' }),
      col.accessor('branch', { header: 'Branch', cell: (c) => c.getValue() ?? '—' }),
      col.accessor('updatedAt', {
        header: 'Updated',
        cell: (c) => new Date(c.getValue()).toLocaleString(),
      }),
    ],
    [],
  );

  const table = useReactTable({
    data: tasks,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="table-wrap">
      <table className="task-table">
        <thead>
          {table.getHeaderGroups().map((hg) => (
            <tr key={hg.id}>
              {hg.headers.map((h) => (
                <th
                  key={h.id}
                  onClick={h.column.getToggleSortingHandler()}
                  className={h.column.getCanSort() ? 'sortable' : ''}
                >
                  {flexRender(h.column.columnDef.header, h.getContext())}
                  {{ asc: ' ▲', desc: ' ▼' }[h.column.getIsSorted() as string] ?? ''}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} onClick={() => select(row.original.id)} className="clickable">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
              ))}
            </tr>
          ))}
          {tasks.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="dim" style={{ textAlign: 'center', padding: 24 }}>
                No tasks yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
