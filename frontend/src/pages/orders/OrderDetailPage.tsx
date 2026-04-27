import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, X, ChevronRight } from 'lucide-react';
import { ordersApi } from '../../api/endpoints';
import type { OutboundOrderDto } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatDateTime, formatNumber } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';

const STATUS_FLOW: Record<string, string | null> = {
  Pending: 'Picking',
  Picking: 'Picked',
  Picked: 'Packing',
  Packing: 'Packed',
  Packed: 'Shipped',
  Shipped: 'Delivered',
  Delivered: null,
  Cancelled: null,
};

export default function OrderDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OutboundOrderDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const load = () => {
    setLoading(true);
    ordersApi
      .get(id)
      .then((r) => setOrder(r.data))
      .catch(() => toast('error', 'Failed to load order'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const advanceStatus = async () => {
    if (!order) return;
    const next = STATUS_FLOW[order.status];
    if (!next) return;
    setActionLoading(true);
    try {
      await ordersApi.updateStatus(order.id, { status: next });
      toast('success', `Status updated to ${next}`);
      load();
    } catch {
      toast('error', 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const cancel = async () => {
    if (!order) return;
    setActionLoading(true);
    try {
      await ordersApi.cancel(order.id);
      toast('success', 'Order cancelled');
      setShowCancel(false);
      load();
    } catch {
      toast('error', 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!order) return null;

  const nextStatus = STATUS_FLOW[order.status];
  const canCancel = !['Shipped', 'Delivered', 'Cancelled'].includes(order.status);

  return (
    <div>
      <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/orders')} className="mb-3">
        Back to Orders
      </Button>

      <PageHeader
        title={order.orderNumber}
        description={order.customerName ?? 'No customer name'}
        actions={
          <>
            <StatusBadge status={order.status} />
            {nextStatus && (
              <Button
                variant="primary"
                icon={<ChevronRight size={14} />}
                onClick={advanceStatus}
                loading={actionLoading}
              >
                Mark as {nextStatus}
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" icon={<X size={14} />} onClick={() => setShowCancel(true)}>
                Cancel
              </Button>
            )}
          </>
        }
      />

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        <Detail label="Priority" value={order.priority} />
        <Detail label="Created" value={formatDateTime(order.createdAt)} />
        <Detail label="Created By" value={order.createdByName ?? '—'} />
        <Detail label="Shipped" value={order.shippedAt ? formatDateTime(order.shippedAt) : '—'} />
        <Detail label="Delivered" value={order.deliveredAt ? formatDateTime(order.deliveredAt) : '—'} />
        <div className="sm:col-span-3">
          <dt className="text-xs uppercase tracking-wider text-gray-500 mb-1">Destination</dt>
          <dd className="text-gray-200 whitespace-pre-line">{order.destination}</dd>
        </div>
        {order.notes && (
          <div className="sm:col-span-3">
            <dt className="text-xs uppercase tracking-wider text-gray-500 mb-1">Notes</dt>
            <dd className="text-gray-200">{order.notes}</dd>
          </div>
        )}
      </div>

      <h2 className="text-base font-semibold text-gray-100 mb-3">Line Items</h2>
      <div className="overflow-x-auto bg-gray-900 border border-gray-700 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-900/80">
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400">SKU</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400">Product</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400">Zone</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-gray-400">Quantity</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400">Picked</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400">Packed</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id} className="border-b border-gray-800 last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-gray-300">{it.productSku}</td>
                <td className="px-4 py-3 text-gray-100">{it.productName}</td>
                <td className="px-4 py-3 text-gray-300">{it.zoneName ?? '—'}</td>
                <td className="px-4 py-3 text-right text-gray-200">{formatNumber(it.quantity)}</td>
                <td className="px-4 py-3 text-gray-300 text-xs">{it.pickedAt ? formatDateTime(it.pickedAt) : '—'}</td>
                <td className="px-4 py-3 text-gray-300 text-xs">{it.packedAt ? formatDateTime(it.packedAt) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={showCancel}
        title="Cancel Order"
        message={`Cancel order "${order.orderNumber}"? Stock allocations will be released.`}
        confirmLabel="Cancel Order"
        variant="danger"
        loading={actionLoading}
        onConfirm={cancel}
        onClose={() => setShowCancel(false)}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</dt>
      <dd className="text-gray-200">{value}</dd>
    </div>
  );
}
