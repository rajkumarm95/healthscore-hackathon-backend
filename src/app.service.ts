import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
@Injectable()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }

  async getGpt() {
    const openai = new OpenAI({
      apiKey: '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',
    });
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-0613',
      messages: [{ role: 'user', content: 'Hello!' }],
      max_tokens: 100,
      temperature: 0.5,
    });

    return completion.choices[0].message.content;
  }
}
