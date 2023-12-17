import { Controller, Post, Param, Body, Get, Patch } from '@nestjs/common';
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

  @Patch(':id/complete/diet')
  completeDiet(@Param('id') id: string) {
    return this.patientsService.completeDiet(id);
  }

  @Patch(':id/complete/exercise')
  completeExercise(@Param('id') id: string) {
    return this.patientsService.completeExercise(id);
  }

  @Get()
  test() {
    return this.patientsService.test();
  }
}
