/* eslint-disable prettier/prettier */
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Patients } from './patient.entity';

@Entity('Patients_suggestions')
export class PatientsSuggestions {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  data: string;

  @ManyToOne(() => Patients, (patients) => patients.suggestions)
  @JoinColumn({ name: 'patient_id' })
  patients: Patients | string;
}
