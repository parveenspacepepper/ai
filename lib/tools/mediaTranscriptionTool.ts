
import { DynamicStructuredTool } from "langchain/tools";
import { z } from "zod";
import whisperTranscribe from "@/lib/whisper";
import pineconeUpsert from "@/lib/pinecone";
import fs from "fs/promises";

export const mediaTranscriptionTool = new DynamicStructuredTool({
  name: "mediaTranscriptionTool",
  description: "Transcribe and analyze audio/video media files using Whisper, then store the transcript in Pinecone for retrieval.",
  schema: z.object({
    filePath: z.string().describe("Path to the media file to transcribe and analyze"),
  }),
  func: async ({ filePath }) => {
    try {
      // Transcribe using Whisper
      const transcript = await whisperTranscribe(filePath);

      // Store transcript embeddings in Pinecone
      await pineconeUpsert(transcript);

      return `Transcript: ${transcript}`;
    } catch (error) {
      return `Error in transcription: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      // Optionally delete the temp file after transcription
      await fs.unlink(filePath).catch(() => null);
    }
  },
});
