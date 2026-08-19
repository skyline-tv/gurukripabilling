export const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export const DEFAULT_GST_PERCENT = 5;
export const COMPANY_GSTIN = '27AARPV49651Z7';
export const COMPANY_STATE_CODE = '27';

const GST_STATES = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '26': 'Dadra and Nagar Haveli and Daman and Diu',
  '27': 'Maharashtra',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '38': 'Ladakh',
  '97': 'Other Territory',
};

export const gstStateFromNumber = (gstin) => {
  const value = String(gstin || '').toUpperCase().replace(/\s/g, '');
  if (value.length < 2) return null;
  const code = value.slice(0, 2);
  const name = GST_STATES[code];
  if (!name) return null;
  return { code, name, label: `${code}-${name}` };
};

export const placeOfSupply = (customerGst) => (
  gstStateFromNumber(customerGst) || gstStateFromNumber(COMPANY_GSTIN)
);

export const isIntraStateSupply = (customerGst) => placeOfSupply(customerGst).code === COMPANY_STATE_CODE;

const roundMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
export const roundRupee = (value) => Math.round(Number(value) || 0);

export const gstForAmount = (amount, gstPercent) => {
  const rate = Number(gstPercent) > 0 ? Number(gstPercent) : DEFAULT_GST_PERCENT;
  const taxable = roundRupee(amount);
  const gst = roundRupee(taxable * rate / 100);
  const cgst = roundRupee(gst / 2);
  const sgst = gst - cgst;
  return { gstPercent: rate, taxable, cgst, sgst, total: taxable + gst };
};

export const invoiceFromOrder = (order, products, invoiceCount) => {
  const items = order.items.map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    const tax = gstForAmount(item.amount, product?.gstPercent);
    return {
      product_id: item.productId,
      description: item.product,
      rate: item.rate,
      mrp: item.mrp,
      quantity: item.quantity,
      amount: tax.taxable,
      gst_percent: tax.gstPercent,
      cgst_amount: tax.cgst,
      sgst_amount: tax.sgst,
    };
  });
  const taxable = roundRupee(items.reduce((sum, item) => sum + item.amount, 0));
  const gstPercent = items[0]?.gst_percent || DEFAULT_GST_PERCENT;
  const tax = gstForAmount(taxable, gstPercent);
  return {
    invoice: {
      invoice_number: `INV-${String(invoiceCount + 1).padStart(5, '0')}`,
      delivery_order_id: order.id,
      customer_id: order.customerId,
      invoice_date: order.orderDate,
      salesman_name: order.salesman || null,
      taxable_amount: tax.taxable,
      gst_percent: gstPercent,
      cgst_amount: tax.cgst,
      sgst_amount: tax.sgst,
      total_amount: tax.total,
      status: 'issued',
    },
    items,
  };
};

export const toProduct = (row) => ({
  id: row.id,
  name: row.name,
  sku: row.sku,
  category: row.category,
  rate: Number(row.selling_rate),
  mrp: Number(row.mrp),
  gstPercent: Number(row.gst_percent || 0),
  stock: Number(row.current_stock),
  minimum: Number(row.minimum_stock),
});

export const toCustomer = (row) => ({
  id: row.id,
  name: row.name,
  contact: row.contact_person,
  mobile: row.mobile,
  city: row.city,
  address: row.address,
  gst: row.gst_number || '',
  fssai: row.fssai_number || '',
  salesman: row.salesman_name || '',
});

export const toOrder = (row) => ({
  id: row.id,
  number: row.order_number,
  customerId: row.customer_id,
  orderDate: row.order_date,
  customer: row.customers?.name || '—',
  customerAddress: row.customers?.address || [row.customers?.city, 'Maharashtra'].filter(Boolean).join(', '),
  customerMobile: row.customers?.mobile || '—',
  customerGst: row.customers?.gst_number || '',
  customerFssai: row.customers?.fssai_number || '',
  date: new Date(`${row.order_date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  amount: Number(row.total_amount),
  salesman: row.salesman_name || row.customers?.salesman_name || '',
  status: row.status,
  items: (row.delivery_order_items || []).map((item) => ({
    productId: item.product_id,
    product: item.description,
    rate: Number(item.rate),
    mrp: Number(item.mrp),
    quantity: Number(item.quantity),
    amount: Number(item.amount),
  })),
});

export const toInvoice = (row) => ({
  id: row.id,
  number: row.invoice_number,
  orderId: row.delivery_order_id,
  orderNumber: row.delivery_orders?.order_number || '',
  customerId: row.customer_id,
  orderDate: row.invoice_date,
  customer: row.customers?.name || '—',
  customerAddress: row.customers?.address || [row.customers?.city, 'Maharashtra'].filter(Boolean).join(', '),
  customerMobile: row.customers?.mobile || '—',
  customerGst: row.customers?.gst_number || '',
  customerFssai: row.customers?.fssai_number || '',
  date: new Date(`${row.invoice_date}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
  taxable: Number(row.taxable_amount),
  gstPercent: Number(row.gst_percent || DEFAULT_GST_PERCENT),
  cgst: Number(row.cgst_amount),
  sgst: Number(row.sgst_amount),
  amount: Number(row.total_amount),
  salesman: row.salesman_name || row.customers?.salesman_name || '',
  status: row.status,
  items: (row.invoice_items || []).map((item) => ({
    productId: item.product_id,
    product: item.description,
    rate: Number(item.rate),
    mrp: Number(item.mrp),
    quantity: Number(item.quantity),
    amount: Number(item.amount),
  })),
});

export const getUserRole = (user) => {
  const role = user?.user_metadata?.role || user?.user_metadata?.user_role || user?.app_metadata?.role || user?.app_metadata?.user_role;
  return role === 'admin' ? 'admin' : 'staff';
};
