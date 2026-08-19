import { useMemo, useState } from 'react';
import { database } from './supabase.js';
import FormField from './FormField.jsx';

const emptyForm = () => ({
  name: '',
  contact: '',
  mobile: '',
  city: '',
  gst: '',
  fssai: '',
  salesman: '',
});

function Customers({ customers, refresh, flash }) {
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const withGst = customers.filter((customer) => customer.gst).length;
  const withSalesman = customers.filter((customer) => customer.salesman).length;

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return customers.filter((customer) => {
      if (filter === 'gst' && customer.gst) return false;
      if (filter === 'salesman' && customer.salesman) return false;
      if (!needle) return true;
      return `${customer.name} ${customer.contact || ''} ${customer.mobile || ''} ${customer.city || ''} ${customer.gst || ''} ${customer.fssai || ''} ${customer.salesman || ''}`
        .toLowerCase()
        .includes(needle);
    });
  }, [customers, query, filter]);

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

  const openEdit = (customer) => {
    setEditing(customer);
    setForm({
      name: customer.name,
      contact: customer.contact || '',
      mobile: customer.mobile || '',
      city: customer.city || '',
      gst: customer.gst || '',
      fssai: customer.fssai || '',
      salesman: customer.salesman || '',
    });
    setFormOpen(true);
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.name) return flash('Party name is required.', 'error');
    const payload = {
      name: form.name,
      contact_person: form.contact || null,
      mobile: form.mobile || null,
      city: form.city || null,
      gst_number: form.gst || null,
      fssai_number: form.fssai || null,
      salesman_name: form.salesman || null,
      updated_at: new Date().toISOString(),
    };
    const isEditing = Boolean(editing);
    setSaving(true);
    try {
      if (editing) await database.updateCustomer(editing.id, payload);
      else await database.addCustomer(payload);
      await refresh(true);
      closeForm();
      flash(isEditing ? 'Party updated.' : 'Party saved.');
    } catch (error) {
      flash(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (customer) => {
    if (!window.confirm(`Delete ${customer.name}? This cannot be undone.`)) return;
    setSaving(true);
    try {
      await database.deleteCustomer(customer.id);
      await refresh(true);
      if (editing?.id === customer.id) closeForm();
      flash('Customer deleted.');
    } catch (error) {
      flash(error.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="customers-page">
      <div className="delivery-orders-toolbar">
        <div>
          <p className="eyebrow">PARTIES</p>
          <span>Save party, GST, FSSAI, and salesman for delivery orders.</span>
        </div>
        {formOpen ? (
          <button className="secondary" type="button" onClick={closeForm} disabled={saving}>Close form</button>
        ) : (
          <button className="primary" type="button" onClick={openAdd}>Add party</button>
        )}
      </div>

      <section className="dashboard-metrics">
        <article className="dashboard-metric">
          <span className="dashboard-metric-label">Parties</span>
          <strong>{customers.length}</strong>
          <small>In the directory</small>
        </article>
        <article className="dashboard-metric">
          <span className="dashboard-metric-label">With GST</span>
          <strong>{withGst}</strong>
          <small>GST number saved</small>
        </article>
        <article className="dashboard-metric">
          <span className="dashboard-metric-label">With salesman</span>
          <strong>{withSalesman}</strong>
          <small>Assigned on the party</small>
        </article>
      </section>

      {formOpen && (
        <form className="card adjust" onSubmit={save}>
          <h2>{editing ? 'Edit party' : 'Add party'}</h2>
          <p>{editing ? `Update ${editing.name}.` : 'Name is required. GST, FSSAI, and salesman print on the Delivery Order.'}</p>
          <div className="party-form">
            <FormField label="Party name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
            <FormField label="Contact person" value={form.contact} onChange={(value) => setForm({ ...form, contact: value })} />
            <FormField label="Mobile number" value={form.mobile} onChange={(value) => setForm({ ...form, mobile: value })} />
            <FormField label="City" value={form.city} onChange={(value) => setForm({ ...form, city: value })} />
            <FormField label="Salesman" value={form.salesman} onChange={(value) => setForm({ ...form, salesman: value })} />
            <FormField label="GST no." value={form.gst} onChange={(value) => setForm({ ...form, gst: value })} />
            <FormField label="FSSAI no." value={form.fssai} onChange={(value) => setForm({ ...form, fssai: value })} />
          </div>
          <div className="form-actions">
            <button className="primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Update party' : 'Save party'}</button>
            <button type="button" className="secondary" onClick={closeForm} disabled={saving}>Cancel</button>
          </div>
        </form>
      )}

      <div className="card table-wrap">
        <div className="table-heading">
          <div>
            <h2>Party register</h2>
            <small>{customers.length ? `${visible.length} shown` : 'No parties yet'}</small>
          </div>
          <div className="table-tools">
            <div className="period-filters">
              <button type="button" className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>All</button>
              <button type="button" className={filter === 'gst' ? 'is-active' : ''} onClick={() => setFilter('gst')}>Missing GST</button>
              <button type="button" className={filter === 'salesman' ? 'is-active' : ''} onClick={() => setFilter('salesman')}>Missing salesman</button>
            </div>
            <label className="order-search">
              Search
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Party, mobile, GST, or salesman" />
            </label>
          </div>
        </div>
        {!customers.length && <div className="page-empty">No parties yet. Use Add party to create the first one.</div>}
        {customers.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>PARTY NAME</th>
                <th>CONTACT</th>
                <th>MOBILE</th>
                <th>CITY</th>
                <th>SALESMAN</th>
                <th>GST</th>
                <th>FSSAI</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((customer) => (
                <tr
                  key={customer.id}
                  className={`inventory-row${editing?.id === customer.id ? ' is-selected' : ''}`}
                  onClick={() => openEdit(customer)}
                >
                  <td><b>{customer.name}</b></td>
                  <td>{customer.contact || '—'}</td>
                  <td>{customer.mobile || '—'}</td>
                  <td>{customer.city || '—'}</td>
                  <td>{customer.salesman || '—'}</td>
                  <td>{customer.gst || '—'}</td>
                  <td>{customer.fssai || '—'}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" onClick={(event) => { event.stopPropagation(); openEdit(customer); }} disabled={saving}>Edit</button>
                      <button type="button" className="danger" onClick={(event) => { event.stopPropagation(); remove(customer); }} disabled={saving}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length && (
                <tr>
                  <td colSpan="8" className="search-empty">
                    {filter === 'gst' ? 'Every party has a GST number.' : filter === 'salesman' ? 'Every party has a salesman.' : 'No parties match that search.'}
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

export default Customers;
