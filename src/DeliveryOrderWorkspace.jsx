import { useEffect, useMemo, useRef, useState } from 'react';
import { database } from './supabase.js';
import { invoiceFromOrder, money } from './records.js';
import SearchPicker from './SearchPicker.jsx';
import BillPrint from './BillPrint.jsx';

const blankLine = () => ({ productId: '', quantity: 1 });
const emptyParty = () => ({ name: '', mobile: '', city: '', gst: '', fssai: '', salesman: '' });

const availableStock = (productId, lineIndex, lineList, products, originalOrder) => {
  const product = products.find((item) => item.id === productId);
  if (!product) return 0;
  const reserved = originalOrder?.items.reduce((sum, item) => (
    item.productId === productId ? sum + Number(item.quantity || 0) : sum
  ), 0) || 0;
  const usedElsewhere = lineList.reduce((sum, line, index) => {
    if (index === lineIndex || line.productId !== productId) return sum;
    return sum + (Number(line.quantity) || 0);
  }, 0);
  return product.stock + reserved - usedElsewhere;
};

function PartyPicker({ value, customers, onChange, disabled, afterSelect, focusSignal }) {
  return (
    <SearchPicker
      value={value}
      items={customers}
      disabled={disabled}
      getId={(party) => party.id}
      getSearchText={(party) => `${party.name} ${party.mobile || ''}`}
      placeholder="Select party — search name or mobile"
      emptyText="No party matches that search."
      onChange={onChange}
      afterSelect={afterSelect}
      focusSignal={focusSignal}
      renderValue={(party) => (
        <span className="picker-party">
          <b>{party.name}</b>
          <small>{party.mobile || 'No mobile number'}</small>
        </span>
      )}
      renderOption={(party) => (
        <span className="picker-party">
          <b>{party.name}</b>
          <small>{party.mobile || 'No mobile number'}</small>
        </span>
      )}
    />
  );
}

function ProductPicker({ value, products, lineIndex, lines, originalOrder, onChange, disabled, afterSelect, focusSignal }) {
  const items = products.map((product) => {
    const stock = availableStock(product.id, lineIndex, lines, products, originalOrder);
    return { ...product, available: stock, disabled: stock <= 0 && product.id !== value };
  });
  return (
    <SearchPicker
      value={value}
      items={items}
      disabled={disabled}
      getId={(product) => product.id}
      getSearchText={(product) => `${product.name} ${product.sku || ''}`}
      placeholder="Select product — search name"
      emptyText="No product matches that search."
      onChange={onChange}
      afterSelect={afterSelect}
      focusSignal={focusSignal}
      renderValue={(product) => (
        <span className="picker-product">
          <span>
            <b>{product.name}</b>
            <small>{money(product.rate)} · {product.available} in stock</small>
          </span>
        </span>
      )}
      renderOption={(product) => (
        <span className="picker-product">
          <span>
            <b>{product.name}</b>
            <small>{product.disabled ? 'Out of stock' : `${product.available} available`}</small>
          </span>
          <strong>{money(product.rate)}</strong>
        </span>
      )}
    />
  );
}

function ProductLines({ lines, products, originalOrder, flash, onChange, focusProduct, onFocusProduct }) {
  const qtyRefs = useRef([]);
  const updateQty = (index, raw) => {
    const line = lines[index];
    const product = products.find((item) => item.id === line.productId);
    if (!product) {
      onChange(lines.map((item, i) => i === index ? { ...item, quantity: raw } : item));
      return;
    }
    const max = availableStock(line.productId, index, lines, products, originalOrder);
    if (raw === '') {
      onChange(lines.map((item, i) => i === index ? { ...item, quantity: '' } : item));
      return;
    }
    const next = Number(raw);
    if (!Number.isFinite(next)) return;
    if (next > max) {
      flash(`Only ${max} unit${max === 1 ? '' : 's'} of ${product.name} available.`, 'error');
      onChange(lines.map((item, i) => i === index ? { ...item, quantity: Math.max(0, max) } : item));
      return;
    }
    onChange(lines.map((item, i) => i === index ? { ...item, quantity: Math.max(1, next) } : item));
  };

  return (
    <>
      {lines.map((line, index) => {
        const product = products.find((item) => item.id === line.productId);
        const stock = line.productId ? availableStock(line.productId, index, lines, products, originalOrder) : 0;
        const qty = Number(line.quantity) || 0;
        const over = Boolean(product && qty > stock);
        return (
          <div className={`order-line has-picker${over ? ' is-invalid' : ''}`} key={index}>
            <ProductPicker
              value={line.productId}
              products={products}
              lineIndex={index}
              lines={lines}
              originalOrder={originalOrder}
              disabled={!products.length}
              focusSignal={focusProduct?.tick && focusProduct.index === index ? String(focusProduct.tick) : ''}
              afterSelect={() => window.setTimeout(() => qtyRefs.current[index]?.focus(), 0)}
              onChange={(productId) => {
                const max = availableStock(productId, index, lines, products, originalOrder);
                onChange(lines.map((item, i) => i === index ? { productId, quantity: Math.min(Number(item.quantity) || 1, Math.max(1, max)) } : item));
              }}
            />
            <input
              ref={(node) => { qtyRefs.current[index] = node; }}
              type="number"
              min="1"
              max={product ? stock : undefined}
              value={line.quantity}
              disabled={!line.productId}
              onChange={(event) => updateQty(index, event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                if (!line.productId) return;
                if (index === lines.length - 1) onChange([...lines, blankLine()]);
                onFocusProduct?.(index + 1);
              }}
              aria-label="Quantity"
            />
            <b>{money((product?.rate || 0) * qty)}</b>
            {lines.length > 1 && <button type="button" className="remove-line" onClick={() => onChange(lines.filter((_, i) => i !== index))}>×</button>}
            {product && (
              <p className={`stock-hint${over ? ' is-error' : stock <= product.minimum ? ' is-low' : ''}`}>
                {over ? `Only ${stock} available. Reduce quantity before confirming.` : `Available stock: ${stock} units. Confirming will deduct ${qty || 0}.`}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}

function OrderSummary({ party, lines, products, originalOrder }) {
  const rows = lines.map((line, index) => {
    const product = products.find((item) => item.id === line.productId);
    if (!product) return null;
    const qty = Number(line.quantity) || 0;
    const stock = availableStock(line.productId, index, lines, products, originalOrder);
    return { id: `${line.productId}-${index}`, name: product.name, qty, after: stock - qty };
  }).filter(Boolean);
  const totalQty = rows.reduce((sum, row) => sum + row.qty, 0);
  if (!party && !rows.length) return null;
  return (
    <section className="order-summary" aria-label="Delivery order summary">
      <h3>Check before confirming</h3>
      <p><span>Party</span><b>{party ? `${party.name}${party.mobile ? ` · ${party.mobile}` : ''}` : 'Not selected'}</b></p>
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            <span>{row.name} × {row.qty}</span>
            <small>Stock after confirm: {row.after}</small>
          </li>
        ))}
        {!rows.length && <li>No products added yet.</li>}
      </ul>
      <p className="order-summary-total"><span>Total quantity</span><b>{totalQty}</b></p>
      <p className="order-summary-note">Confirming this Delivery Order will deduct the quantities above from available stock.</p>
    </section>
  );
}

function DeliveryOrderWorkspace({ products, customers, orders, invoices = [], refresh, flash, user, role = 'staff', onFormClose, formOpen, go }) {
  const today = new Date().toISOString().slice(0, 10);
  const isAdmin = role === 'admin';
  const defaultSalesman = (user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Staff').trim();
  const editorRef = useRef(null);
  const [customerId, setCustomerId] = useState('');
  const [salesmanName, setSalesmanName] = useState(isAdmin ? '' : defaultSalesman);
  const [orderDate, setOrderDate] = useState(today);
  const [lines, setLines] = useState([blankLine()]);
  const [saving, setSaving] = useState(false);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [printOrders, setPrintOrders] = useState([]);
  const [deletingId, setDeletingId] = useState('');
  const [invoicingId, setInvoicingId] = useState('');
  const [editingOrder, setEditingOrder] = useState(null);
  const [billCustomerId, setBillCustomerId] = useState('');
  const [billLines, setBillLines] = useState([]);
  const [billSaving, setBillSaving] = useState(false);
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerForm, setCustomerForm] = useState(emptyParty);
  const [focusProduct, setFocusProduct] = useState({ index: 0, tick: 0 });
  const [listQuery, setListQuery] = useState('');
  const [period, setPeriod] = useState('today');

  useEffect(() => {
    if (customerId && !customers.some((customer) => customer.id === customerId)) setCustomerId('');
    setLines((current) => current.map((line) => (line.productId && !products.some((product) => product.id === line.productId) ? blankLine() : line)));
  }, [customers, products, customerId]);

  useEffect(() => {
    if (!isAdmin && !salesmanName) setSalesmanName(defaultSalesman);
  }, [defaultSalesman, isAdmin, salesmanName]);

  const party = customers.find((customer) => customer.id === customerId);
  const total = lines.reduce((sum, line) => sum + (products.find((product) => product.id === line.productId)?.rate || 0) * (Number(line.quantity) || 0), 0);
  const filled = lines.map((line, index) => ({ line, index })).filter(({ line }) => line.productId);
  const itemsReady = filled.length > 0 && filled.every(({ line, index }) => {
    const qty = Number(line.quantity) || 0;
    return qty >= 1 && qty <= availableStock(line.productId, index, lines, products, null);
  });
  const canConfirm = Boolean(party && itemsReady && products.length && customers.length && (isAdmin ? salesmanName.trim() : defaultSalesman));

  const resetForm = () => {
    setCustomerId('');
    setLines([blankLine()]);
    setSalesmanName(isAdmin ? '' : defaultSalesman);
    setOrderDate(today);
    setAddingCustomer(false);
    setCustomerForm(emptyParty());
    setFocusProduct({ index: 0, tick: 0 });
  };

  const selectParty = (id) => {
    setCustomerId(id);
    const next = customers.find((item) => item.id === id);
    if (next?.salesman) setSalesmanName(next.salesman);
    else if (!isAdmin) setSalesmanName(defaultSalesman);
    setFocusProduct({ index: 0, tick: Date.now() });
  };

  const addCustomer = async () => {
    if (!customerForm.name) return flash('Party name is required.', 'error');
    setCustomerSaving(true);
    try {
      const [created] = await database.addCustomer({
        name: customerForm.name,
        mobile: customerForm.mobile || null,
        city: customerForm.city || null,
        gst_number: customerForm.gst || null,
        fssai_number: customerForm.fssai || null,
        salesman_name: customerForm.salesman || null,
      });
      await refresh(true);
      setCustomerId(created.id);
      if (customerForm.salesman) setSalesmanName(customerForm.salesman);
      setCustomerForm(emptyParty());
      setAddingCustomer(false);
      flash('Party added and selected for this Delivery Order.');
    } catch (error) {
      flash(error.message, 'error');
    } finally {
      setCustomerSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const customer = customers.find((item) => item.id === customerId);
    const effectiveSalesman = (isAdmin ? salesmanName : defaultSalesman).trim();
    if (!customer) return flash('Select a party before confirming the Delivery Order.', 'error');
    if (!effectiveSalesman) return flash('Salesman name is required.', 'error');
    const items = lines.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      return product && { product_id: product.id, description: product.name, rate: product.rate, mrp: product.mrp, quantity: Number(line.quantity), amount: product.rate * Number(line.quantity) };
    }).filter(Boolean);
    const required = items.reduce((counts, item) => ({ ...counts, [item.product_id]: (counts[item.product_id] || 0) + item.quantity }), {});
    const insufficient = products.find((product) => required[product.id] > product.stock);
    if (!items.length || items.some((item) => item.quantity <= 0)) return flash('Add at least one product and quantity.', 'error');
    if (insufficient) return flash(`Only ${insufficient.stock} units of ${insufficient.name} are available.`, 'error');
    setSaving(true);
    try {
      const number = `DO-${String(orders.length + 1).padStart(5, '0')}`;
      await database.createOrder({
        order: { order_number: number, customer_id: customer.id, order_date: orderDate || today, salesman_name: effectiveSalesman, taxable_amount: total, total_amount: total, status: 'draft', created_by: user.id },
        items,
      });
      await database.updateCustomer(customer.id, { salesman_name: effectiveSalesman, updated_at: new Date().toISOString() });
      await refresh(true);
      resetForm();
      onFormClose?.();
      flash(`${number} confirmed. Stock has been deducted.`);
    } catch (error) {
      flash(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (order) => {
    setEditingOrder(order);
    setBillCustomerId(order.customerId || '');
    setBillLines(order.items.map((item) => ({ productId: item.productId, quantity: item.quantity })));
    window.setTimeout(() => editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    const items = billLines.map((line, index) => {
      const product = products.find((item) => item.id === line.productId);
      const stock = availableStock(line.productId, index, billLines, products, editingOrder);
      const quantity = Number(line.quantity) || 0;
      if (!product || quantity <= 0 || quantity > stock) return null;
      return { product_id: product.id, description: product.name, rate: product.rate, mrp: product.mrp, quantity, amount: product.rate * quantity };
    });
    if (!billCustomerId || items.some((item) => !item) || !items.length) return flash('Select a party, product, and a quantity within available stock for every line.', 'error');
    setBillSaving(true);
    try {
      await database.updateOrderWithItems(editingOrder.id, billCustomerId, items);
      await refresh(true);
      setEditingOrder(null);
      setBillLines([]);
      flash(`${editingOrder.number} updated. Stock has been adjusted.`);
    } catch (error) {
      flash(error.message, 'error');
    } finally {
      setBillSaving(false);
    }
  };

  const openPrint = (ordersToPrint) => {
    setPrintOrders(ordersToPrint);
  };

  const openPrintRange = (from = fromDate, to = toDate) => {
    if (!from || !to || from > to) return flash('Choose a valid date range.', 'error');
    const selected = orders.filter((order) => order.orderDate >= from && order.orderDate <= to);
    if (!selected.length) return flash('No Delivery Orders found for this period.', 'error');
    openPrint(selected);
  };

  const makeInvoice = async (order) => {
    const existing = invoices.find((invoice) => invoice.orderId === order.id);
    if (existing) {
      flash(`${existing.number} already exists for this order.`);
      go?.('Invoices');
      return;
    }
    if (!order.customerId) return flash('This order has no party, so an invoice cannot be created.', 'error');
    setInvoicingId(order.id);
    try {
      const payload = invoiceFromOrder(order, products, invoices.length);
      payload.invoice.created_by = user?.id || null;
      const created = await database.createInvoice(payload);
      await refresh(true);
      flash(`${created.invoice_number} created with CGST and SGST.`);
      go?.('Invoices');
    } catch (error) {
      flash(error.message, 'error');
    } finally {
      setInvoicingId('');
    }
  };

  const deleteOrder = async (order) => {
    if (invoices.some((invoice) => invoice.orderId === order.id)) {
      return flash('Delete the invoice first, then delete this order.', 'error');
    }
    if (!window.confirm(`Delete ${order.number}? Stock will be restored. This cannot be undone.`)) return;
    setDeletingId(order.id);
    try {
      await database.deleteOrder(order.id);
      if (editingOrder?.id === order.id) {
        setEditingOrder(null);
        setBillLines([]);
      }
      await refresh(true);
      flash(`${order.number} deleted. Stock restored.`);
    } catch (error) {
      flash(error.message, 'error');
    } finally {
      setDeletingId('');
    }
  };

  const filteredOrders = useMemo(() => {
    const needle = listQuery.trim().toLowerCase();
    return orders.filter((order) => {
      if (period === 'today' && order.orderDate !== today) return false;
      if (!needle) return true;
      return `${order.number} ${order.customer} ${order.customerMobile || ''}`.toLowerCase().includes(needle);
    });
  }, [orders, listQuery, period, today]);

  const catalogReady = products.length && customers.length;
  const editParty = customers.find((customer) => customer.id === billCustomerId);

  return (
    <>
      {printOrders.length > 0 && (
        <BillPrint orders={printOrders} onClose={() => setPrintOrders([])} />
      )}
      <div className="order-grid">
        <form className="card order-form" onSubmit={submit}>
          <h2>
            New Delivery Order
            {formOpen && (
              <button type="button" className="dialog-close" onClick={onFormClose}>
                Close
              </button>
            )}
          </h2>
          <div className="order-form-body">
            <label className="picker-label">
              Party <span className="req">*</span>
              <PartyPicker value={customerId} customers={customers} disabled={!customers.length} onChange={selectParty} afterSelect={() => setFocusProduct({ index: 0, tick: Date.now() })} />
            </label>
            {party && (
              <div className="selected-party">
                <span>Selected party</span>
                <b>{party.name}</b>
                <small>{party.mobile || 'No mobile number'}</small>
              </div>
            )}
            <div className="order-meta-fields">
              <label className="picker-label">
                Date
                <input className="text-field" type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} />
              </label>
              <label className="picker-label">
                Salesman
                <input
                  className="text-field"
                  type="text"
                  value={isAdmin ? salesmanName : defaultSalesman}
                  readOnly={!isAdmin}
                  onChange={(event) => setSalesmanName(event.target.value)}
                  placeholder="Enter salesman name"
                />
              </label>
            </div>
            <button type="button" className="add-customer" onClick={() => setAddingCustomer(!addingCustomer)}>＋ Add party</button>
            {addingCustomer && (
              <div className="inline-customer">
                <label>Party name<input value={customerForm.name} onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })} /></label>
                <label>Mobile number<input value={customerForm.mobile} onChange={(event) => setCustomerForm({ ...customerForm, mobile: event.target.value })} /></label>
                <label>City<input value={customerForm.city} onChange={(event) => setCustomerForm({ ...customerForm, city: event.target.value })} /></label>
                <label>Salesman<input value={customerForm.salesman} onChange={(event) => setCustomerForm({ ...customerForm, salesman: event.target.value })} /></label>
                <label>GST no.<input value={customerForm.gst} onChange={(event) => setCustomerForm({ ...customerForm, gst: event.target.value })} /></label>
                <label>FSSAI no.<input value={customerForm.fssai} onChange={(event) => setCustomerForm({ ...customerForm, fssai: event.target.value })} /></label>
                <button type="button" className="secondary" onClick={addCustomer} disabled={customerSaving}>{customerSaving ? 'Adding…' : 'Save party'}</button>
              </div>
            )}
            <div className="line-head"><b>Products</b></div>
            <ProductLines lines={lines} products={products} originalOrder={null} flash={flash} onChange={setLines} focusProduct={focusProduct} onFocusProduct={(index) => setFocusProduct({ index, tick: Date.now() })} />
            <button type="button" className="add-line" disabled={!products.length} onClick={() => setLines([...lines, blankLine()])}>＋ Add product</button>
            <div className="order-total"><span>Order value</span><b>{money(total)}</b></div>
            <OrderSummary party={party} lines={lines} products={products} originalOrder={null} />
            <button className="primary" disabled={!canConfirm || saving}>{saving ? 'Confirming…' : 'Confirm Delivery Order'}</button>
            <small>
              {!catalogReady && 'Add products and parties first, then create a Delivery Order.'}
              {catalogReady && !party && 'Select a party before confirming.'}
              {catalogReady && party && !itemsReady && 'Add products and keep each quantity within available stock.'}
              {catalogReady && party && itemsReady && 'Confirming deducts stock immediately. Quantity cannot exceed available stock.'}
            </small>
          </div>
        </form>
      </div>
      <section className="card print-range">
        <div>
          <h2>Print Delivery Orders</h2>
          <p>Print every Delivery Order for today, or choose a date range.</p>
        </div>
        <div className="print-range-controls">
          <label className="picker-label">From<input className="text-field" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} /></label>
          <label className="picker-label">To<input className="text-field" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} /></label>
          <button type="button" className="secondary" onClick={() => openPrintRange(today, today)}>Print today</button>
          <button type="button" className="primary" onClick={() => openPrintRange()}>Print range</button>
        </div>
      </section>
      {editingOrder && (
        <form className="card bill-editor" onSubmit={saveEdit} ref={editorRef}>
          <div className="bill-editor-head">
            <div>
              <h2>View / Edit Delivery Order</h2>
              <small>{editingOrder.number}</small>
            </div>
            <label className="picker-label">
              Party
              <PartyPicker value={billCustomerId} customers={customers} onChange={setBillCustomerId} />
            </label>
          </div>
          {editParty && <div className="selected-party compact"><span>Selected party</span><b>{editParty.name}</b><small>{editParty.mobile || 'No mobile number'}</small></div>}
          <div className="line-head">
            <b>Products</b>
            <button type="button" className="add-line" onClick={() => setBillLines([...billLines, blankLine()])}>＋ Add product</button>
          </div>
          <ProductLines lines={billLines} products={products} originalOrder={editingOrder} flash={flash} onChange={setBillLines} />
          <div className="order-total">
            <span>Order total</span>
            <b>{money(billLines.reduce((sum, line) => sum + (products.find((item) => item.id === line.productId)?.rate || 0) * (Number(line.quantity) || 0), 0))}</b>
          </div>
          <OrderSummary party={editParty} lines={billLines} products={products} originalOrder={editingOrder} />
          <div className="form-actions">
            <button className="primary" disabled={billSaving}>{billSaving ? 'Saving…' : 'Update Delivery Order'}</button>
            <button type="button" className="secondary" onClick={() => { setEditingOrder(null); setBillLines([]); }} disabled={billSaving}>Cancel</button>
          </div>
        </form>
      )}
      <div className="card table-wrap">
        <div className="table-heading">
          <div>
            <h2>Delivery Orders</h2>
            <small>{orders.length ? `${filteredOrders.length} shown` : 'No Delivery Orders yet'}</small>
          </div>
          <div className="table-tools">
            <div className="period-filters">
              <button type="button" className={period === 'today' ? 'is-active' : ''} onClick={() => setPeriod('today')}>Today</button>
              <button type="button" className={period === 'all' ? 'is-active' : ''} onClick={() => setPeriod('all')}>All</button>
            </div>
            <label className="order-search">
              Search
              <input value={listQuery} onChange={(event) => setListQuery(event.target.value)} placeholder="Order no., party, or mobile" />
            </label>
          </div>
        </div>
        {!orders.length && <div className="page-empty">No delivery orders yet. Use New Delivery Order to create the first one.</div>}
        {orders.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>ORDER NO.</th>
                <th>DATE</th>
                <th>PARTY</th>
                <th>ITEMS</th>
                <th>AMOUNT</th>
                <th>STATUS</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const invoice = invoices.find((item) => item.orderId === order.id);
                return (
                <tr key={order.id}>
                  <td><b>{order.number}</b></td>
                  <td>{order.date}</td>
                  <td>
                    <b>{order.customer}</b>
                    {order.customerMobile && order.customerMobile !== '—' && <small className="party-mobile">{order.customerMobile}</small>}
                  </td>
                  <td>{order.items.map((item) => `${item.product} × ${item.quantity}`).join(', ')}</td>
                  <td>{money(order.amount)}</td>
                  <td><mark className="order-status">{invoice ? 'Invoiced' : order.status}</mark></td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={() => openEdit(order)}>View / Edit</button>
                      <button type="button" className="secondary" onClick={() => openPrint([order])}>Print</button>
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => (invoice ? go?.('Invoices') : makeInvoice(order))}
                        disabled={invoicingId === order.id}
                      >
                        {invoicingId === order.id ? 'Creating…' : invoice ? 'View invoice' : 'Make invoice'}
                      </button>
                      <button type="button" className="danger" onClick={() => deleteOrder(order)} disabled={Boolean(invoice) || deletingId === order.id}>
                        {deletingId === order.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })}
              {!filteredOrders.length && <tr><td colSpan="7" className="search-empty">{period === 'today' ? 'No delivery orders for today.' : 'No Delivery Orders match that search.'}</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export default DeliveryOrderWorkspace;
