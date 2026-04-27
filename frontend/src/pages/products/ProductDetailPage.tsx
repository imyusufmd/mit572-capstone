import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Warehouse, History } from 'lucide-react';
import { productsApi, inventoryApi, categoriesApi } from '../../api/endpoints';
import type { ProductDto, InventoryDto, StockAdjustmentDto, CategoryDto } from '../../types';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Button from '../../components/ui/Button';
import PageHeader from '../../components/ui/PageHeader';
import DataTable, { type Column } from '../../components/ui/DataTable';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import ProductFormModal from './ProductFormModal';
import { formatCurrency, formatNumber, formatDateTime } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';

export default function ProductDetailPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDto | null>(null);
  const [inventory, setInventory] = useState<InventoryDto[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustmentDto[]>([]);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      productsApi.get(id),
      inventoryApi.list({ productId: id }).catch(() => ({ data: { items: [] as InventoryDto[] } })),
      inventoryApi.adjustments({ productId: id, pageSize: 20 }).catch(() => ({ data: { items: [] as StockAdjustmentDto[] } })),
      categoriesApi.list().catch(() => ({ data: [] as CategoryDto[] })),
    ])
      .then(([p, inv, adj, cats]) => {
        setProduct(p.data);
        setInventory(Array.isArray(inv.data) ? inv.data : (inv.data?.items ?? []));
        setAdjustments(Array.isArray(adj.data) ? adj.data : (adj.data?.items ?? []));
        setCategories(Array.isArray(cats.data) ? cats.data : []);
      })
      .catch(() => toast('error', 'Failed to load product'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await productsApi.delete(id);
      toast('success', 'Product deleted');
      navigate('/products');
    } catch {
      toast('error', 'Failed to delete product');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (!product) return null;

  const invColumns: Column<InventoryDto>[] = [
    { key: 'zone', header: 'Zone', render: (i) => i.zoneName },
    { key: 'qty', header: 'Quantity', align: 'right', render: (i) => formatNumber(i.quantity) },
    { key: 'min', header: 'Min Threshold', align: 'right', render: (i) => formatNumber(i.minThreshold) },
    {
      key: 'value',
      header: 'Stock Value',
      align: 'right',
      render: (i) => formatCurrency(i.stockValue),
    },
    {
      key: 'status',
      header: 'Status',
      render: (i) =>
        i.isLowStock ? (
          <span className="text-yellow-400 text-xs font-medium">Low Stock</span>
        ) : (
          <span className="text-emerald-400 text-xs font-medium">OK</span>
        ),
    },
  ];

  const adjColumns: Column<StockAdjustmentDto>[] = [
    { key: 'when', header: 'Date', render: (a) => formatDateTime(a.createdAt) },
    { key: 'zone', header: 'Zone', render: (a) => a.zoneName },
    {
      key: 'qty',
      header: 'Change',
      align: 'right',
      render: (a) => (
        <span className={a.qtyChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
          {a.qtyChange >= 0 ? '+' : ''}{formatNumber(a.qtyChange)}
        </span>
      ),
    },
    { key: 'reason', header: 'Reason', render: (a) => a.reason },
    { key: 'by', header: 'By', render: (a) => a.adjustedByName ?? '—' },
  ];

  return (
    <div>
      <Button variant="ghost" icon={<ArrowLeft size={16} />} onClick={() => navigate('/products')} className="mb-3">
        Back to Products
      </Button>

      <PageHeader
        title={product.name}
        description={`SKU: ${product.sku}`}
        actions={
          <>
            <Button variant="secondary" icon={<Edit size={14} />} onClick={() => setShowEdit(true)}>
              Edit
            </Button>
            <Button variant="danger" icon={<Trash2 size={14} />} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total Stock</p>
          <p className="text-2xl font-bold text-gray-100">{formatNumber(product.totalStock)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Unit Price</p>
          <p className="text-2xl font-bold text-gray-100">{formatCurrency(product.unitPrice)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Stock Value</p>
          <p className="text-2xl font-bold text-gray-100">
            {formatCurrency(product.unitPrice * product.totalStock)}
          </p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-6">
        <h2 className="text-base font-semibold text-gray-100 mb-3">Details</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <Detail label="Category" value={product.categoryName ?? '—'} />
          <Detail label="Status" value={product.isActive ? 'Active' : 'Inactive'} />
          <Detail label="Weight" value={product.weightKg != null ? `${product.weightKg} kg` : '—'} />
          <Detail
            label="Dimensions"
            value={
              product.lengthCm && product.widthCm && product.heightCm
                ? `${product.lengthCm} × ${product.widthCm} × ${product.heightCm} cm`
                : '—'
            }
          />
          <Detail label="Created" value={formatDateTime(product.createdAt)} />
          <Detail label="Updated" value={formatDateTime(product.updatedAt)} />
          {product.description && (
            <div className="sm:col-span-2 lg:col-span-3">
              <dt className="text-xs uppercase tracking-wider text-gray-500 mb-1">Description</dt>
              <dd className="text-gray-200">{product.description}</dd>
            </div>
          )}
        </dl>
      </div>

      <h2 className="flex items-center gap-2 text-base font-semibold text-gray-100 mb-3">
        <Warehouse size={16} /> Inventory by Zone
      </h2>
      <DataTable
        columns={invColumns}
        rows={inventory}
        rowKey={(i) => i.id}
        emptyTitle="No inventory records"
        emptyDescription="This product has no stock allocated to any zone yet."
      />

      <h2 className="flex items-center gap-2 text-base font-semibold text-gray-100 mb-3 mt-8">
        <History size={16} /> Recent Adjustments
      </h2>
      <DataTable
        columns={adjColumns}
        rows={adjustments}
        rowKey={(a) => a.id}
        emptyTitle="No adjustments"
      />

      <ProductFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => {
          setShowEdit(false);
          load();
        }}
        categories={categories}
        product={product}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${product.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-gray-500 mb-1">{label}</dt>
      <dd className="text-gray-200">{value}</dd>
    </div>
  );
}
