
import { OpenAI } from "openai";
import fs from "fs";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
  });
  
  export default async function whisperTranscribe(filePath: string): Promise<string> {
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: "whisper-1",
      response_format: "text",
      temperature: 0.3,
    });
  
    return response;
  }