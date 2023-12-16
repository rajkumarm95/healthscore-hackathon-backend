import { Controller, Post, Param, Get } from '@nestjs/common';
import { PatientsService } from './patients.service';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post('/:id')
  fetchPatientDetail(@Param('id') patentId: string) {
    return this.patientsService.fetchPatientDetail(patentId);
  }

  @Get()
  suggest(params: any) {}
}
