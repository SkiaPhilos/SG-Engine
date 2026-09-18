import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  Image as ImageIcon,
  Tag,
  Percent,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Product, ProductStatus } from '../../types/store';
import { saveProduct, deleteProduct } from '../../services/store/storeService';
import { calculateProductPrice } from '../../engine/pricing/pricingEngine';
import { ImageUpload } from '../common/ImageUpload';

export const ProductsManager: React.FC = () => {
  const { products, categories, storeId, formatPrice, themeColors } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);
  const [saving, setSaving] = useState(false);

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategoryFilter === 'all' || p.categoryIds?.includes(selectedCategoryFilter);
    return matchesSearch && matchesCat;
  });

  const handleOpenAdd = () => {
    setCurrentProduct({
      name: '',
      price: 1000,
      compareAtPrice: 0,
      discountPercent: 0,
      description: '',
      stock: 10,
      sku: `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'active',
      featured: false,
      categoryIds: categories[0] ? [categories[0].id] : [],
      images: [],
      primaryImageIndex: 0,
    });
    setIsEditing(true);
  };

  const handleEdit = (p: Product) => {
    setCurrentProduct({ ...p });
    setIsEditing(true);
  };

  const handleDuplicate = async (p: Product) => {
    const duplicated: Partial<Product> = {
      ...p,
      id: undefined,
      name: `${p.name} (Copy)`,
      sku: `${p.sku || 'SKU'}-COPY`,
      createdAt: undefined,
      updatedAt: undefined,
    };
    await saveProduct(storeId, duplicated as any);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to permanently delete this product?')) {
      await deleteProduct(storeId, id);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct?.name?.trim() || currentProduct.price === undefined) return;
    setSaving(true);
    try {
      await saveProduct(storeId, currentProduct as any);
      setIsEditing(false);
      setCurrentProduct(null);
    } catch (e) {
      console.error(e);
      alert('Error saving product');
    } finally {
      setSaving(false);
    }
  };

  // Image helpers
  const handleAddImage = (url: string) => {
    if (!url.trim() || !currentProduct) return;
    setCurrentProduct({
      ...currentProduct,
      images: [...(currentProduct.images || []), url.trim()],
    });
  };

  const handleRemoveImage = (index: number) => {
    if (!currentProduct) return;
    const newImages = (currentProduct.images || []).filter((_, i) => i !== index);
    const newPrimary = currentProduct.primaryImageIndex === index ? 0 : Math.min(newImages.length - 1, currentProduct.primaryImageIndex || 0);
    setCurrentProduct({
      ...currentProduct,
      images: newImages,
      primaryImageIndex: Math.max(0, newPrimary),
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: themeColors.text }}>
            Product Catalog ({products.length})
          </h2>
          <p className="text-xs" style={{ color: themeColors.muted }}>
            Manage pricing, stock levels, multi-image assets, and individual product discounts.
          </p>
        </div>

        <button
          id="add-product-btn"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all active:scale-95"
          style={{ backgroundColor: themeColors.primary }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by title or SKU..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border text-xs outline-none"
            style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface, color: themeColors.text }}
          />
        </div>

        <select
          value={selectedCategoryFilter}
          onChange={e => setSelectedCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-xl border text-xs outline-none w-full sm:w-auto"
          style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface, color: themeColors.text }}
        >
          <option value="all">All Categories</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Product List Table / Grid */}
      <div
        className="rounded-2xl border overflow-hidden shadow-xs"
        style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b" style={{ borderColor: themeColors.border, backgroundColor: `${themeColors.primary}05` }}>
              <tr style={{ color: themeColors.muted }}>
                <th className="py-3 px-4 font-semibold">Product</th>
                <th className="py-3 px-4 font-semibold">Categories</th>
                <th className="py-3 px-4 font-semibold">Price &amp; Discount</th>
                <th className="py-3 px-4 font-semibold">Stock</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center" style={{ color: themeColors.muted }}>
                    No products found matching your search.
                  </td>
                </tr>
              ) : (
                filteredProducts.map(prod => {
                  const { unitPrice, originalPrice, discountPercent } = calculateProductPrice(prod);
                  const prodCats = categories.filter(c => prod.categoryIds?.includes(c.id));
                  const thumb = prod.images?.[prod.primaryImageIndex || 0] || prod.images?.[0];

                  return (
                    <tr key={prod.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-800 border flex-shrink-0 flex items-center justify-center" style={{ borderColor: themeColors.border }}>
                            {thumb ? (
                              <img src={thumb} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <ImageIcon className="w-4 h-4 text-neutral-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold truncate max-w-[180px] sm:max-w-[220px]" style={{ color: themeColors.text }}>
                              {prod.name}
                            </p>
                            <p className="text-[10px] font-mono" style={{ color: themeColors.muted }}>
                              {prod.sku || 'NO-SKU'}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {prodCats.length > 0 ? (
                            prodCats.map(c => (
                              <span key={c.id} className="px-2 py-0.5 rounded-full text-[10px] bg-neutral-100 dark:bg-neutral-800" style={{ color: themeColors.text }}>
                                {c.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-neutral-400 text-[10px]">Uncategorized</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-baseline gap-1.5">
                          <span className="font-bold" style={{ color: themeColors.primary }}>
                            {formatPrice(unitPrice)}
                          </span>
                          {discountPercent > 0 && (
                            <span className="text-[10px] line-through text-neutral-400">
                              {formatPrice(originalPrice)}
                            </span>
                          )}
                        </div>
                        {discountPercent > 0 && (
                          <span className="text-[10px] font-bold text-red-600">
                            -{discountPercent}% OFF
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`font-semibold ${prod.stock <= 0 ? 'text-red-500' : prod.stock < 5 ? 'text-amber-500' : ''}`}>
                          {prod.stock} units
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            prod.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'
                          }`}
                        >
                          {prod.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleDuplicate(prod)}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                            title="Duplicate product"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEdit(prod)}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-indigo-600 transition-colors"
                            title="Edit product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(prod.id)}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-red-600 transition-colors"
                            title="Delete product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit / Add Modal */}
      {isEditing && currentProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div
            className="w-full max-w-2xl rounded-2xl border shadow-2xl p-6 sm:p-8 my-8 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
          >
            <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: themeColors.border }}>
              <h3 className="text-lg font-bold">
                {currentProduct.id ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button onClick={() => setIsEditing(false)} className="p-1 text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Product Title *</label>
                <input
                  type="text"
                  required
                  value={currentProduct.name || ''}
                  onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Base Price *</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={currentProduct.price ?? ''}
                    onChange={e => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Discount % (0-100)</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={currentProduct.discountPercent ?? 0}
                    onChange={e => setCurrentProduct({ ...currentProduct, discountPercent: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    min={0}
                    value={currentProduct.stock ?? 0}
                    onChange={e => setCurrentProduct({ ...currentProduct, stock: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">SKU</label>
                  <input
                    type="text"
                    value={currentProduct.sku || ''}
                    onChange={e => setCurrentProduct({ ...currentProduct, sku: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Status</label>
                  <select
                    value={currentProduct.status || 'active'}
                    onChange={e => setCurrentProduct({ ...currentProduct, status: e.target.value as ProductStatus })}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                    style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                  >
                    <option value="active">Active (Visible)</option>
                    <option value="draft">Draft (Hidden)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* Category selector */}
              <div>
                <label className="block font-semibold mb-1">Assigned Categories</label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {categories.map(cat => {
                    const isChecked = currentProduct.categoryIds?.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          const existing = currentProduct.categoryIds || [];
                          const updated = isChecked
                            ? existing.filter(id => id !== cat.id)
                            : [...existing, cat.id];
                          setCurrentProduct({ ...currentProduct, categoryIds: updated });
                        }}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          isChecked ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-transparent'
                        }`}
                        style={{ borderColor: isChecked ? undefined : themeColors.border }}
                      >
                        {cat.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Images Manager */}
              <div className="space-y-3">
                <ImageUpload
                  value=""
                  onChange={url => {
                    if (url) handleAddImage(url);
                  }}
                  label="Product Photography"
                  helperText="Drop or select a product photo from your device to add to gallery"
                  aspectRatio="video"
                  maxDimension={1200}
                />

                {/* Thumbnails list */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {(currentProduct.images || []).map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 rounded-xl border overflow-hidden group" style={{ borderColor: themeColors.border }}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1 right-1 p-0.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentProduct({ ...currentProduct, primaryImageIndex: idx })}
                        className={`absolute bottom-0 inset-x-0 text-[9px] text-center font-bold py-0.5 ${
                          currentProduct.primaryImageIndex === idx ? 'bg-indigo-600 text-white' : 'bg-black/60 text-white opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {currentProduct.primaryImageIndex === idx ? 'Primary' : 'Set Primary'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  value={currentProduct.description || ''}
                  onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                  placeholder="Full specifications, dimensions, materials, care instructions..."
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-none resize-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="featured-toggle"
                  checked={Boolean(currentProduct.featured)}
                  onChange={e => setCurrentProduct({ ...currentProduct, featured: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="featured-toggle" className="font-semibold cursor-pointer">
                  Feature on Store Homepage
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t" style={{ borderColor: themeColors.border }}>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border font-semibold"
                  style={{ borderColor: themeColors.border }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2 rounded-xl font-bold text-white shadow-xs"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
