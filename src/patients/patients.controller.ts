import { Controller, Post, Param, Body } from '@nestjs/common';
import { PatientsService } from './patients.service';
import { SuggestDataDTO } from './dto/create-patient.dto';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post('/:id')
  fetchPatientDetail(@Param('id') patentId: string) {
    return this.patientsService.fetchPatientDetail(patentId);
  }

  @Post()
  suggestTrainingPlan(@Body() suggestData: SuggestDataDTO) {
    return this.patientsService.suggestTrainingPlan(suggestData);
  }
}
