import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";

const SEMRUSH_API_KEY = process.env.SEMRUSH_API_KEY!;
const SEMRUSH_BASE_URL = "https://api.semrush.com/";

const semrushPhraseTool = async ({
  phrase,
  limit,
}: {
  phrase: string;
  limit?: number;
}): Promise<string> => {
  const export_columns = "Ph,Nq,Cp,Co,Nr,Td,Rr,Fk"; // Basic keyword metrics
  const region = "in"; // India fixed
  const url = `${SEMRUSH_BASE_URL}?type=phrase_related&key=${SEMRUSH_API_KEY}&phrase=${encodeURIComponent(
    phrase
  )}&export_columns=${export_columns}&database=${region}&display_limit=${
    limit ?? 10
  }&display_sort=nq_desc`;

  const response = await fetch(url);
  const text = await response.text();

  if (!response.ok) {
    return `Semrush error ${response.status}: ${text}`;
  }

  return `Keyword suggestions for "${phrase}" (India region):\n${text}`;
};

export const semrushLangTool = new DynamicStructuredTool({
  name: "semrushKeywordTool",
  description:
    "Get keyword suggestions and analytics from Semrush for the India region. Useful for SEO research and content strategy.",
  schema: z.object({
    phrase: z.string().describe("Target keyword or phrase"),
    limit: z.number().optional().describe("Number of keyword suggestions to return"),
  }),
  func: semrushPhraseTool,
});
