import { Injectable } from '@nestjs/common';
import { OpenAIService } from './openai/openai.service';
@Injectable()
export class AppService {
  constructor(private openAI: OpenAIService) {}
  getHello(): string {
    return 'Hello World!';
  }

  async getGpt() {
    return this.openAI.chatWithGPT4([{ role: 'user', content: 'Hello!' }]);
  }
}
