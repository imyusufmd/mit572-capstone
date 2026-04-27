import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/FormField';
import { inventoryApi, productsApi, zonesApi } from '../../api/endpoints';
import type { InventoryDto, ProductDto, WarehouseZoneDto } from '../../types';
import { toast } from '../../components/ui/Toast';

interface StockAdjustmentModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  initial?: InventoryDto | null;
}

const REASONS = ['Cycle Count', 'Damage', 'Loss', 'Found', 'Receiving Correction', 'Other'];

export default function StockAdjustmentModal({ open, onClose, onSaved, initial }: StockAdjustmentModalProps) {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [zones, setZones] = useState<WarehouseZoneDto[]>([]);
  const [productId, setProductId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [qtyChange, setQtyChange] = useState('');
  const [reason, setReason] = useState(REASONS[0]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQtyChange('');
    setNotes('');
    setReason(REASONS[0]);
    setProductId(initial?.productId ?? '');
    setZoneId(initial?.zoneId ?? '');

    Promise.all([
      productsApi.list({ pageSize: 500, activeOnly: true }),
      zonesApi.list(),
    ])
      .then(([p, z]) => {
        setProducts(p.data.items);
        setZones(z.data);
      })
      .catch(() => {});
  }, [open, initial]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !zoneId || !qtyChange) {
      toast('error', 'Product, zone, and quantity are required');
      return;
    }
    const qty = parseInt(qtyChange, 10);
    if (Number.isNaN(qty) || qty === 0) {
      toast('error', 'Quantity must be a non-zero integer');
      return;
    }
    setSaving(true);
    try {
      await inventoryApi.adjust({ productId, zoneId, qtyChange: qty, reason, notes: notes || undefined });
      toast('success', 'Stock adjusted');
      onSaved();
    } catch {
      toast('error', 'Failed to adjust stock');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Adjust Stock"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={saving}>Save Adjustment</Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Product"
            required
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            placeholder="Select a product"
            options={products.map((p) => ({ value: p.id, label: `${p.sku} — ${p.name}` }))}
          />
          <Select
            label="Zone"
            required
            value={zoneId}
            onChange={(e) => setZoneId(e.target.value)}
            placeholder="Select a zone"
            options={zones.map((z) => ({ value: z.id, label: z.name }))}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Quantity Change"
            required
            type="number"
            value={qtyChange}
            onChange={(e) => setQtyChange(e.target.value)}
            hint="Use negative numbers to reduce stock"
          />
          <Select
            label="Reason"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            options={REASONS.map((r) => ({ value: r, label: r }))}
          />
        </div>
        <Textarea label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </form>
    </Modal>
  );
}
