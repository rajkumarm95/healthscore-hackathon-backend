import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';

@Injectable()
export class OpenAIService {
  private openai;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY, // Use environment variable for API key
    });
  }

  async chatWithGPT4(message: any) {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: message,
        temperature: 0.4,
        max_tokens: 1000,
        top_p: 0.5,
        frequency_penalty: 0,
        presence_penalty: 0,
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error(error);
      // Handle or throw the error appropriately
      throw error;
    }
  }
}
