import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { PatientsSuggestions } from './patient_suggestions.entity';
import { Plans } from './plans.entity';

@Entity('patients')
export class Patients {
  @PrimaryColumn()
  patientId: string;

  @Column({ type: 'jsonb' })
  vitalData: any;

  @OneToMany(() => PatientsSuggestions, (suggestions) => suggestions.patients)
  suggestions: PatientsSuggestions;

  @OneToMany(() => Plans, (plan) => plan.patients)
  plan: Plans;
}
