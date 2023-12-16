import { Controller, Post, Param } from '@nestjs/common';
import { PatientsService } from './patients.service';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post('/:id')
  create(@Param('id') patentId: string) {
    return this.patientsService.create(patentId);
  }
}
