type ShopifyOrder = {
  total_price: string;
  line_items: Array<{
    product_id: string;
    title: string;
    quantity: number;
  }>;
};

interface ShopifyOrdersResponse {
  orders: ShopifyOrder[];
}

interface ShopifyCountResponse {
  count: number;
}

type ShopifyAction =
  | "customerCount"
  | "orderCount"
  | "salesLastNDays"
  | "avgOrderValue"
  | "topSellingProducts";

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
    case "customerCount": {
      const url = `${baseUrl}/admin/api/2023-07/customers/count.json`;
      const response = await fetch(url, { headers });
      const data = (await response.json()) as ShopifyCountResponse;
      return `Customer count: ${data.count}`;
    }

    case "orderCount": {
      const url = `${baseUrl}/admin/api/2023-07/orders/count.json?created_at_min=${from}&created_at_max=${to}&status=any`;
      const response = await fetch(url, { headers });
      const data = (await response.json()) as ShopifyCountResponse;
      return `Order count in last ${days} days: ${data.count}`;
    }

    case "salesLastNDays": {
      const response = await fetch(orderFetchUrl, { headers });
      const data = (await response.json()) as ShopifyOrdersResponse;
      const totalSales = data.orders.reduce((sum, order) => {
        return sum + parseFloat(order.total_price || "0");
      }, 0);
      return `Sales in the last ${days} days: ₹${totalSales.toFixed(2)}`;
    }

    case "avgOrderValue": {
      const response = await fetch(orderFetchUrl, { headers });
      const data = (await response.json()) as ShopifyOrdersResponse;
      const totalSales = data.orders.reduce((sum, order) => {
        return sum + parseFloat(order.total_price || "0");
      }, 0);
      const average = totalSales / data.orders.length || 0;
      return `Average order value (last ${days} days): ₹${average.toFixed(2)}`;
    }

    case "topSellingProducts": {
      const response = await fetch(orderFetchUrl, { headers });
      const data = (await response.json()) as ShopifyOrdersResponse;

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

    default:
      return `Unsupported action "${action}".`;
  }
};
