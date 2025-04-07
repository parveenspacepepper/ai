const baseUrl = process.env.SHOPIFY_STORE!;
const headers = {
  "X-Shopify-Access-Token": process.env.SHOPIFY_ACCESS_TOKEN!,
  "Content-Type": "application/json",
};

export const shopifyTool = async ({
  action,
}: {
  action: string;
}): Promise<string> => {
  let url = "";

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
      return "Unsupported action. Choose from customerCount, orderCount, salesToday, products.";
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    return `Shopify API error: ${response.status} ${response.statusText}`;
  }

  const data = await response.json();
  return JSON.stringify(data, null, 2);
};
