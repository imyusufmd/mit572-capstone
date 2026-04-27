import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { shipmentsApi } from '../../api/endpoints';
import type { InboundShipmentDto } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable, { type Column } from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';
import ShipmentFormModal from './ShipmentFormModal';

const STATUSES = ['', 'Pending', 'In Transit', 'Received', 'Partially Received', 'Cancelled'];

export default function ShipmentsListPage() {
  const navigate = useNavigate();
  const [shipments, setShipments] = useState<InboundShipmentDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    shipmentsApi
      .list({ status: status || undefined })
      .then((r) => setShipments(Array.isArray(r.data) ? r.data : (r.data?.items ?? [])))
      .catch(() => { toast('error', 'Failed to load shipments'); setShipments([]); })
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);

  const columns: Column<InboundShipmentDto>[] = [
    {
      key: 'ref',
      header: 'Reference',
      render: (s) => <span className="font-mono text-xs text-blue-400">{s.referenceNumber}</span>,
    },
    { key: 'supplier', header: 'Supplier', render: (s) => s.supplierName },
    { key: 'expected', header: 'Expected', render: (s) => formatDate(s.expectedDate) },
    {
      key: 'received',
      header: 'Received',
      render: (s) => (s.receivedDate ? formatDate(s.receivedDate) : '—'),
    },
    { key: 'items', header: 'Items', align: 'right', render: (s) => s.items.length },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
    { key: 'created', header: 'Created', render: (s) => formatDate(s.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Inbound Shipments"
        description="Track expected and received goods from suppliers"
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
            New Shipment
          </Button>
        }
      />

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4 flex flex-wrap items-end gap-3">
        <label className="block w-full sm:w-64">
          <span className="block text-xs font-medium text-gray-300 mb-1.5">Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-blue-500"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s || 'All statuses'}</option>
            ))}
          </select>
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={shipments}
        rowKey={(s) => s.id}
        loading={loading}
        onRowClick={(s) => navigate(`/shipments/${s.id}`)}
        emptyTitle="No shipments"
      />

      <ShipmentFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={(id) => {
          setShowCreate(false);
          if (id) navigate(`/shipments/${id}`);
          else load();
        }}
      />
    </div>
  );
}
