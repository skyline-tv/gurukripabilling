import { useMemo, useState } from 'react';
import { database } from './supabase.js';
import { money } from './records.js';
import FormField from './FormField.jsx';

const emptyForm = () => ({
  name: '',
  sku: '',
  category: '',
  rate: '',
  mrp: '',
  stock: '',
  minimum: '',
});

function Products({ products, refresh, flash }) {
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const categories = new Set(products.map((product) => product.category).filter(Boolean)).size;
  const lowCount = products.filter((product) => product.stock <= product.minimum).length;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const low = product.stock <= product.minimum;
      if (filter === 'low' && !low) return false;
      if (!needle) return true;
      return `${product.name} ${product.sku || ''} ${product.category || ''}`.toLowerCase().includes(needle);
    });
  }, [products, query, filter]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(true);
  };

  const closeForm = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormOpen(false);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      name: product.name,
      sku: product.sku,
      category: product.category || '',
      rate: product.rate,
      mrp: product.mrp,
      stock: product.stock,
      minimum: product.minimum,
    });
    setFormOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.name || !form.sku) return flash('Product name and SKU are required.', 'error');
    const payload = {
      name: form.name,
      sku: form.sku,
      category: form.category || null,
      selling_rate: +form.rate || 0,
      mrp: +form.mrp || 0,
      current_stock: +form.stock || 0,
      minimum_stock: +form.minimum || 0,
      updated_at: new Date().toISOString(),
    };
    const isEditing = Boolean(editing);
    setSaving(true);
    try {
      if (editing) await database.updateProduct(editing.id, payload);
      else await database.addProduct(payload);
      await refresh(true);
      closeForm();
      flash(isEditing ? 'Product updated.' : 'Product saved.');
    } catch (error) {
      flash(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await database.deleteProduct(product.id);
      await refresh(true);
      if (editing?.id === product.id) closeForm();
      flash('Product deleted.');
    } catch (error) {
      flash(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="products-page">
      <div className="delivery-orders-toolbar">
        <div>
          <p className="eyebrow">PRODUCTS</p>
          <span>Catalog items used on delivery orders. Name and SKU are required.</span>
        </div>
        {formOpen ? (
          <button className="secondary" type="button" onClick={closeForm} disabled={saving}>Close form</button>
        ) : (
          <button className="primary" type="button" onClick={openAdd}>Add product</button>
        )}
      </div>

      <section className="dashboard-metrics">
        <article className="dashboard-metric">
          <span className="dashboard-metric-label">Products</span>
          <strong>{products.length}</strong>
          <small>In the catalog</small>
        </article>
        <article className="dashboard-metric">
          <span className="dashboard-metric-label">Categories</span>
          <strong>{categories}</strong>
          <small>Distinct groups</small>
        </article>
        <article className={`dashboard-metric ${lowCount ? 'warning' : 'success'}`}>
          <span className="dashboard-metric-label">Low stock</span>
          <strong>{lowCount}</strong>
          <small>{lowCount ? 'Needs attention' : 'No alerts'}</small>
        </article>
      </section>

      {formOpen && (
        <form className="card adjust" onSubmit={save}>
          <h2>{editing ? 'Edit product' : 'Add product'}</h2>
          <p>{editing ? `Update ${editing.name}.` : 'New products start with the opening stock you enter here.'}</p>
          <div className="party-form">
            <FormField label="Product name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
            <FormField label="SKU / code" value={form.sku} onChange={(value) => setForm({ ...form, sku: value })} />
            <FormField label="Category" value={form.category} onChange={(value) => setForm({ ...form, category: value })} />
            <FormField label="Selling rate" type="number" value={form.rate} onChange={(value) => setForm({ ...form, rate: value })} />
            <FormField label="MRP" type="number" value={form.mrp} onChange={(value) => setForm({ ...form, mrp: value })} />
            <FormField label={editing ? 'Current stock' : 'Opening stock'} type="number" value={form.stock} onChange={(value) => setForm({ ...form, stock: value })} />
            <FormField label="Minimum stock" type="number" value={form.minimum} onChange={(value) => setForm({ ...form, minimum: value })} />
          </div>
          <div className="form-actions">
            <button className="primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update product' : 'Save product'}</button>
            <button type="button" className="secondary" onClick={closeForm} disabled={saving}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card table-wrap">
        <div className="table-heading">
          <div>
            <h2>Product catalog</h2>
            <small>{products.length ? `${visible.length} shown` : 'No products yet'}</small>
          </div>
          <div className="table-tools">
            <div className="period-filters">
              <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>All</button>
              <button type="button" className={filter === 'low' ? 'is-active' : ''} onClick={() => setFilter('low')}>Low stock</button>
            </div>
            <label className="order-search">
              Search
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, SKU, or category" />
            </label>
          </div>
        </div>
        {!products.length && <div className="page-empty">No products yet. Use Add product to create the first one.</div>}
        {products.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>SKU</th>
                <th>CATEGORY</th>
                <th>SELLING RATE</th>
                <th>MRP</th>
                <th>ON HAND</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((product) => {
                const low = product.stock <= product.minimum;
                return (
                  <tr
                    key={product.id}
                    className={`inventory-row${editing?.id === product.id ? ' is-selected' : ''}`}
                    onClick={() => openEdit(product)}
                  >
                    <td><b>{product.name}</b></td>
                    <td>{product.sku}</td>
                    <td>{product.category || '—'}</td>
                    <td>{money(product.rate)}</td>
                    <td>{money(product.mrp)}</td>
                    <td><b>{product.stock} units</b></td>
                    <td>
                      <mark className={low ? 'low' : 'available'}>{low ? 'Low stock' : 'Available'}</mark>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button type="button" onClick={(event) => { event.stopPropagation(); openEdit(product); }} disabled={saving}>Edit</button>
                        <button type="button" className="danger" onClick={(event) => { event.stopPropagation(); remove(product); }} disabled={saving}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!visible.length && (
                <tr>
                  <td colSpan="8" className="search-empty">
                    {filter === 'low' ? 'No products are at or below minimum.' : 'No products match that search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Products;
