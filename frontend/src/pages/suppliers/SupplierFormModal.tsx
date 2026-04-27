import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/FormField';
import { suppliersApi } from '../../api/endpoints';
import type { SupplierDto } from '../../types';
import { toast } from '../../components/ui/Toast';

interface SupplierFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  supplier?: SupplierDto | null;
}

export default function SupplierFormModal({ open, onClose, onSaved, supplier }: SupplierFormModalProps) {
  const isEdit = !!supplier;
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [rating, setRating] = useState('5');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(supplier?.name ?? '');
    setContactEmail(supplier?.contactEmail ?? '');
    setPhone(supplier?.phone ?? '');
    setAddress(supplier?.address ?? '');
    setRating(supplier ? String(supplier.rating) : '5');
    setIsActive(supplier?.isActive ?? true);
  }, [open, supplier]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        contactEmail: contactEmail || undefined,
        phone: phone || undefined,
        address: address || undefined,
        rating: rating ? parseFloat(rating) : undefined,
      };
      if (isEdit && supplier) {
        await suppliersApi.update(supplier.id, { ...payload, isActive });
        toast('success', 'Supplier updated');
      } else {
        await suppliersApi.create(payload);
        toast('success', 'Supplier created');
      }
      onSaved();
    } catch {
      toast('error', `Failed to ${isEdit ? 'update' : 'create'} supplier`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Supplier' : 'Add Supplier'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={saving}>
            {isEdit ? 'Save Changes' : 'Create'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Contact Email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
          />
          <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <Textarea label="Address" value={address} onChange={(e) => setAddress(e.target.value)} />
        <Input
          label="Rating"
          type="number"
          step="0.1"
          min="0"
          max="5"
          value={rating}
          onChange={(e) => setRating(e.target.value)}
          hint="0–5 stars"
        />
        {isEdit && (
          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800"
            />
            Active
          </label>
        )}
      </form>
    </Modal>
  );
}
