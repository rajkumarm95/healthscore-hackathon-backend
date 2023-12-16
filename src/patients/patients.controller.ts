import { Controller, Post, Param, Body } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { SuggestDataDTO } from './dto/create-patient.dto';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post('suggestions/goal/:id')
  suggestGoals(@Param('id') patentId: string) {
    return this.patientsService.suggestGoals(patentId);
  }
  @Post('suggestions/plan')
  suggestPlans(@Body() body: any) {
    return this.patientsService.suggestPlans(body);
  }

  @Post()
  suggestTrainingPlan(@Body() suggestData: SuggestDataDTO) {
    return this.patientsService.suggestTrainingPlan(suggestData);
  }
}
