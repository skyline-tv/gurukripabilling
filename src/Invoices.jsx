import { useMemo, useState } from 'react';
import { database } from './supabase.js';
import { money, placeOfSupply, roundRupee } from './records.js';
import BillPrint from './BillPrint.jsx';

function Invoices({ invoices, refresh, flash }) {
  const today = new Date().toISOString().slice(0, 10);
  const [listQuery, setListQuery] = useState('');
  const [period, setPeriod] = useState('today');
  const [printInvoices, setPrintInvoices] = useState([]);
  const [deletingId, setDeletingId] = useState('');

  const filtered = useMemo(() => {
    const needle = listQuery.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (period === 'today' && invoice.orderDate !== today) return false;
      if (!needle) return true;
      return `${invoice.number} ${invoice.orderNumber} ${invoice.customer} ${invoice.customerMobile || ''}`.toLowerCase().includes(needle);
    });
  }, [invoices, listQuery, period, today]);

  const deleteInvoice = async (invoice) => {
    if (!window.confirm(`Delete ${invoice.number}? The delivery order will stay in the register.`)) return;
    setDeletingId(invoice.id);
    try {
      await database.deleteInvoice(invoice.id);
      await refresh(true);
      flash(`${invoice.number} deleted.`);
    } catch (error) {
      flash(error.message, 'error');
    } finally {
      setDeletingId('');
    }
  };

  return (
    <div className="delivery-orders-screen">
      {printInvoices.length > 0 && (
        <BillPrint orders={printInvoices} title="INVOICE" withTax onClose={() => setPrintInvoices([])} />
      )}
      <div className="delivery-orders-toolbar">
        <div>
          <p className="eyebrow">INVOICES</p>
          <span>GST invoices created from delivery orders. Place of supply is taken from the party GSTIN.</span>
        </div>
      </div>
      <div className="card table-wrap">
        <div className="table-toolbar">
          <div>
            <h2>Invoice register</h2>
            <p>Use Make invoice on a delivery order to create one.</p>
          </div>
          <div className="table-toolbar-actions">
            <div className="period-filters">
              <button type="button" className={period === 'today' ? 'is-active' : ''} onClick={() => setPeriod('today')}>Today</button>
              <button type="button" className={period === 'all' ? 'is-active' : ''} onClick={() => setPeriod('all')}>All</button>
            </div>
            <label className="order-search">
              Search
              <input value={listQuery} onChange={(event) => setListQuery(event.target.value)} placeholder="Invoice no., order no., party" />
            </label>
          </div>
        </div>
        {!invoices.length && <div className="page-empty">No invoices yet. Open Delivery Orders and click Make invoice.</div>}
        {invoices.length > 0 && (
          <table>
            <thead>
              <tr>
                <th>INVOICE NO.</th>
                <th>DATE</th>
                <th>PARTY</th>
                <th>ORDER NO.</th>
                <th>PLACE OF SUPPLY</th>
                <th>TAXABLE</th>
                <th>GST</th>
                <th>TOTAL</th>
                <th>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((invoice) => (
                <tr key={invoice.id}>
                  <td><b>{invoice.number}</b></td>
                  <td>{invoice.date}</td>
                  <td>
                    <b>{invoice.customer}</b>
                    {invoice.customerMobile && invoice.customerMobile !== '—' && <small className="party-mobile">{invoice.customerMobile}</small>}
                  </td>
                  <td>{invoice.orderNumber || '—'}</td>
                  <td>{placeOfSupply(invoice.customerGst).label}</td>
                  <td>{money(roundRupee(invoice.taxable))}</td>
                  <td>{money(roundRupee(invoice.cgst + invoice.sgst))}</td>
                  <td>{money(roundRupee(invoice.amount))}</td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="secondary" onClick={() => setPrintInvoices([invoice])}>Print</button>
                      <button type="button" className="danger" onClick={() => deleteInvoice(invoice)} disabled={deletingId === invoice.id}>
                        {deletingId === invoice.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && <tr><td colSpan="9" className="search-empty">{period === 'today' ? 'No invoices for today.' : 'No invoices match that search.'}</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Invoices;
