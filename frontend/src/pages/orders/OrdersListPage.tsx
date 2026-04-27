import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { ordersApi } from '../../api/endpoints';
import type { OutboundOrderDto } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable, { type Column } from '../../components/ui/DataTable';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';
import OrderFormModal from './OrderFormModal';

const STATUSES = ['', 'Pending', 'Picking', 'Picked', 'Packing', 'Packed', 'Shipped', 'Delivered', 'Cancelled'];

export default function OrdersListPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OutboundOrderDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = () => {
    setLoading(true);
    ordersApi
      .list({ status: status || undefined })
      .then((r) => setOrders(r.data))
      .catch(() => toast('error', 'Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status]);

  const priorityClass = (p: string) => {
    if (p === 'High') return 'text-red-400';
    if (p === 'Low') return 'text-gray-500';
    return 'text-yellow-400';
  };

  const columns: Column<OutboundOrderDto>[] = [
    {
      key: 'order',
      header: 'Order #',
      render: (o) => <span className="font-mono text-xs text-blue-400">{o.orderNumber}</span>,
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (o) => (
        <div>
          <p className="text-gray-100">{o.customerName ?? '—'}</p>
          <p className="text-xs text-gray-500">{o.destination}</p>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (o) => <span className={`text-xs font-medium ${priorityClass(o.priority)}`}>{o.priority}</span>,
    },
    { key: 'items', header: 'Items', align: 'right', render: (o) => o.items.length },
    { key: 'status', header: 'Status', render: (o) => <StatusBadge status={o.status} /> },
    { key: 'created', header: 'Created', render: (o) => formatDate(o.createdAt) },
  ];

  return (
    <div>
      <PageHeader
        title="Outbound Orders"
        description="Customer orders and fulfillment workflow"
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
            New Order
          </Button>
        }
      />

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
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
        rows={orders}
        rowKey={(o) => o.id}
        loading={loading}
        onRowClick={(o) => navigate(`/orders/${o.id}`)}
        emptyTitle="No orders"
      />

      <OrderFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={(id) => {
          setShowCreate(false);
          if (id) navigate(`/orders/${id}`);
          else load();
        }}
      />
    </div>
  );
}
