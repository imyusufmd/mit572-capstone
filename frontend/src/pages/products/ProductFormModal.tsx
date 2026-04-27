import { useEffect, useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { Input, Textarea, Select } from '../../components/ui/FormField';
import { productsApi } from '../../api/endpoints';
import type { CategoryDto, ProductDto } from '../../types';
import { toast } from '../../components/ui/Toast';

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: CategoryDto[];
  product?: ProductDto;
}

export default function ProductFormModal({ open, onClose, onSaved, categories, product }: ProductFormModalProps) {
  const isEdit = !!product;
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSku(product?.sku ?? '');
    setName(product?.name ?? '');
    setDescription(product?.description ?? '');
    setCategoryId(product?.categoryId ?? '');
    setUnitPrice(product ? String(product.unitPrice) : '');
    setWeightKg(product?.weightKg != null ? String(product.weightKg) : '');
    setImageUrl(product?.imageUrl ?? '');
    setIsActive(product?.isActive ?? true);
  }, [open, product]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        sku,
        name,
        description: description || undefined,
        categoryId: categoryId || undefined,
        unitPrice: parseFloat(unitPrice) || 0,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        imageUrl: imageUrl || undefined,
      };
      if (isEdit && product) {
        await productsApi.update(product.id, { ...payload, isActive });
        toast('success', 'Product updated');
      } else {
        await productsApi.create(payload);
        toast('success', 'Product created');
      }
      onSaved();
    } catch {
      toast('error', `Failed to ${isEdit ? 'update' : 'create'} product`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Product' : 'Add Product'}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input label="SKU" required value={sku} onChange={(e) => setSku(e.target.value)} disabled={isEdit} />
          <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            placeholder="Uncategorized"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Input
            label="Unit Price"
            required
            type="number"
            step="0.01"
            min="0"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
          />
          <Input
            label="Weight (kg)"
            type="number"
            step="0.01"
            min="0"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
          />
        </div>
        <Input label="Image URL" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
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
