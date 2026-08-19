import { createPortal } from 'react-dom';
import { isIntraStateSupply, money, placeOfSupply, roundRupee } from './records.js';

const UPI_QR_SRC = '/upi-qr.svg';

function BillPrint({ orders, title = 'DELIVERY ORDER', withTax = false, onClose }) {
  return createPortal(
    <div className="challan-modal">
      <div className="challan-actions">
        <button className="outline" type="button" onClick={onClose}>Close</button>
        <button className="print-button" type="button" onClick={() => window.print()}>Print</button>
      </div>
      {orders.map((order) => {
        const halfRate = withTax ? Number(order.gstPercent || 0) / 2 : 0;
        const fullRate = withTax ? Number(order.gstPercent || 0) : 0;
        const taxable = withTax ? roundRupee(order.taxable) : order.amount;
        const qty = order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        const supply = withTax ? placeOfSupply(order.customerGst) : null;
        const intra = withTax ? isIntraStateSupply(order.customerGst) : true;
        const igst = roundRupee(Number(order.cgst || 0) + Number(order.sgst || 0));
        return (
          <article className="bill-page" key={order.id}>
            <div className="bill-template">
              <header className="template-header">
                <h1>GURUKRIPA TRADING</h1>
                <div>SHOP NO 1, SATYA SAI MAHAL, GANDHI ROAD, ULHASNAGAR - 5 &nbsp; * &nbsp; MOB. 9623079356</div>
              </header>
              <div className="template-gst">
                <span>GST NO. 27AARPV49651Z7</span>
                <span>FSSAI : 21526022003603</span>
              </div>
              <div className="template-banner">{title}</div>
              <section className="template-info">
                <div>
                  <p><b>PARTY NAME :</b> {order.customer}</p>
                  <p><b>ADDRESS :</b> {order.customerAddress}</p>
                  <p><b>GST NO.</b> {order.customerGst || ''}</p>
                  <p><b>FSSAI NO.</b> {order.customerFssai || ''}</p>
                </div>
                <div>
                  <p><b>{withTax ? 'INVOICE NO.' : 'ORDER NO.'}</b> {order.number}</p>
                  {withTax && supply ? <p><b>PLACE OF SUPPLY :</b> {supply.label}</p> : null}
                  <p><b>DATE :</b> {order.date}</p>
                  <p><b>SALESMAN :</b> {order.salesman || '—'}</p>
                </div>
              </section>
              <table className="template-items">
                <colgroup>
                  <col className="col-sr" />
                  <col className="col-desc" />
                  <col className="col-rate" />
                  <col className="col-mrp" />
                  <col className="col-qty" />
                  <col className="col-amount" />
                </colgroup>
                <thead>
                  <tr><th>SR.</th><th>DESCRIPTION</th><th>RATE</th><th>MRP</th><th>QTY</th><th>AMOUNT</th></tr>
                </thead>
                <tbody>
                  {order.items.map((item, index) => (
                    <tr key={index}>
                      <td>{index + 1}</td>
                      <td>{item.product}</td>
                      <td>{money(item.rate)}</td>
                      <td>{money(item.mrp)}</td>
                      <td>{item.quantity}</td>
                      <td>{money(item.amount)}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 8 - order.items.length) }, (_, index) => (
                    <tr key={'blank-' + index}><td>{order.items.length + index + 1}</td><td /><td /><td /><td /><td /></tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="template-total">
                    <td className="template-terms" rowSpan={4} colSpan={2}>
                      <b>SUBJECT TO ULHASNAGAR JURISDICTION</b>
                      <p>*I/We hereby certify that the foods/food mentioned in this invoice are of the stated nature and quality. Particulars given above are true and correct. E. &amp; O.E.</p>
                    </td>
                    <th colSpan={2}>TOTAL</th>
                    <td>{qty}</td>
                    <td>{money(taxable)}</td>
                  </tr>
                  <tr>
                    <th colSpan={2}>{withTax ? (intra ? `CGST ${halfRate}%` : `IGST ${fullRate}%`) : 'CGST'}</th>
                    <td />
                    <td>{withTax ? money(intra ? roundRupee(order.cgst) : igst) : ''}</td>
                  </tr>
                  <tr>
                    <th colSpan={2}>{withTax ? (intra ? `SGST ${halfRate}%` : '') : 'SGST'}</th>
                    <td />
                    <td>{withTax && intra ? money(roundRupee(order.sgst)) : ''}</td>
                  </tr>
                  <tr>
                    <th colSpan={2}>TOTAL AMOUNT</th>
                    <td />
                    <td>{withTax ? money(roundRupee(order.amount)) : ''}</td>
                  </tr>
                </tfoot>
              </table>
              <section className="template-payment">
                <div className="template-bank">
                  <b>Bank Details</b>
                  <span>Name of Bank: Union Bank of India</span>
                  <span>Account Name: GURUKRIPA TRADING</span>
                  <span>Account Number: 681901010050590</span>
                  <span>IFSC Code: UBIN0568198</span>
                  <span>Branch: NETAJI CHOWK - ULHASNAGAR</span>
                  <span>UPI ID: 9623079356@okbizaxis</span>
                </div>
                <div className="template-qr">
                  <img src={UPI_QR_SRC} alt="UPI QR for 9623079356@okbizaxis" />
                  <span>Scan to pay</span>
                </div>
                <div className="template-signature">
                  For Guru Kripa Trading
                  <b>Authorised Signatory</b>
                </div>
              </section>
              <div className="template-blue-block" />
            </div>
          </article>
        );
      })}
    </div>,
    document.body,
  );
}

export default BillPrint;
