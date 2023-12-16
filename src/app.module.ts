import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { PatientsModule } from './patients/patients.module';
import { OpenAIService } from './openai/openai.service';
@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGO_DB_STRING),
    PatientsModule,
  ],
  controllers: [AppController],
  providers: [AppService, OpenAIService, OpenAIService],
})
export class AppModule {}
