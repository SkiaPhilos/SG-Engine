import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ArrowUpDown, Check, X, FolderTree } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { Category } from '../../types/store';
import { saveCategory, deleteCategory } from '../../services/store/storeService';

export const CategoriesManager: React.FC = () => {
  const { categories, products, storeId, themeColors } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [currentCat, setCurrentCat] = useState<Partial<Category> | null>(null);
  const [saving, setSaving] = useState(false);

  const handleOpenAdd = () => {
    setCurrentCat({
      name: '',
      description: '',
      imageUrl: '',
      sortOrder: categories.length + 1,
      isActive: true,
    });
    setIsEditing(true);
  };

  const handleEdit = (cat: Category) => {
    setCurrentCat({ ...cat });
    setIsEditing(true);
  };

  const handleDelete = async (id: string, name: string) => {
    const assignedCount = products.filter(p => p.categoryIds?.includes(id)).length;
    const confirmMsg = assignedCount > 0
      ? `Category "${name}" is assigned to ${assignedCount} product(s). Deleting will safely unlink this category from those products without deleting the products. Continue?`
      : `Are you sure you want to delete category "${name}"?`;

    if (confirm(confirmMsg)) {
      await deleteCategory(storeId, id);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCat?.name?.trim()) return;
    setSaving(true);
    try {
      await saveCategory(storeId, currentCat as any);
      setIsEditing(false);
      setCurrentCat(null);
    } catch (e) {
      console.error(e);
      alert('Error saving category');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: themeColors.text }}>
            Dynamic Categories ({categories.length})
          </h2>
          <p className="text-xs" style={{ color: themeColors.muted }}>
            Define custom navigation collections. Products can belong to multiple categories.
          </p>
        </div>

        <button
          id="add-category-btn"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-xs transition-all active:scale-95"
          style={{ backgroundColor: themeColors.primary }}
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Categories List */}
      <div
        className="rounded-2xl border overflow-hidden shadow-xs"
        style={{ borderColor: themeColors.border, backgroundColor: themeColors.surface }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b" style={{ borderColor: themeColors.border, backgroundColor: `${themeColors.primary}05` }}>
              <tr style={{ color: themeColors.muted }}>
                <th className="py-3 px-4 font-semibold">Order</th>
                <th className="py-3 px-4 font-semibold">Category Name</th>
                <th className="py-3 px-4 font-semibold">Slug</th>
                <th className="py-3 px-4 font-semibold">Linked Products</th>
                <th className="py-3 px-4 font-semibold">Visibility</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: themeColors.border }}>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center" style={{ color: themeColors.muted }}>
                    No categories created yet. Click &quot;Add Category&quot; to establish your catalog structure.
                  </td>
                </tr>
              ) : (
                categories.map((cat, idx) => {
                  const linkedCount = products.filter(p => p.categoryIds?.includes(cat.id)).length;
                  return (
                    <tr key={cat.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-850/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-400">
                        #{cat.sortOrder ?? idx + 1}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <FolderTree className="w-4 h-4 text-neutral-400" />
                          <span className="font-bold text-sm" style={{ color: themeColors.text }}>
                            {cat.name}
                          </span>
                        </div>
                        {cat.description && (
                          <p className="text-[11px] mt-0.5 truncate max-w-xs" style={{ color: themeColors.muted }}>
                            {cat.description}
                          </p>
                        )}
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                        /{cat.slug}
                      </td>

                      <td className="py-3 px-4 font-semibold">
                        <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-[11px]">
                          {linkedCount} product{linkedCount === 1 ? '' : 's'}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cat.isActive !== false
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-neutral-200 text-neutral-600'
                          }`}
                        >
                          {cat.isActive !== false ? 'Live' : 'Hidden'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(cat)}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-indigo-600 transition-colors"
                            title="Edit category"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(cat.id, cat.name)}
                            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-red-600 transition-colors"
                            title="Delete category safely"
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

      {/* Modal Editor */}
      {isEditing && currentCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div
            className="w-full max-w-md rounded-2xl border shadow-2xl p-6"
            style={{ backgroundColor: themeColors.surface, borderColor: themeColors.border, color: themeColors.text }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: themeColors.border }}>
              <h3 className="text-base font-bold">
                {currentCat.id ? 'Edit Category' : 'Create New Category'}
              </h3>
              <button onClick={() => setIsEditing(false)} className="p-1 text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 pt-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={currentCat.name || ''}
                  onChange={e => setCurrentCat({ ...currentCat, name: e.target.value })}
                  placeholder="e.g. Summer Collection, Smart Devices, Accessories"
                  className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Custom URL Slug (Optional)</label>
                <input
                  type="text"
                  value={currentCat.slug || ''}
                  onChange={e => setCurrentCat({ ...currentCat, slug: e.target.value })}
                  placeholder="e.g. summer-collection"
                  className="w-full px-3 py-2 rounded-xl border text-xs font-mono outline-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Display Sort Order</label>
                <input
                  type="number"
                  value={currentCat.sortOrder ?? 1}
                  onChange={e => setCurrentCat({ ...currentCat, sortOrder: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={currentCat.description || ''}
                  onChange={e => setCurrentCat({ ...currentCat, description: e.target.value })}
                  placeholder="Brief synopsis for customer header"
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-none resize-none"
                  style={{ borderColor: themeColors.border, backgroundColor: themeColors.background }}
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cat-active-toggle"
                  checked={currentCat.isActive !== false}
                  onChange={e => setCurrentCat({ ...currentCat, isActive: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="cat-active-toggle" className="font-semibold cursor-pointer">
                  Show in Public Storefront Navigation
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t" style={{ borderColor: themeColors.border }}>
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
                  className="px-5 py-2 rounded-xl font-bold text-white shadow-xs"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
