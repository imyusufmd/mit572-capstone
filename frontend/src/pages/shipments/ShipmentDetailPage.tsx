import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, PackageCheck, X } from 'lucide-react';
import { shipmentsApi, zonesApi } from '../../api/endpoints';
import type { InboundShipmentDto, WarehouseZoneDto } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatDate, formatDateTime, formatNumber } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';

export default function ShipmentDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [shipment, setShipment] = useState<InboundShipmentDto | null>(null);
  const [zones, setZones] = useState<WarehouseZoneDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReceive, setShowReceive] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [receiveItems, setReceiveItems] = useState<Record<string, { receivedQty: string; zoneId: string }>>({});
  const [receiveNotes, setReceiveNotes] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([shipmentsApi.get(id), zonesApi.list()])
      .then(([s, z]) => {
        setShipment(s.data);
        setZones(z.data);
      })
      .catch(() => toast('error', 'Failed to load shipment'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const openReceive = () => {
    if (!shipment) return;
    const initial: Record<string, { receivedQty: string; zoneId: string }> = {};
    shipment.items.forEach((it) => {
      initial[it.id] = {
        receivedQty: String(it.expectedQty - it.receivedQty),
        zoneId: it.zoneId ?? zones[0]?.id ?? '',
      };
    });
    setReceiveItems(initial);
    setReceiveNotes('');
    setShowReceive(true);
  };

  const submitReceive = async () => {
    if (!shipment) return;
    setActionLoading(true);
    try {
      await shipmentsApi.receive(shipment.id, {
        notes: receiveNotes || undefined,
        items: Object.entries(receiveItems)
          .filter(([, v]) => v.receivedQty && parseInt(v.receivedQty, 10) > 0)
          .map(([itemId, v]) => ({
            itemId,
            receivedQty: parseInt(v.receivedQty, 10),
            zoneId: v.zoneId || undefined,
          })),
      });
      toast('success', 'Shipment received');
      setShowReceive(false);
      load();
    } catch {
      toast('error', 'Failed to receive shipment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!shipment) return;
    setActionLoading(true);
    try {
      await shipmentsApi.cancel(shipment.id);
      toast('success', 'Shipment cancelled');
      setShowCancel(false);
      load();
    } catch {
      toast('error', 'Failed to cancel shipment');
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

  if (!shipment) return null;

  const canReceive = ['Pending', 'In Transit', 'Partially Received'].includes(shipment.status);
  const canCancel = ['Pending', 'In Transit'].includes(shipment.status);

  return (
    <div>
      <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/shipments')} className="mb-3">
        Back to Shipments
      </Button>

      <PageHeader
        title={shipment.referenceNumber}
        description={`From ${shipment.supplierName}`}
        actions={
          <>
            <StatusBadge status={shipment.status} />
            {canReceive && (
              <Button variant="primary" icon={<PackageCheck size={14} />} onClick={openReceive}>
                Receive
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
        <Detail label="Expected Date" value={formatDate(shipment.expectedDate)} />
        <Detail label="Received Date" value={shipment.receivedDate ? formatDate(shipment.receivedDate) : '—'} />
        <Detail label="Created" value={formatDateTime(shipment.createdAt)} />
        <Detail label="Created By" value={shipment.createdByName ?? '—'} />
        {shipment.notes && (
          <div className="sm:col-span-3">
            <dt className="text-xs uppercase tracking-wider text-gray-500 mb-1">Notes</dt>
            <dd className="text-gray-200">{shipment.notes}</dd>
          </div>
        )}
      </div>

      <h2 className="text-base font-semibold text-gray-100 mb-3">Items</h2>
      <div className="overflow-x-auto bg-gray-900 border border-gray-700 rounded-xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 bg-gray-900/80">
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400">SKU</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400">Product</th>
              <th className="px-4 py-3 text-left text-xs uppercase tracking-wider text-gray-400">Zone</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-gray-400">Expected</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-gray-400">Received</th>
              <th className="px-4 py-3 text-right text-xs uppercase tracking-wider text-gray-400">Outstanding</th>
            </tr>
          </thead>
          <tbody>
            {shipment.items.map((it) => {
              const outstanding = it.expectedQty - it.receivedQty;
              return (
                <tr key={it.id} className="border-b border-gray-800 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs text-gray-300">{it.productSku}</td>
                  <td className="px-4 py-3 text-gray-100">{it.productName}</td>
                  <td className="px-4 py-3 text-gray-300">{it.zoneName ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-200">{formatNumber(it.expectedQty)}</td>
                  <td className="px-4 py-3 text-right text-gray-200">{formatNumber(it.receivedQty)}</td>
                  <td className={`px-4 py-3 text-right ${outstanding > 0 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                    {formatNumber(outstanding)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={showReceive}
        onClose={() => setShowReceive(false)}
        title="Receive Shipment"
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowReceive(false)} disabled={actionLoading}>Cancel</Button>
            <Button variant="primary" onClick={submitReceive} loading={actionLoading}>Confirm Receipt</Button>
          </>
        }
      >
        <p className="text-sm text-gray-400 mb-4">
          Enter the actual received quantity per item and the destination zone. Zero quantities will be skipped.
        </p>
        <div className="space-y-3">
          {shipment.items.map((it) => {
            const outstanding = it.expectedQty - it.receivedQty;
            const v = receiveItems[it.id];
            return (
              <div key={it.id} className="grid grid-cols-12 gap-2 items-center bg-gray-800/50 p-3 rounded-lg">
                <div className="col-span-12 sm:col-span-5">
                  <p className="font-medium text-sm text-gray-100">{it.productName}</p>
                  <p className="text-xs text-gray-500 font-mono">{it.productSku}</p>
                </div>
                <div className="col-span-12 sm:col-span-2 text-xs text-gray-400">
                  Outstanding: <span className="text-gray-200">{outstanding}</span>
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <input
                    type="number"
                    min="0"
                    placeholder="Qty"
                    value={v?.receivedQty ?? ''}
                    onChange={(e) =>
                      setReceiveItems((prev) => ({ ...prev, [it.id]: { ...prev[it.id], receivedQty: e.target.value } }))
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <select
                    value={v?.zoneId ?? ''}
                    onChange={(e) =>
                      setReceiveItems((prev) => ({ ...prev, [it.id]: { ...prev[it.id], zoneId: e.target.value } }))
                    }
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <label className="block">
            <span className="block text-xs font-medium text-gray-300 mb-1.5">Receipt Notes</span>
            <textarea
              rows={2}
              value={receiveNotes}
              onChange={(e) => setReceiveNotes(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-blue-500"
            />
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={showCancel}
        title="Cancel Shipment"
        message={`Cancel shipment "${shipment.referenceNumber}"?`}
        confirmLabel="Cancel Shipment"
        variant="danger"
        loading={actionLoading}
        onConfirm={handleCancel}
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
