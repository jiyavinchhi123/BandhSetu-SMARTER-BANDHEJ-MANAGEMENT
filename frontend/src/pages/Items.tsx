import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  CheckCircle,
  XCircle,
  AlertCircle,
  IndianRupee,
  Tag,
  ShieldCheck,
  RefreshCw,
  Info,
} from 'lucide-react';
import { api, ItemCatalogue } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { formatINR, formatIndianDate } from '../utils/formatters';

export const Items: React.FC = () => {
  const { role } = useAuth();
  const { showToast } = useToast();
  const isAdmin = role === 'admin';

  const [items, setItems] = useState<ItemCatalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemCatalogue | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    item_name: '',
    item_code: '',
    price_per_piece: '',
    description: '',
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchItems();
  }, [searchQuery, filterActive]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const params: { q?: string; active_only?: boolean } = {};
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (filterActive !== null) params.active_only = filterActive;

      const data = await api.getItems(params);
      setItems(data);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error Fetching Items',
        message: err.message || 'Failed to fetch items catalogue',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setFormData({
      item_name: '',
      item_code: '',
      price_per_piece: '',
      description: '',
      is_active: true,
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (item: ItemCatalogue) => {
    setEditingItem(item);
    setFormData({
      item_name: item.item_name,
      item_code: item.item_code || '',
      price_per_piece: item.price_per_piece.toString(),
      description: item.description || '',
      is_active: item.is_active,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_name.trim()) {
      showToast({
        type: 'error',
        title: 'Missing Required Field',
        message: 'Item Name is required',
      });
      return;
    }
    const price = parseFloat(formData.price_per_piece);
    if (isNaN(price) || price <= 0) {
      showToast({
        type: 'error',
        title: 'Invalid Price',
        message: 'Please enter a valid price per piece greater than 0',
      });
      return;
    }

    try {
      setSubmitting(true);
      if (editingItem) {
        await api.updateItem(editingItem.id, {
          item_name: formData.item_name.trim(),
          item_code: formData.item_code.trim() || undefined,
          price_per_piece: price,
          description: formData.description.trim() || undefined,
          is_active: formData.is_active,
        });
        showToast({
          type: 'success',
          title: 'Item Updated',
          message: 'Item specifications updated successfully',
        });
        setEditingItem(null);
      } else {
        await api.createItem({
          item_name: formData.item_name.trim(),
          item_code: formData.item_code.trim() || undefined,
          price_per_piece: price,
          description: formData.description.trim() || undefined,
          is_active: formData.is_active,
        });
        showToast({
          type: 'success',
          title: 'Item Added',
          message: 'New item added to catalogue',
        });
        setIsAddModalOpen(false);
      }
      fetchItems();
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Operation Failed',
        message: err.message || 'Failed to save item',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item: ItemCatalogue) => {
    try {
      const updated = await api.toggleItemStatus(item.id);
      showToast({
        type: 'success',
        title: 'Status Updated',
        message: `Item "${item.item_name}" is now ${updated.is_active ? 'Active' : 'Inactive'}`,
      });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Toggle Failed',
        message: err.message || 'Failed to toggle item status',
      });
    }
  };

  const totalItems = items.length;
  const activeItemsCount = items.filter((i) => i.is_active).length;
  const avgPrice =
    totalItems > 0
      ? items.reduce((acc, i) => acc + i.price_per_piece, 0) / totalItems
      : 0;

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header with Title and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Bandhej Item & Price Catalogue
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-brand-100 text-brand-800 border border-brand-200">
              {totalItems} Designs
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage fabric designs, tied knot rates, and historical price protection.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm rounded-xl shadow-sm transition-all focus:ring-2 focus:ring-brand-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Item</span>
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{totalItems}</div>
            <div className="text-xs text-slate-500 font-medium">Total Designs</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-700">{activeItemsCount}</div>
            <div className="text-xs text-slate-500 font-medium">Active Designs</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-900">{formatINR(avgPrice)}</div>
            <div className="text-xs text-slate-500 font-medium">Avg Piece Rate</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-blue-700">Protected</div>
            <div className="text-[11px] text-slate-500">Historical Lock</div>
          </div>
        </div>
      </div>

      {/* Historical Protection Notice */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-3 text-amber-900">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <strong className="font-semibold">Historical Price Protection Guaranteed:</strong> Whenever an item is issued to an artisan in a Work Distribution, its price per piece is permanently snapshotted. Updating rates here will apply strictly to future batches without retroactively affecting existing worker wages or ledger balances.
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name, code... (e.g. 'Rani', 'Saree')"
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setFilterActive(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterActive === null
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({totalItems})
          </button>
          <button
            onClick={() => setFilterActive(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterActive === true
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Active Only
          </button>
          <button
            onClick={() => setFilterActive(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterActive === false
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Inactive
          </button>
          <button
            onClick={fetchItems}
            title="Refresh"
            className="p-2 text-slate-500 hover:text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 ml-auto md:ml-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Items List - Desktop Table & Mobile Cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-brand-500 border-t-transparent mb-3" />
          <p className="text-sm text-slate-500">Loading item catalogue...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No items found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No designs matching "${searchQuery}". Try a different keyword.`
              : 'The catalogue is currently empty. Add your first Bandhej design item.'}
          </p>
          {isAdmin && !searchQuery && (
            <button
              onClick={handleOpenAdd}
              className="mt-4 px-4 py-2 bg-brand-600 text-white text-xs font-medium rounded-xl hover:bg-brand-700 transition-colors"
            >
              Add First Item
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Item Code</th>
                  <th className="py-3.5 px-4">Design / Item Name</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4 text-right">Price / Piece</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Created</th>
                  {isAdmin && <th className="py-3.5 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-xs text-slate-700">
                      {item.item_code ? (
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">
                          {item.item_code}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{item.item_name}</div>
                      <div className="text-xs text-slate-400">ID #{item.id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-xs max-w-xs truncate">
                      {item.description || '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-slate-900 text-base">
                        {formatINR(item.price_per_piece, true)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          item.is_active
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center text-xs text-slate-500">
                      {formatIndianDate(item.created_at)}
                    </td>
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                          title="Edit Item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            item.is_active
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={item.is_active ? 'Deactivate Item' : 'Activate Item'}
                        >
                          {item.is_active ? (
                            <XCircle className="w-4 h-4" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-900 text-base">
                        {item.item_name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          item.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {item.item_code && (
                      <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {item.item_code}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">
                      {formatINR(item.price_per_piece, true)}
                    </div>
                    <div className="text-[10px] text-slate-400">per piece</div>
                  </div>
                </div>

                {item.description && (
                  <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg">
                    {item.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
                  <span>Created: {formatIndianDate(item.created_at)}</span>

                  {isAdmin && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleToggleStatus(item)}
                        className={`px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1 ${
                          item.is_active
                            ? 'text-rose-700 bg-rose-50 hover:bg-rose-100'
                            : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                        }`}
                      >
                        {item.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add / Edit Item Modal */}
      {(isAddModalOpen || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-brand-50 text-brand-600">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">
                    {editingItem ? 'Edit Bandhej Item' : 'Add New Item Design'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingItem
                      ? `Updating design #${editingItem.id}`
                      : 'Register a new design and knot tie piece rate'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item / Design Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.item_name}
                  onChange={(e) =>
                    setFormData({ ...formData, item_name: e.target.value })
                  }
                  placeholder="e.g. Royal Khatri Saree, Rani Bandhani Dupatta"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Item Code (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.item_code}
                    onChange={(e) =>
                      setFormData({ ...formData, item_code: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g. BDH-001"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm uppercase font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Price per Piece (₹) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-semibold">
                      ₹
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      required
                      value={formData.price_per_piece}
                      onChange={(e) =>
                        setFormData({ ...formData, price_per_piece: e.target.value })
                      }
                      placeholder="180.00"
                      className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Specification
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="e.g. Pure Gaji silk with intricate 3-dot Rai Bandhej pattern"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active_toggle"
                  checked={formData.is_active}
                  onChange={(e) =>
                    setFormData({ ...formData, is_active: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
                />
                <label
                  htmlFor="is_active_toggle"
                  className="text-xs font-medium text-slate-700 cursor-pointer select-none"
                >
                  Active in Work Distribution Catalogue
                </label>
              </div>

              {editingItem && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200/80 flex items-start gap-2.5 text-amber-900 text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Price Change Policy:</strong> Updating the price here applies exclusively to new work consignments. Past worker ledger batches will maintain their historical rate.
                  </span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  {submitting
                    ? 'Saving...'
                    : editingItem
                    ? 'Update Catalogue'
                    : 'Add to Catalogue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
