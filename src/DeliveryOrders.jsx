import { useState } from 'react';

function DeliveryOrders({ children }) {
  const [billingOpen, setBillingOpen] = useState(false);
  return <div className={`delivery-orders-screen${billingOpen ? ' billing-open' : ''}`}><div className="delivery-orders-toolbar"><div><p className="eyebrow">ORDER MANAGEMENT</p><span>Create, review, and print delivery orders from one place.</span></div><button className="primary" type="button" onClick={() => setBillingOpen(true)}>＋ New delivery order</button></div>{billingOpen && <button className="billing-backdrop" type="button" aria-label="Close new delivery order" onClick={() => setBillingOpen(false)}/>} {billingOpen && <button className="billing-close" type="button" onClick={() => setBillingOpen(false)}>Close billing</button>}{children}</div>;
}

export default DeliveryOrders;
