const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

function DashboardMetric({ label, value, detail, tone = 'default' }) {
  return <article className={`dashboard-metric ${tone}`}><span className="dashboard-metric-label">{label}</span><strong>{value}</strong><small>{detail}</small></article>;
}

function Dashboard({ products, orders, lowStock, go, role = 'admin' }) {
  const staffView = role === 'staff';
  const totalOrderAmount = orders.reduce((sum, order) => sum + Number(order.amount || 0), 0);
  const recentOrders = orders.slice(0, 4);

  return <div className="dashboard-page"><section className="dashboard-hero"><div><p className="eyebrow">TODAY AT GURUKRIPA</p><h1>{staffView ? 'Delivery desk' : 'Business overview'}</h1><p>Keep orders, inventory, and customer service moving from one focused workspace.</p></div><button className="primary" onClick={() => go('Delivery Orders')}>＋ New delivery order</button></section><section className="dashboard-metrics">{staffView ? <><DashboardMetric label="Orders recorded" value={String(orders.length).padStart(2, '0')} detail="Delivery orders in the system"/><DashboardMetric label="Order value" value={money(totalOrderAmount)} detail="Across all recorded orders" tone="accent"/></> : <><DashboardMetric label="Delivery orders" value={String(orders.length).padStart(2, '0')} detail="Orders ready to review"/><DashboardMetric label="Catalog products" value={String(products.length).padStart(2, '0')} detail="Active items in inventory" tone="accent"/><DashboardMetric label="Low stock items" value={String(lowStock).padStart(2, '0')} detail={lowStock ? 'Needs replenishment' : 'Inventory looks healthy'} tone={lowStock ? 'warning' : 'success'}/></>}</section><section className="dashboard-workspace"><article className="dashboard-actions"><div><p className="eyebrow">QUICK ACTIONS</p><h2>Keep the day on track</h2><p>Create an order first, then keep stock and customer records current.</p></div><div className="dashboard-action-list"><button onClick={() => go('Delivery Orders')}>Create delivery order <span>→</span></button>{!staffView && <><button onClick={() => go('Products')}>Manage products <span>→</span></button><button onClick={() => go('Customers')}>Review customers <span>→</span></button></>}</div></article><article className="dashboard-recent"><div className="dashboard-section-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Latest delivery orders</h2></div><button type="button" onClick={() => go('Delivery Orders')}>View all</button></div>{recentOrders.length ? <div className="dashboard-order-list">{recentOrders.map((order) => <div key={order.id}><span><b>{order.number}</b><small>{order.customer}</small></span><strong>{money(order.amount)}</strong></div>)}</div> : <div className="dashboard-empty"><b>No delivery orders yet</b><span>Create the first delivery order to see activity here.</span></div>}</article></section></div>;
}

export default Dashboard;
