import { Children, cloneElement, useEffect, useState } from 'react';

function DeliveryOrders({ children, startNew = 0 }) {
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (startNew) setFormOpen(true);
  }, [startNew]);

  return (
    <div className={`delivery-orders-screen${formOpen ? ' order-page-open' : ''}`}>
      <div className="delivery-orders-toolbar">
        <div>
          <p className="eyebrow">{formOpen ? 'NEW ORDER' : 'DELIVERY ORDERS'}</p>
          <span>
            {formOpen
              ? 'Select party, add products, enter quantity, then confirm.'
              : 'Search the register or create a new order.'}
          </span>
        </div>
        {formOpen ? (
          <button className="secondary" type="button" onClick={() => setFormOpen(false)}>Back to register</button>
        ) : (
          <button className="primary" type="button" onClick={() => setFormOpen(true)}>New Delivery Order</button>
        )}
      </div>
      {cloneElement(Children.only(children), { onFormClose: () => setFormOpen(false), formOpen })}
    </div>
  );
}

export default DeliveryOrders;
