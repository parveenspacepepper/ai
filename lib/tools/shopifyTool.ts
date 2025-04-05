// lib/tools/shopifyTool.ts

const baseUrl = process.env.SHOPIFY_STORE!; // e.g. https://your-store.myshopify.com
const headers = {
  "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN!,
  "Content-Type": "application/json",
};

export const shopifyTool = async ({ action, dateRange, filter }: any) => {
  let url = "";
  let result = "Unsupported action";

  const today = new Date().toISOString().split("T")[0];

  switch (action) {
    case "customerCount":
      url = `${baseUrl}/admin/api/2023-07/customers/count.json`;
      break;

    case "orderCount":
      url = `${baseUrl}/admin/api/2023-07/orders/count.json`;
      break;

    case "salesToday":
      url = `${baseUrl}/admin/api/2023-07/orders.json?created_at_min=${today}`;
      break;

    case "products":
      url = `${baseUrl}/admin/api/2023-07/products.json?limit=5`;
      break;

    default:
      return { result };
  }

  const response = await fetch(url, { headers });
  const data = await response.json();

  return {
    action,
    dateRange,
    filter,
    result: JSON.stringify(data, null, 2),
  };
};
