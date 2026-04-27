import { useEffect, useState } from 'react';
import { Plus, MapPin, Edit, Trash2 } from 'lucide-react';
import { zonesApi } from '../../api/endpoints';
import type { WarehouseZoneDto } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { formatNumber } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';
import ZoneFormModal from './ZoneFormModal';

export default function ZonesPage() {
  const [zones, setZones] = useState<WarehouseZoneDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<WarehouseZoneDto | null>(null);
  const [deleting, setDeleting] = useState<WarehouseZoneDto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = () => {
    setLoading(true);
    zonesApi
      .list()
      .then((r) => setZones(r.data))
      .catch(() => toast('error', 'Failed to load zones'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await zonesApi.delete(deleting.id);
      toast('success', 'Zone deleted');
      setDeleting(null);
      load();
    } catch {
      toast('error', 'Failed to delete zone');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Warehouse Zones"
        description="Storage areas with capacity and utilization tracking"
        actions={
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            Add Zone
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size={28} />
        </div>
      ) : zones.length === 0 ? (
        <EmptyState title="No zones configured" description="Add a zone to start tracking inventory by location." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {zones.map((z) => {
            const pct = Math.min(z.utilizationPercent, 100);
            const barColor =
              pct >= 90 ? 'bg-red-500' : pct >= 75 ? 'bg-yellow-500' : 'bg-emerald-500';
            return (
              <div key={z.id} className="bg-gray-900 border border-gray-700 rounded-xl p-5 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/15 flex items-center justify-center">
                      <MapPin size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-100">{z.name}</p>
                      <p className="text-xs text-gray-500">{z.zoneType}</p>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                      z.isActive
                        ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                        : 'bg-gray-500/15 text-gray-400 border-gray-500/30'
                    }`}
                  >
                    {z.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {z.description && <p className="text-sm text-gray-400 mb-3">{z.description}</p>}

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Utilization</span>
                    <span className="text-gray-200">{z.utilizationPercent.toFixed(1)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex justify-between text-gray-400 text-xs">
                    <span>{formatNumber(z.currentUtilization)} used</span>
                    <span>{formatNumber(z.capacity)} capacity</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Edit size={12} />}
                    onClick={() => {
                      setEditing(z);
                      setShowForm(true);
                    }}
                    className="flex-1"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 size={12} />}
                    onClick={() => setDeleting(z)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ZoneFormModal
        open={showForm}
        zone={editing}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          setShowForm(false);
          load();
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete Zone"
        message={`Delete zone "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
