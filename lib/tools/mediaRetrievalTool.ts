import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const embedder = new OpenAIEmbeddings();

export const mediaRetrievalTool = new DynamicStructuredTool({
  name: "mediaRetrievalTool",
  description: "Retrieve relevant media transcripts based on user queries",
  schema: z.object({
    query: z.string().describe("The user's query about media content"),
  }),
  func: async ({ query }) => {
    const queryEmbedding = await embedder.embedQuery(query);
    const index = pinecone.index(process.env.PINECONE_INDEX!);

    const results = await index.query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true,
    });

    const transcripts = results.matches.map((match) => match.metadata?.transcript).filter(Boolean);

    if (transcripts.length === 0) {
      return "No relevant media found.";
    }

    return `Relevant transcripts:\n${transcripts.join("\n\n")}`;
  },
});
