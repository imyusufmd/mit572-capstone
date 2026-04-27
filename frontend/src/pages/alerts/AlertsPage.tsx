import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { inventoryApi } from '../../api/endpoints';
import type { LowStockAlertDto } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { formatNumber } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<LowStockAlertDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    inventoryApi
      .lowStock()
      .then((r) => setAlerts(r.data))
      .catch(() => toast('error', 'Failed to load alerts'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader
        title="Low Stock Alerts"
        description="Inventory items at or below their minimum threshold"
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size={28} />
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState
          title="All stock levels healthy"
          description="No products are below their minimum thresholds."
          icon={<AlertTriangle size={48} className="mb-4 text-emerald-500/40" />}
        />
      ) : (
        <div className="space-y-2">
          {alerts.map((a) => (
            <Link
              key={`${a.productId}-${a.zoneName}`}
              to={`/products/${a.productId}`}
              className="flex items-center gap-4 bg-gray-900 border border-gray-700 hover:border-yellow-500/40 rounded-xl p-4 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-yellow-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-100 truncate">{a.productName}</p>
                <p className="text-xs text-gray-500 font-mono">
                  {a.productSku} · {a.zoneName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm">
                  <span className="text-gray-200 font-medium">{formatNumber(a.quantity)}</span>
                  <span className="text-gray-500"> / {formatNumber(a.minThreshold)}</span>
                </p>
                <p className="text-xs text-red-400">−{formatNumber(a.deficit)} deficit</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
