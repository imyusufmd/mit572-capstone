import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, AlertTriangle } from 'lucide-react';
import { inventoryApi, zonesApi } from '../../api/endpoints';
import type { InventoryDto, WarehouseZoneDto } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable, { type Column } from '../../components/ui/DataTable';
import { formatCurrency, formatNumber, formatDateTime } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';
import StockAdjustmentModal from './StockAdjustmentModal';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryDto[]>([]);
  const [zones, setZones] = useState<WarehouseZoneDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [zoneId, setZoneId] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustFor, setAdjustFor] = useState<InventoryDto | null>(null);

  useEffect(() => {
    zonesApi.list().then((r) => setZones(r.data)).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    inventoryApi
      .list({ zoneId: zoneId || undefined, lowStockOnly: lowStockOnly || undefined })
      .then((r) => setItems(Array.isArray(r.data) ? r.data : (r.data?.items ?? [])))
      .catch(() => { toast('error', 'Failed to load inventory'); setItems([]); })
      .finally(() => setLoading(false));
  };

  useEffect(load, [zoneId, lowStockOnly]);

  const columns: Column<InventoryDto>[] = [
    {
      key: 'sku',
      header: 'SKU',
      render: (i) => (
        <Link to={`/products/${i.productId}`} className="font-mono text-xs text-blue-400 hover:underline">
          {i.productSku}
        </Link>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (i) => <span className="text-gray-100 font-medium">{i.productName}</span>,
    },
    { key: 'zone', header: 'Zone', render: (i) => i.zoneName },
    { key: 'qty', header: 'Quantity', align: 'right', render: (i) => formatNumber(i.quantity) },
    {
      key: 'min',
      header: 'Min',
      align: 'right',
      render: (i) => <span className="text-gray-500">{formatNumber(i.minThreshold)}</span>,
    },
    { key: 'value', header: 'Stock Value', align: 'right', render: (i) => formatCurrency(i.stockValue) },
    {
      key: 'status',
      header: 'Status',
      render: (i) =>
        i.isLowStock ? (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-400">
            <AlertTriangle size={12} /> Low
          </span>
        ) : (
          <span className="text-xs font-medium text-emerald-400">OK</span>
        ),
    },
    { key: 'updated', header: 'Updated', render: (i) => formatDateTime(i.lastUpdated) },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (i) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            setAdjustFor(i);
            setShowAdjust(true);
          }}
        >
          Adjust
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Stock levels by zone with adjustment history"
        actions={
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => {
              setAdjustFor(null);
              setShowAdjust(true);
            }}
          >
            Adjust Stock
          </Button>
        }
      />

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-end gap-3">
        <label className="block sm:w-64">
          <span className="block text-xs font-medium text-gray-300 mb-1.5">Zone</span>
          <select
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-blue-500"
          >
            <option value="">All zones</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-300 pb-2">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800"
          />
          Show low stock only
        </label>
      </div>

      <DataTable
        columns={columns}
        rows={items}
        rowKey={(i) => i.id}
        loading={loading}
        emptyTitle="No inventory records"
      />

      <StockAdjustmentModal
        open={showAdjust}
        initial={adjustFor}
        onClose={() => setShowAdjust(false)}
        onSaved={() => {
          setShowAdjust(false);
          load();
        }}
      />
    </div>
  );
}
