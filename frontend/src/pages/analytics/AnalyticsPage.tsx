import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { analyticsApi } from '../../api/endpoints';
import type {
  StockValueByCategoryDto,
  InventoryTurnoverDto,
  SupplierPerformanceDto,
  ZoneUtilizationDto,
} from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444'];

export default function AnalyticsPage() {
  const [stockByCategory, setStockByCategory] = useState<StockValueByCategoryDto[]>([]);
  const [turnover, setTurnover] = useState<InventoryTurnoverDto[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierPerformanceDto[]>([]);
  const [zones, setZones] = useState<ZoneUtilizationDto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      analyticsApi.stockValueByCategory().catch(() => ({ data: [] as StockValueByCategoryDto[] })),
      analyticsApi.inventoryTurnover().catch(() => ({ data: [] as InventoryTurnoverDto[] })),
      analyticsApi.supplierPerformance().catch(() => ({ data: [] as SupplierPerformanceDto[] })),
      analyticsApi.zoneUtilization().catch(() => ({ data: [] as ZoneUtilizationDto[] })),
    ])
      .then(([s, t, sp, z]) => {
        setStockByCategory(s.data);
        setTurnover(t.data);
        setSuppliers(sp.data);
        setZones(z.data);
      })
      .catch(() => toast('error', 'Failed to load analytics'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  const hasAnyData =
    stockByCategory.length > 0 || turnover.length > 0 || suppliers.length > 0 || zones.length > 0;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Insights from the data warehouse — stock, suppliers, fulfillment trends"
      />

      {!hasAnyData ? (
        <EmptyState
          title="No analytics data yet"
          description="The data warehouse will populate as ETL runs. Check back after the next sync."
        />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {stockByCategory.length > 0 && (
            <ChartCard title="Stock Value by Category">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stockByCategory}
                    dataKey="totalValue"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {stockByCategory.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {turnover.length > 0 && (
            <ChartCard title="Inventory Turnover">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={turnover}>
                  <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="totalIn" stroke="#10b981" name="In" />
                  <Line type="monotone" dataKey="totalOut" stroke="#ef4444" name="Out" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {zones.length > 0 && (
            <ChartCard title="Zone Utilization (%)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={zones}>
                  <CartesianGrid stroke="#374151" strokeDasharray="3 3" />
                  <XAxis dataKey="zoneName" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="utilizationPercent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {suppliers.length > 0 && (
            <ChartCard title="Supplier Performance">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-left text-xs uppercase tracking-wider text-gray-400">
                      <th className="py-2">Supplier</th>
                      <th className="py-2 text-right">Rating</th>
                      <th className="py-2 text-right">Orders</th>
                      <th className="py-2 text-right">Qty</th>
                      <th className="py-2 text-right">Avg Days</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s) => (
                      <tr key={s.supplierName} className="border-b border-gray-800 last:border-0">
                        <td className="py-2 text-gray-100">{s.supplierName}</td>
                        <td className="py-2 text-right text-gray-200">{s.rating.toFixed(1)}</td>
                        <td className="py-2 text-right text-gray-200">{formatNumber(s.totalOrders)}</td>
                        <td className="py-2 text-right text-gray-200">{formatNumber(s.totalQuantity)}</td>
                        <td className="py-2 text-right text-gray-200">
                          {s.avgFulfillmentDays != null ? s.avgFulfillmentDays.toFixed(1) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
        </div>
      )}
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: '#111827',
  border: '1px solid #374151',
  borderRadius: 8,
  fontSize: 12,
};

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-100 mb-4">{title}</h3>
      {children}
    </div>
  );
}
