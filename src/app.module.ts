import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
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
    MongooseModule.forRoot(process.env.MONGO_DB_STRING),
    PatientsModule,
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'hackathon',
      entities: [Patients, PatientsSuggestions, Plans, Exercise, Diet],
      synchronize: true,
    }),
  ],
  controllers: [AppController],
  providers: [AppService, OpenAIService, OpenAIService],
})
export class AppModule {}
