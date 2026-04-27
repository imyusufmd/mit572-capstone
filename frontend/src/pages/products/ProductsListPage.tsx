import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
import { productsApi, categoriesApi } from '../../api/endpoints';
import type { ProductDto, CategoryDto, PagedResult } from '../../types';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import DataTable, { type Column } from '../../components/ui/DataTable';
import Pagination from '../../components/ui/Pagination';
import { formatCurrency, formatNumber } from '../../utils/formatters';
import { toast } from '../../components/ui/Toast';
import ProductFormModal from './ProductFormModal';

const PAGE_SIZE = 20;

export default function ProductsListPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PagedResult<ProductDto> | null>(null);
  const [categories, setCategories] = useState<CategoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [activeOnly, setActiveOnly] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    categoriesApi.list().then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    productsApi
      .list({
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
        categoryId: categoryId || undefined,
        activeOnly,
      })
      .then((r) => setData(r.data))
      .catch(() => toast('error', 'Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(load, [page, search, categoryId, activeOnly]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const columns: Column<ProductDto>[] = [
    { key: 'sku', header: 'SKU', render: (p) => <span className="font-mono text-xs text-gray-300">{p.sku}</span> },
    {
      key: 'name',
      header: 'Name',
      render: (p) => (
        <div>
          <p className="font-medium text-gray-100">{p.name}</p>
          {p.description && (
            <p className="text-xs text-gray-500 line-clamp-1">{p.description}</p>
          )}
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (p) => p.categoryName ?? '—' },
    { key: 'price', header: 'Price', align: 'right', render: (p) => formatCurrency(p.unitPrice) },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      render: (p) => (
        <span className={p.totalStock === 0 ? 'text-red-400' : 'text-gray-200'}>
          {formatNumber(p.totalStock)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
            p.isActive
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-gray-500/15 text-gray-400 border-gray-500/30'
          }`}
        >
          {p.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage product catalog and stock keeping units"
        actions={
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setShowCreate(true)}>
            Add Product
          </Button>
        }
      />

      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-end gap-3">
          <form onSubmit={handleSearch} className="flex-1">
            <label className="block">
              <span className="block text-xs font-medium text-gray-300 mb-1.5">Search</span>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by SKU, name, or description..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>
            </label>
          </form>
          <div className="md:w-56">
            <label className="block">
              <span className="block text-xs font-medium text-gray-300 mb-1.5">Category</span>
              <select
                value={categoryId}
                onChange={(e) => {
                  setPage(1);
                  setCategoryId(e.target.value);
                }}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-100 focus:outline-none focus:border-blue-500"
              >
                <option value="">All categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-300 pb-2">
            <input
              type="checkbox"
              checked={activeOnly}
              onChange={(e) => {
                setPage(1);
                setActiveOnly(e.target.checked);
              }}
              className="w-4 h-4 rounded border-gray-600 bg-gray-800"
            />
            Active only
          </label>
          <Button type="submit" icon={<Filter size={14} />} onClick={handleSearch}>
            Apply
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(p) => p.id}
        loading={loading}
        onRowClick={(p) => navigate(`/products/${p.id}`)}
        emptyTitle="No products found"
        emptyDescription="Try adjusting filters or add a new product."
      />

      {data && (
        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          totalCount={data.totalCount}
          pageSize={data.pageSize}
          onPageChange={setPage}
        />
      )}

      <ProductFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={() => {
          setShowCreate(false);
          load();
        }}
        categories={categories}
      />
    </div>
  );
}
