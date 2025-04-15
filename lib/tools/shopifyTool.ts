type ShopifyOrder = {
  total_price: string;
  line_items: Array<{
    product_id: string;
    title: string;
    quantity: number;
  }>;
  customer?: {
    id: string;
    first_name: string;
    last_name: string;
  };
};

interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}

interface ShopifyCountResponse {
  count: number;
}

interface ShopifyProductsResponse {
  products: Array<{
    id: string;
    title: string;
    description: string;
    vendor: string;
    product_type: string;
    price: string;
    status: string;
  }>;
}

enum ShopifyAction {
  CustomerCount = "customerCount",
  OrderCount = "orderCount",
  SalesLastNDays = "salesLastNDays",
  AvgOrderValue = "avgOrderValue",
  TopSellingProducts = "topSellingProducts",
  TopBuyingCustomers = "topBuyingCustomers",
  AllProducts = "allProducts",
}

const fetchFromShopify = async (url: string, headers: HeadersInit): Promise<unknown> => {
  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
};

export const shopifyTool = async ({
  action,
  days = 30,
}: {
  action: ShopifyAction;
  days?: number;
}): Promise<string> => {
  const baseUrl = process.env.SHOPIFY_STORE!;
  const headers = {
    "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN!,
    "Content-Type": "application/json",
  };

  const today = new Date();
  const pastDate = new Date();
  pastDate.setDate(today.getDate() - days);
  const from = pastDate.toISOString();
  const to = today.toISOString();

  const orderFetchUrl = `${baseUrl}/admin/api/2023-07/orders.json?created_at_min=${from}&created_at_max=${to}&status=any&limit=250`;

  switch (action) {
    case ShopifyAction.CustomerCount: {
      const url = `${baseUrl}/admin/api/2023-07/customers/count.json`;
      const data = await fetchFromShopify(url, headers) as ShopifyCountResponse;
      return `Customer count: ${data.count}`;
    }

    case ShopifyAction.OrderCount: {
      const url = `${baseUrl}/admin/api/2023-07/orders/count.json?created_at_min=${from}&created_at_max=${to}&status=any`;
      const data = await fetchFromShopify(url, headers) as ShopifyCountResponse;
      return `Order count in last ${days} days: ${data.count}`;
    }

    case ShopifyAction.SalesLastNDays: {
      const data = await fetchFromShopify(orderFetchUrl, headers) as ShopifyOrdersResponse;
      const totalSales = data.orders.reduce((sum, order) => {
        return sum + parseFloat(order.total_price || "0");
      }, 0);
      return `Sales in the last ${days} days: ₹${totalSales.toFixed(2)}`;
    }

    case ShopifyAction.AvgOrderValue: {
      const data = await fetchFromShopify(orderFetchUrl, headers) as ShopifyOrdersResponse;
      const totalSales = data.orders.reduce((sum, order) => {
        return sum + parseFloat(order.total_price || "0");
      }, 0);
      const average = totalSales / data.orders.length || 0;
      return `Average order value (last ${days} days): ₹${average.toFixed(2)}`;
    }

    case ShopifyAction.TopSellingProducts: {
      const data = await fetchFromShopify(orderFetchUrl, headers) as ShopifyOrdersResponse;

      const productMap = new Map<string, { title: string; quantity: number }>();

      data.orders.forEach((order) => {
        order.line_items.forEach((item) => {
          const existing = productMap.get(item.product_id);
          if (existing) {
            existing.quantity += item.quantity;
          } else {
            productMap.set(item.product_id, {
              title: item.title,
              quantity: item.quantity,
            });
          }
        });
      });

      const sorted = [...productMap.values()]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5)
        .map((v, i) => `${i + 1}. ${v.title} - ${v.quantity} units`)
        .join("\n");

      return `Top 5 selling products (last ${days} days):\n${sorted}`;
    }

    case ShopifyAction.TopBuyingCustomers: {
      const url = `${baseUrl}/admin/api/2023-07/orders.json?status=any&limit=250`;
      const data = await fetchFromShopify(url, headers) as ShopifyOrdersResponse;

      const customerMap = new Map<string, { totalSpent: number; name: string }>();

      data.orders.forEach((order) => {
        if (order.customer) {
          const customerId = order.customer.id;
          const customerName = `${order.customer.first_name || ''} ${order.customer.last_name || ''}`.trim() || 'Unknown';
          const orderTotal = parseFloat(order.total_price || "0");
          
          const existing = customerMap.get(customerId);
          if (existing) {
            existing.totalSpent += orderTotal;
          } else {
            customerMap.set(customerId, {
              totalSpent: orderTotal,
              name: customerName,
            });
          }
        }
      });

      const sortedCustomers = [...customerMap.values()]
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 5)
        .map((v, i) => `${i + 1}. ${v.name} - ₹${v.totalSpent.toFixed(2)}`)
        .join("\n");

      return `Top 5 buying customers:\n${sortedCustomers}`;
    }

    case ShopifyAction.AllProducts: {
      const url = `${baseUrl}/admin/api/2023-07/products.json?limit=250`;
      const data = await fetchFromShopify(url, headers) as ShopifyProductsResponse;
      
      if (!data.products || data.products.length === 0) {
        return "No products found in the store.";
      }
      
      const productList = data.products
        .map((product, index) => `${index + 1}. ${product.title} - ₹${product.price}`)
        .join("\n");
      
      return `All products in the store (${data.products.length}):\n${productList}`;
    }

    default:
      return `Unsupported action "${action}".`;
  }
};
