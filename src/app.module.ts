import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { PatientsModule } from './patients/patients.module';
import { OpenAIService } from './openai/openai.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Patients } from './patients/entities/patient.entity';
import { PatientsSuggestions } from './patients/entities/patient_suggestions.entity';
import { Plans } from './patients/entities/plans.entity';
import { Exercise } from './patients/entities/exercise.entity';
import { Diet } from './patients/entities/diet.entity';
@Module({
  imports: [
    ConfigModule.forRoot(),
    PatientsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.HOST,
      port: 5432,
      username: process.env.NAME,
      password: process.env.PASSWORD,
      database: process.env.DATABASE,
      entities: [Patients, PatientsSuggestions, Plans, Exercise, Diet],
      synchronize: true,
      ssl: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, OpenAIService, OpenAIService],
})
export class AppModule {}
