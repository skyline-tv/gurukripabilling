import { money } from './records.js';

function DashboardMetric({ label, value, detail, tone = 'default', onClick }) {
  return (
    <button type="button" className={`dashboard-metric ${tone}`} onClick={onClick}>
      <span className="dashboard-metric-label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </button>
  );
}

function Dashboard({ products, orders, lowStock, go, role = 'admin' }) {
  const staffView = role === 'staff';
  const today = new Date().toISOString().slice(0, 10);
  const todaysOrders = orders.filter((order) => order.orderDate === today);
  const todayAmount = todaysOrders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const recentOrders = orders.slice(0, 8);
  const lowStockItems = products.filter((product) => product.stock <= product.minimum).slice(0, 6);

  return (
    <div className="dashboard-page">
      <section className="dashboard-hero">
        <div>
          <p className="eyebrow">TODAY</p>
          <h1>{staffView ? 'Delivery desk' : 'Dashboard'}</h1>
          <p>Create a delivery order, confirm stock, then print.</p>
        </div>
        <button className="primary" onClick={() => go('Delivery Orders', { newOrder: true })}>New Delivery Order</button>
      </section>
      <section className="dashboard-metrics">
        <DashboardMetric label="Today's orders" value={String(todaysOrders.length)} detail={money(todayAmount)} onClick={() => go('Delivery Orders')} />
        <DashboardMetric label="All orders" value={String(orders.length)} detail="Full register" tone="accent" onClick={() => go('Delivery Orders')} />
        {!staffView && (
          <DashboardMetric
            label="Low stock"
            value={String(lowStock)}
            detail={lowStock ? 'Needs attention' : 'No alerts'}
            tone={lowStock ? 'warning' : 'success'}
            onClick={() => go('Inventory')}
          />
        )}
      </section>
      <section className="dashboard-workspace">
        <article className="dashboard-recent">
          <div className="dashboard-section-heading">
            <div>
              <p className="eyebrow">RECENT</p>
              <h2>Latest delivery orders</h2>
            </div>
            <button type="button" onClick={() => go('Delivery Orders')}>View all</button>
          </div>
          {recentOrders.length ? (
            <div className="dashboard-order-list">
              {recentOrders.map((order) => (
                <div key={order.id} role="button" tabIndex={0} onClick={() => go('Delivery Orders')} onKeyDown={(event) => event.key === 'Enter' && go('Delivery Orders')}>
                  <span>
                    <b>{order.number}</b>
                    <small>{order.customer} · {order.date}</small>
                  </span>
                  <strong>{money(order.amount)}</strong>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <b>No delivery orders yet</b>
              <span>Start with New Delivery Order.</span>
            </div>
          )}
        </article>
        {!staffView && (
          <article className="dashboard-stock">
            <div className="dashboard-section-heading">
              <div>
                <p className="eyebrow">STOCK</p>
                <h2>Low-stock products</h2>
              </div>
              <button type="button" onClick={() => go('Inventory')}>Inventory</button>
            </div>
            {lowStockItems.length ? (
              <div className="dashboard-stock-list">
                {lowStockItems.map((product) => (
                  <button type="button" key={product.id} onClick={() => go('Inventory')}>
                    <span>
                      <b>{product.name}</b>
                      <small>Min {product.minimum}</small>
                    </span>
                    <strong>{product.stock}</strong>
                  </button>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <b>Stock looks healthy</b>
                <span>No products are at or below minimum.</span>
              </div>
            )}
          </article>
        )}
        {staffView && (
          <article className="dashboard-actions">
            <div>
              <p className="eyebrow">SHORTCUTS</p>
              <h2>Quick actions</h2>
            </div>
            <div className="dashboard-action-list">
              <button onClick={() => go('Delivery Orders', { newOrder: true })}>New Delivery Order <span>→</span></button>
              <button onClick={() => go('Delivery Orders')}>Open register <span>→</span></button>
            </div>
          </article>
        )}
      </section>
    </div>
  );
}

export default Dashboard;
