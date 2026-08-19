import { useEffect, useMemo, useState } from 'react';
import { database } from './supabase.js';
import { money } from './records.js';
import SearchPicker from './SearchPicker.jsx';

function Inventory({ products, refresh, flash, user }) {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!products.some((product) => product.id === productId)) setProductId('');
  }, [products, productId]);

  const selected = products.find((product) => product.id === productId);
  const qty = Number(quantity) || 0;
  const afterStock = selected ? selected.stock + Math.max(0, qty) : 0;
  const lowCount = products.filter((product) => product.stock <= product.minimum).length;
  const totalUnits = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return products.filter((product) => {
      const low = product.stock <= product.minimum;
      if (filter === 'low' && !low) return false;
      if (!needle) return true;
      return `${product.name} ${product.sku || ''} ${product.category || ''}`.toLowerCase().includes(needle);
    });
  }, [products, query, filter]);

  const stockIn = async () => {
    const product = products.find((item) => item.id === productId);
    const received = +quantity;
    if (!product || received <= 0) return flash('Select a product and enter how many units were received.', 'error');
    setSaving(true);
    try {
      await database.updateProduct(product.id, { current_stock: product.stock + received, updated_at: new Date().toISOString() });
      await database.addMovement({
        product_id: product.id,
        movement_type: 'stock_in',
        quantity: received,
        reference_type: 'manual',
        notes: 'Stock received',
        created_by: user.id,
      });
      await refresh(true);
      setQuantity('');
      flash(`${received} unit${received === 1 ? '' : 's'} added to ${product.name}.`);
    } catch (error) {
      flash(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="inventory-page">
      <div className="delivery-orders-toolbar">
        <div>
          <p className="eyebrow">INVENTORY</p>
          <span>Search a product, enter quantity received, then add to stock.</span>
        </div>
      </div>

      <section className="dashboard-metrics">
        <article className="dashboard-metric">
          <span className="dashboard-metric-label">Products</span>
          <strong>{products.length}</strong>
          <small>In the catalog</small>
        </article>
        <article className={`dashboard-metric ${lowCount ? 'warning' : 'success'}`}>
          <span className="dashboard-metric-label">Low stock</span>
          <strong>{lowCount}</strong>
          <small>{lowCount ? 'Needs attention' : 'No alerts'}</small>
        </article>
        <article className="dashboard-metric">
          <span className="dashboard-metric-label">Units on hand</span>
          <strong>{totalUnits}</strong>
          <small>Across all products</small>
        </article>
      </section>

      <section className="card adjust">
        <h2>Add stock</h2>
        <p>Stock received is added immediately. Confirmed delivery orders deduct stock automatically.</p>
        <div className="inventory-form">
          <label className="picker-label">
            Product
            <SearchPicker
              value={productId}
              items={products}
              disabled={!products.length}
              getId={(product) => product.id}
              getSearchText={(product) => `${product.name} ${product.sku || ''}`}
              placeholder="Select product — search name or SKU"
              emptyText="No product matches that search."
              onChange={setProductId}
              renderValue={(product) => (
                <span className="picker-product">
                  <span>
                    <b>{product.name}</b>
                    <small>{product.sku || 'No SKU'} · {product.stock} in stock</small>
                  </span>
                </span>
              )}
              renderOption={(product) => (
                <span className="picker-product">
                  <span>
                    <b>{product.name}</b>
                    <small>{product.stock <= product.minimum ? `Low · ${product.stock} left` : `${product.stock} in stock`}</small>
                  </span>
                  <strong>{money(product.rate)}</strong>
                </span>
              )}
            />
          </label>
          <label className="picker-label">
            Quantity received
            <input
              className="text-field"
              type="number"
              min="1"
              value={quantity}
              disabled={!productId}
              onChange={(event) => setQuantity(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  stockIn();
                }
              }}
            />
          </label>
          <button className="primary" type="button" onClick={stockIn} disabled={saving || !products.length || !productId || qty < 1}>
            {saving ? 'Saving…' : 'Add to inventory'}
          </button>
        </div>
        {selected && (
          <div className="selected-party">
            <span>Stock impact</span>
            <b>{selected.name}</b>
            <small>
              {selected.stock} on hand
              {qty >= 1 ? ` → ${afterStock} after this receipt` : selected.stock <= selected.minimum ? ` · below minimum of ${selected.minimum}` : ''}
            </small>
          </div>
        )}
      </section>

      <div className="card table-wrap">
        <div className="table-heading">
          <div>
            <h2>Stock register</h2>
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
        {!products.length && <div className="page-empty">No products yet. Add products first, then receive stock here.</div>}
        {products.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>PRODUCT</th>
                <th>SKU</th>
                <th>CATEGORY</th>
                <th>RATE</th>
                <th>ON HAND</th>
                <th>MINIMUM</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((product) => {
                const low = product.stock <= product.minimum;
                return (
                  <tr
                    key={product.id}
                    className={`inventory-row${product.id === productId ? ' is-selected' : ''}${low ? ' is-low' : ''}`}
                    onClick={() => setProductId(product.id)}
                  >
                    <td><b>{product.name}</b></td>
                    <td>{product.sku || '—'}</td>
                    <td>{product.category || '—'}</td>
                    <td>{money(product.rate)}</td>
                    <td><b>{product.stock}</b></td>
                    <td>{product.minimum}</td>
                    <td>
                      <mark className={low ? 'low' : 'available'}>{low ? 'Low stock' : 'Available'}</mark>
                    </td>
                  </tr>
                );
              })}
              {!visible.length && (
                <tr>
                  <td colSpan="7" className="search-empty">{filter === 'low' ? 'No products are at or below minimum.' : 'No products match that search.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Inventory;
