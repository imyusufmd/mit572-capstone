import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Warehouse,
  DollarSign,
  AlertTriangle,
  Truck,
  ClipboardList,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
} from 'lucide-react';
import type { DashboardSummaryDto } from '../../types';
import { dashboardApi } from '../../api/endpoints';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { formatCurrency, formatNumber } from '../../utils/formatters';

interface KpiCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
  link?: string;
  subtitle?: string;
}

function KpiCard({ title, value, icon, color, link, subtitle }: KpiCardProps) {
  const content = (
    <div className={`bg-gray-900 border border-gray-700 rounded-xl p-5 hover:border-gray-600 transition-colors ${link ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {link && <ArrowUpRight size={16} className="text-gray-500" />}
      </div>
      <p className="text-2xl font-bold text-gray-100">{value}</p>
      <p className="text-sm text-gray-400 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
  );

  if (link) {
    return <Link to={link} className="block no-underline">{content}</Link>;
  }
  return content;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi.summary()
      .then((res) => setSummary(res.data))
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
        {error}
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-1">Overview of your warehouse operations</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Total Products"
          value={formatNumber(summary.totalProducts)}
          icon={<Package size={20} className="text-blue-400" />}
          color="bg-blue-500/15"
          link="/products"
        />
        <KpiCard
          title="Total Stock"
          value={formatNumber(summary.totalStock)}
          icon={<Warehouse size={20} className="text-emerald-400" />}
          color="bg-emerald-500/15"
          link="/inventory"
          subtitle="units across all zones"
        />
        <KpiCard
          title="Stock Value"
          value={formatCurrency(summary.totalStockValue)}
          icon={<DollarSign size={20} className="text-green-400" />}
          color="bg-green-500/15"
        />
        <KpiCard
          title="Low Stock Alerts"
          value={formatNumber(summary.lowStockCount)}
          icon={<AlertTriangle size={20} className="text-yellow-400" />}
          color="bg-yellow-500/15"
          link="/alerts"
        />
      </div>

      {/* Operations Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Pending Shipments"
          value={formatNumber(summary.pendingShipments)}
          icon={<Truck size={20} className="text-indigo-400" />}
          color="bg-indigo-500/15"
          link="/shipments"
          subtitle="awaiting receipt"
        />
        <KpiCard
          title="Pending Orders"
          value={formatNumber(summary.pendingOrders)}
          icon={<ClipboardList size={20} className="text-orange-400" />}
          color="bg-orange-500/15"
          link="/orders"
          subtitle="to be fulfilled"
        />
        <KpiCard
          title="Shipped Today"
          value={formatNumber(summary.shippedToday)}
          icon={<ArrowUpRight size={20} className="text-cyan-400" />}
          color="bg-cyan-500/15"
          subtitle="outbound orders"
        />
        <KpiCard
          title="Received Today"
          value={formatNumber(summary.receivedToday)}
          icon={<ArrowDownRight size={20} className="text-teal-400" />}
          color="bg-teal-500/15"
          subtitle="inbound shipments"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
        <h2 className="text-lg font-semibold text-gray-100 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { to: '/products', label: 'Products', icon: Package, color: 'text-blue-400' },
            { to: '/inventory', label: 'Inventory', icon: Warehouse, color: 'text-emerald-400' },
            { to: '/shipments', label: 'Shipments', icon: Truck, color: 'text-indigo-400' },
            { to: '/orders', label: 'Orders', icon: ClipboardList, color: 'text-orange-400' },
            { to: '/analytics', label: 'Analytics', icon: TrendingUp, color: 'text-purple-400' },
            { to: '/alerts', label: 'Alerts', icon: AlertTriangle, color: 'text-yellow-400' },
          ].map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="flex flex-col items-center gap-2 py-4 px-3 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-center no-underline"
            >
              <action.icon size={22} className={action.color} />
              <span className="text-xs font-medium text-gray-300">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
