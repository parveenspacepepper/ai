import { ConvexHttpClient } from "convex/browser";

export const getConvexClient = () => {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in env.");
  }
  return new ConvexHttpClient(url);
};
