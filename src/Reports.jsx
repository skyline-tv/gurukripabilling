import { useState } from 'react';
import { createPortal } from 'react-dom';
import { money } from './records.js';

const quantity = (value) => Number(value).toLocaleString('en-IN', { maximumFractionDigits: 3 });

function ReportPreview({ children, onClose }) {
  return createPortal(
    <div className="challan-modal report-print-modal">
      <div className="challan-actions">
        <button className="outline" type="button" onClick={onClose}>Close</button>
        <button className="print-button" type="button" onClick={() => window.print()}>Print</button>
      </div>
      {children}
    </div>,
    document.body,
  );
}

function DateRange({ fromDate, toDate, onFrom, onTo }) {
  return (
    <>
      <label className="picker-label">
        From
        <input className="text-field" type="date" value={fromDate} onChange={(event) => onFrom(event.target.value)} />
      </label>
      <label className="picker-label">
        To
        <input className="text-field" type="date" value={toDate} onChange={(event) => onTo(event.target.value)} />
      </label>
    </>
  );
}

function Reports({ orders, products = [], flash }) {
  const today = new Date().toISOString().slice(0, 10);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [reportOrders, setReportOrders] = useState([]);
  const [summaryFromDate, setSummaryFromDate] = useState(today);
  const [summaryToDate, setSummaryToDate] = useState(today);
  const [summaryItems, setSummaryItems] = useState([]);
  const [printTarget, setPrintTarget] = useState('');
  const [stockRows, setStockRows] = useState([]);

  const todaysOrders = orders.filter((order) => order.orderDate === today);
  const dateLabel = (from, to) => (
    from === to
      ? new Date(`${from}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
      : `${new Date(`${from}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} – ${new Date(`${to}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`
  );

  const generate = () => {
    if (!fromDate || !toDate || fromDate > toDate) return flash('Choose a valid date or date range.', 'error');
    setReportOrders(orders.filter((order) => order.orderDate >= fromDate && order.orderDate <= toDate).sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })));
  };

  const generateSummary = () => {
    if (!summaryFromDate || !summaryToDate || summaryFromDate > summaryToDate) return flash('Choose a valid date or date range.', 'error');
    const totals = new Map();
    orders.filter((order) => order.orderDate >= summaryFromDate && order.orderDate <= summaryToDate).forEach((order) => {
      order.items.forEach((item) => {
        const name = (item.product || 'Unnamed item').trim();
        const key = name.toLocaleLowerCase();
        const current = totals.get(key) || { name, quantity: 0 };
        current.quantity += Number(item.quantity) || 0;
        totals.set(key, current);
      });
    });
    setSummaryItems([...totals.values()].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const generateStock = () => {
    if (!products.length) return flash('No products in the catalog.', 'error');
    setStockRows([...products].sort((a, b) => a.name.localeCompare(b.name)));
  };

  const totalAmount = reportOrders.reduce((sum, order) => sum + order.amount, 0);
  const totalQuantity = summaryItems.reduce((sum, item) => sum + item.quantity, 0);
  const stockUnits = stockRows.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const todayLabel = new Date(`${today}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  const paymentReport = () => (
    <section className="payment-report" aria-label="Order Payment Report">
      <div className="payment-report-heading">
        <b>GURUKRIPA TRADING</b>
        <h2>ORDER PAYMENT REPORT</h2>
        <p>{dateLabel(fromDate, toDate)}</p>
      </div>
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>ORDER NUMBER</th>
              <th>CUSTOMER NAME</th>
              <th className="number">AMOUNT</th>
              <th className="number">CASH</th>
              <th className="number">G-PAY</th>
            </tr>
          </thead>
          <tbody>
            {reportOrders.map((order) => (
              <tr key={order.id}>
                <td><b>{order.number}</b></td>
                <td>{order.customer}</td>
                <td className="number">{money(order.amount)}</td>
                <td className="number" />
                <td className="number" />
              </tr>
            ))}
            {!reportOrders.length && (
              <tr><td colSpan="5" className="report-empty">Generate a report to view orders for the selected period.</td></tr>
            )}
          </tbody>
          {reportOrders.length > 0 && (
            <tfoot>
              <tr>
                <th colSpan="2">TOTAL</th>
                <th className="number">{money(totalAmount)}</th>
                <th className="number" />
                <th className="number" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );

  const deliverySummaryReport = () => (
    <section className="delivery-summary-report" aria-label="Delivery Summary">
      <div className="delivery-summary-heading">
        <b>GURUKRIPA TRADING</b>
        <h2>DELIVERY SUMMARY</h2>
        <p>{dateLabel(summaryFromDate, summaryToDate)}</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ITEM NAME</th>
              <th className="number">TOTAL QUANTITY</th>
            </tr>
          </thead>
          <tbody>
            {summaryItems.map((item) => (
              <tr key={item.name.toLocaleLowerCase()}>
                <td><b>{item.name}</b></td>
                <td className="number">{quantity(item.quantity)}</td>
              </tr>
            ))}
            {!summaryItems.length && (
              <tr><td colSpan="2" className="report-empty">Generate a report to view item quantities for the selected period.</td></tr>
            )}
          </tbody>
          {summaryItems.length > 0 && (
            <tfoot>
              <tr>
                <th>TOTAL QUANTITY</th>
                <th className="number">{quantity(totalQuantity)}</th>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );

  const stockReport = () => (
    <section className="delivery-summary-report" aria-label="Current Stock Report">
      <div className="delivery-summary-heading">
        <b>GURUKRIPA TRADING</b>
        <h2>CURRENT STOCK REPORT</h2>
        <p>{todayLabel}</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>PRODUCT</th>
              <th>SKU</th>
              <th>CATEGORY</th>
              <th className="number">ON HAND</th>
            </tr>
          </thead>
          <tbody>
            {stockRows.map((product) => (
              <tr key={product.id}>
                <td><b>{product.name}</b></td>
                <td>{product.sku || '—'}</td>
                <td>{product.category || '—'}</td>
                <td className="number">{quantity(product.stock)}</td>
              </tr>
            ))}
            {!stockRows.length && (
              <tr><td colSpan="4" className="report-empty">Generate a report to view current stock.</td></tr>
            )}
          </tbody>
          {stockRows.length > 0 && (
            <tfoot>
              <tr>
                <th colSpan="3">TOTAL UNITS</th>
                <th className="number">{quantity(stockUnits)}</th>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );

  return (
    <div className="reports-page">
      <div className="delivery-orders-toolbar">
        <div>
          <p className="eyebrow">REPORTS</p>
          <span>Pick a date range, generate, then print. Cash and G-Pay stay blank for filling on paper.</span>
        </div>
      </div>

      <section className="dashboard-metrics">
        <article className="dashboard-metric">
          <span className="dashboard-metric-label">All orders</span>
          <strong>{orders.length}</strong>
          <small>On the register</small>
        </article>
        <article className="dashboard-metric">
          <span className="dashboard-metric-label">Today</span>
          <strong>{todaysOrders.length}</strong>
          <small>{money(todaysOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0))}</small>
        </article>
        <article className="dashboard-metric">
          <span className="dashboard-metric-label">Current stock</span>
          <strong>{stockRows.length}</strong>
          <small>{stockRows.length ? `${quantity(stockUnits)} units` : 'Not generated yet'}</small>
        </article>
      </section>

      <section className="card adjust">
        <h2>Order payment report</h2>
        <p>Orders in the selected period, with blank cash and G-Pay columns.</p>
        <div className="inventory-form">
          <DateRange fromDate={fromDate} toDate={toDate} onFrom={setFromDate} onTo={setToDate} />
          <button type="button" className="primary" onClick={generate}>Generate</button>
          <button type="button" className="secondary" onClick={() => setPrintTarget('payment')} disabled={!reportOrders.length}>Print</button>
        </div>
      </section>

      <section className="card adjust delivery-summary-section">
        <h2>Delivery summary</h2>
        <p>Item quantities needed for delivery in the selected period.</p>
        <div className="inventory-form">
          <DateRange fromDate={summaryFromDate} toDate={summaryToDate} onFrom={setSummaryFromDate} onTo={setSummaryToDate} />
          <button type="button" className="primary" onClick={generateSummary}>Generate</button>
          <button type="button" className="secondary" onClick={() => setPrintTarget('summary')} disabled={!summaryItems.length}>Print</button>
        </div>
      </section>

      <section className="card adjust">
        <h2>Current stock report</h2>
        <p>On-hand quantity from the catalog at the time you generate the report.</p>
        <div className="inventory-form">
          <button type="button" className="primary" onClick={generateStock}>Generate</button>
          <button type="button" className="secondary" onClick={() => setPrintTarget('stock')} disabled={!stockRows.length}>Print</button>
        </div>
      </section>

      {printTarget && (
        <ReportPreview onClose={() => setPrintTarget('')}>
          {printTarget === 'payment' ? paymentReport() : printTarget === 'summary' ? deliverySummaryReport() : stockReport()}
        </ReportPreview>
      )}
    </div>
  );
}

export default Reports;
