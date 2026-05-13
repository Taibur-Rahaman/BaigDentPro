import React, { useState } from 'react';
import api from '@/api';
import { ApiError } from '@/components/ApiError';
import { useCreateProduct, useProducts } from '@/hooks/useProductsApi';
import { useToast } from '@/hooks/useToast';

const formatMoney = (n: number) =>
  `৳${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

export const TenantProductsPage: React.FC = () => {
  const { rows, loading, error, reload, clearError } = useProducts();
  const { create, pending: creating } = useCreateProduct();
  const { showSuccess, showError, ToastViewport } = useToast();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const n = name.trim();
    const p = Number.parseFloat(price);
    const c = cost.trim() === '' ? 0 : Number.parseFloat(cost);
    if (!n) {
      showError('Enter a product name.');
      return;
    }
    if (!Number.isFinite(p) || p < 0) {
      showError('Enter a valid price.');
      return;
    }
    if (!Number.isFinite(c) || c < 0) {
      showError('Enter a valid cost (or leave blank for 0).');
      return;
    }
    let uploadedImageUrl: string | null = null;
    if (imageFile) {
      try {
        uploadedImageUrl = await api.tenantProducts.uploadImage(imageFile);
      } catch (e) {
        showError(e instanceof Error ? e.message : 'Image upload failed');
        return;
      }
    }
    const result = await create(n, p, c, uploadedImageUrl);
    if (!result.ok) {
      showError(result.error);
      return;
    }
    setName('');
    setPrice('');
    setCost('');
    setImageFile(null);
    showSuccess('Product created');
    await reload();
  };

  return (
    <div className="tenant-page">
      <ToastViewport />
      <div className="tenant-page-header">
        <h1>Products</h1>
        <p className="tenant-page-lead">Manage your tenant catalog via the live API.</p>
      </div>

      {error ? (
        <ApiError message={error} title="Could not load products" onRetry={() => void reload()} />
      ) : null}

      <section className="tenant-panel" aria-labelledby="add-product-heading">
        <h2 id="add-product-heading" className="tenant-panel-title">
          Add product
        </h2>
        <form className="tenant-form-row" onSubmit={(e) => void handleCreate(e)}>
          <div className="tenant-form-field">
            <label htmlFor="tenant-product-name">Name</label>
            <input
              id="tenant-product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Whitening kit"
              autoComplete="off"
            />
          </div>
          <div className="tenant-form-field tenant-form-field-narrow">
            <label htmlFor="tenant-product-price">Sell price (BDT)</label>
            <input
              id="tenant-product-price"
              type="number"
              min={0}
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="tenant-form-field tenant-form-field-narrow">
            <label htmlFor="tenant-product-cost">Cost (BDT)</label>
            <input
              id="tenant-product-cost"
              type="number"
              min={0}
              step="0.01"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="0"
            />
          </div>
          <div className="tenant-form-field">
            <label htmlFor="tenant-product-image">Image</label>
            <input
              id="tenant-product-image"
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button type="submit" className="neo-btn neo-btn-primary tenant-form-submit" disabled={creating || loading}>
            {creating ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" aria-hidden /> Saving…
              </>
            ) : (
              <>
                <i className="fa-solid fa-plus" aria-hidden /> Add product
              </>
            )}
          </button>
        </form>
      </section>

      <section className="tenant-panel" aria-labelledby="product-list-heading">
        <h2 id="product-list-heading" className="tenant-panel-title">
          Your products
        </h2>

        {loading ? (
          <div className="tenant-loading" role="status">
            <div className="neo-loading-spinner tenant-spinner" />
            <span>Loading products…</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="tenant-empty">
            <i className="fa-solid fa-box-open" aria-hidden />
            <p>No products found</p>
            <p className="tenant-empty-hint">Create your first product using the form above.</p>
          </div>
        ) : (
          <div className="tenant-table-wrap">
            <table className="tenant-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Sell</th>
                  <th>Cost</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td data-label="Name">{r.name}</td>
                    <td data-label="Sell">{formatMoney(r.price)}</td>
                    <td data-label="Cost">{formatMoney(r.costPrice)}</td>
                    <td data-label="Updated">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
