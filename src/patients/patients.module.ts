import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { HttpModule } from '@nestjs/axios';
import { OpenAIService } from '../openai/openai.service';

@Module({
  imports: [HttpModule],
  controllers: [PatientsController],
  providers: [PatientsService, OpenAIService],
})
export class PatientsModule {}
