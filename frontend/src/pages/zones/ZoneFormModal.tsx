import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/FormField';
import { zonesApi } from '../../api/endpoints';
import type { WarehouseZoneDto } from '../../types';
import { toast } from '../../components/ui/Toast';

interface ZoneFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  zone?: WarehouseZoneDto | null;
}

const ZONE_TYPES = ['Receiving', 'Storage', 'Picking', 'Packing', 'Shipping', 'Returns'];

export default function ZoneFormModal({ open, onClose, onSaved, zone }: ZoneFormModalProps) {
  const isEdit = !!zone;
  const [name, setName] = useState('');
  const [zoneType, setZoneType] = useState(ZONE_TYPES[1]);
  const [capacity, setCapacity] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(zone?.name ?? '');
    setZoneType(zone?.zoneType ?? ZONE_TYPES[1]);
    setCapacity(zone ? String(zone.capacity) : '');
    setDescription(zone?.description ?? '');
    setIsActive(zone?.isActive ?? true);
  }, [open, zone]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name,
        zoneType,
        capacity: parseInt(capacity, 10) || 0,
        description: description || undefined,
      };
      if (isEdit && zone) {
        await zonesApi.update(zone.id, { ...payload, isActive });
        toast('success', 'Zone updated');
      } else {
        await zonesApi.create(payload);
        toast('success', 'Zone created');
      }
      onSaved();
    } catch {
      toast('error', `Failed to ${isEdit ? 'update' : 'create'} zone`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Zone' : 'Add Zone'}
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
          <Select
            label="Zone Type"
            required
            value={zoneType}
            onChange={(e) => setZoneType(e.target.value)}
            options={ZONE_TYPES.map((t) => ({ value: t, label: t }))}
          />
          <Input
            label="Capacity"
            required
            type="number"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
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
