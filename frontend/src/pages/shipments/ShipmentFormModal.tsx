import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/FormField';
import { suppliersApi, productsApi, zonesApi, shipmentsApi } from '../../api/endpoints';
import type { ProductDto, SupplierDto, WarehouseZoneDto } from '../../types';
import { toast } from '../../components/ui/Toast';

interface ShipmentFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (id?: string) => void;
}

interface ItemRow {
  productId: string;
  expectedQty: string;
  zoneId: string;
}

export default function ShipmentFormModal({ open, onClose, onSaved }: ShipmentFormModalProps) {
  const [suppliers, setSuppliers] = useState<SupplierDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [zones, setZones] = useState<WarehouseZoneDto[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemRow[]>([{ productId: '', expectedQty: '', zoneId: '' }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSupplierId('');
    setExpectedDate(new Date().toISOString().slice(0, 10));
    setNotes('');
    setItems([{ productId: '', expectedQty: '', zoneId: '' }]);
    Promise.all([
      suppliersApi.list(true),
      productsApi.list({ pageSize: 500, activeOnly: true }),
      zonesApi.list(),
    ])
      .then(([s, p, z]) => {
        setSuppliers(s.data);
        setProducts(p.data.items);
        setZones(z.data);
      })
      .catch(() => {});
  }, [open]);

  const updateItem = (idx: number, field: keyof ItemRow, value: string) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems((prev) => [...prev, { productId: '', expectedQty: '', zoneId: '' }]);
  const removeItem = (idx: number) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !expectedDate || items.some((i) => !i.productId || !i.expectedQty)) {
      toast('error', 'Supplier, date, and complete items are required');
      return;
    }
    setSaving(true);
    try {
      const res = await shipmentsApi.create({
        supplierId,
        expectedDate,
        notes: notes || undefined,
        items: items.map((i) => ({
          productId: i.productId,
          expectedQty: parseInt(i.expectedQty, 10),
          zoneId: i.zoneId || undefined,
        })),
      });
      toast('success', 'Shipment created');
      onSaved(res.data.id);
    } catch {
      toast('error', 'Failed to create shipment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Inbound Shipment"
      size="xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={saving}>Create Shipment</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Supplier"
            required
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            placeholder="Select a supplier"
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
          />
          <Input
            label="Expected Date"
            required
            type="date"
            value={expectedDate}
            onChange={(e) => setExpectedDate(e.target.value)}
          />
        </div>
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-300">Items</span>
            <Button size="sm" icon={<Plus size={12} />} onClick={addItem}>Add Item</Button>
          </div>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                <div className="col-span-12 sm:col-span-5">
                  <select
                    value={item.productId}
                    onChange={(e) => updateItem(idx, 'productId', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Select product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-5 sm:col-span-3">
                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.expectedQty}
                    onChange={(e) => updateItem(idx, 'expectedQty', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <select
                    value={item.zoneId}
                    onChange={(e) => updateItem(idx, 'zoneId', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Any zone</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    disabled={items.length === 1}
                    className="p-2 text-red-400 hover:bg-red-500/10 rounded disabled:opacity-30"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  );
}
