import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, FolderOpen } from 'lucide-react';
import { categoriesApi } from '../../api/endpoints';
import type { CategoryDto } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import EmptyState from '../../components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import { Input, Textarea } from '../../components/ui/FormField';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { toast } from '../../components/ui/Toast';
import { formatNumber } from '../../utils/formatters';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CategoryDto | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<CategoryDto | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = () => {
    setLoading(true);
    categoriesApi
      .list()
      .then((r) => setCategories(r.data))
      .catch(() => toast('error', 'Failed to load categories'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setShowForm(true);
  };

  const openEdit = (c: CategoryDto) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description ?? '');
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, description: description || undefined };
      if (editing) {
        await categoriesApi.update(editing.id, payload);
        toast('success', 'Category updated');
      } else {
        await categoriesApi.create(payload);
        toast('success', 'Category created');
      }
      setShowForm(false);
      load();
    } catch {
      toast('error', `Failed to ${editing ? 'update' : 'create'} category`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      await categoriesApi.delete(deleting.id);
      toast('success', 'Category deleted');
      setDeleting(null);
      load();
    } catch {
      toast('error', 'Cannot delete: category may have products assigned');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Group products by category for filtering and reporting"
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={openCreate}>
            Add Category
          </Button>
        }
      />

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LoadingSpinner size={28} />
        </div>
      ) : categories.length === 0 ? (
        <EmptyState title="No categories" description="Create a category to organize your product catalog." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((c) => (
            <div key={c.id} className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-purple-500/15 flex items-center justify-center">
                    <FolderOpen size={18} className="text-purple-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-100">{c.name}</p>
                    <p className="text-xs text-gray-500">{formatNumber(c.productCount)} products</p>
                  </div>
                </div>
              </div>
              {c.description && <p className="text-sm text-gray-400 mb-3">{c.description}</p>}
              <div className="flex gap-2 pt-3 border-t border-gray-800">
                <Button size="sm" variant="secondary" icon={<Edit size={12} />} onClick={() => openEdit(c)} className="flex-1">
                  Edit
                </Button>
                <Button size="sm" variant="danger" icon={<Trash2 size={12} />} onClick={() => setDeleting(c)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit Category' : 'Add Category'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
            <Button variant="primary" onClick={submit} loading={saving}>
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-4">
          <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Delete Category"
        message={`Delete "${deleting?.name}"? Products in this category will become uncategorized.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
