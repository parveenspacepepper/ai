import { Pinecone } from "@pinecone-database/pinecone";
import { OpenAIEmbeddings } from "@langchain/openai";

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
});

export default async function pineconeUpsert(transcript: string) {
  const index = pinecone.index(process.env.PINECONE_INDEX!);
  const embedder = new OpenAIEmbeddings();
  const vectors = await embedder.embedDocuments([transcript]);

  await index.upsert([
    {
      id: `media-${Date.now()}`,
      values: vectors[0],
      metadata: {
        source: "media",
        timestamp: new Date().toISOString(),
      },
    },
  ]);
}
