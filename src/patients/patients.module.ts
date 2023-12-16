import { Module } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { PatientsController } from './patients.controller';
import { HttpModule } from '@nestjs/axios';
import { OpenAIService } from '../openai/openai.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patients } from './entities/patient.entity';
import { PatientsSuggestions } from './entities/patient_suggestions.entity';
import { Plans } from './entities/plans.entity';
import { Diet } from './entities/diet.entity';
import { Exercise } from './entities/exercise.entity';

@Module({
  imports: [
    HttpModule,
    TypeOrmModule.forFeature([
      Patients,
      PatientsSuggestions,
      Plans,
      Diet,
      Exercise,
    ]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService, OpenAIService],
})
export class PatientsModule {}
