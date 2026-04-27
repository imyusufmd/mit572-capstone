import { useEffect, useState } from 'react';
import { Plus, Mail, Phone, MapPin, Star, Edit, Trash2 } from 'lucide-react';
import { suppliersApi } from '../../api/endpoints';
import type { SupplierDto } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import SupplierFormModal from './SupplierFormModal';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeOnly, setActiveOnly] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SupplierDto | null>(null);
  const [deleting, setDeleting] = useState<SupplierDto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = () => {
    setLoading(true);
    suppliersApi
      .list(activeOnly)
      .then((r) => setSuppliers(r.data))
      .catch(() => toast('error', 'Failed to load suppliers'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [activeOnly]);

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await suppliersApi.delete(deleting.id);
      toast('success', 'Supplier deleted');
      setDeleting(null);
      load();
    } catch {
      toast('error', 'Failed to delete supplier');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Vendor contacts and shipment partners"
        actions={
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            Add Supplier
          </Button>
        }
      />

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={activeOnly}
            onChange={(e) => setActiveOnly(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800"
          />
          Show active only
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size={28} />
        </div>
      ) : suppliers.length === 0 ? (
        <EmptyState title="No suppliers" description="Add a supplier to start tracking inbound shipments." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-gray-900 border border-gray-700 rounded-xl p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-100">{s.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        size={12}
                        className={n <= Math.round(s.rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}
                      />
                    ))}
                    <span className="text-xs text-gray-500 ml-1">{s.rating.toFixed(1)}</span>
                  </div>
                </div>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full border ${
                    s.isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : 'bg-gray-500/15 text-gray-400 border-gray-500/30'
                  }`}
                >
                  {s.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 text-sm text-gray-400 flex-1">
                {s.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail size={12} className="text-gray-500" />
                    <span className="text-gray-300 truncate">{s.contactEmail}</span>
                  </div>
                )}
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="text-gray-500" />
                    <span className="text-gray-300">{s.phone}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="text-gray-500 mt-0.5 shrink-0" />
                    <span className="text-gray-300">{s.address}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-800">
                <span className="text-xs text-gray-500">{s.shipmentCount} shipments</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Edit size={12} />}
                    onClick={() => {
                      setEditing(s);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    icon={<Trash2 size={12} />}
                    onClick={() => setDeleting(s)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <SupplierFormModal
        open={showForm}
        supplier={editing}
        onClose={() => setShowForm(false)}
        onSaved={() => {
          setShowForm(false);
          load();
        }}
      />

      <ConfirmDialog
        open={!!deleting}
        title="Delete Supplier"
        message={`Delete supplier "${deleting?.name}"?`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
