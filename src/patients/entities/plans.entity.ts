/* eslint-disable prettier/prettier */
import {
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Patients } from './patient.entity';
import { Exercise } from './exercise.entity';
import { Diet } from './diet.entity';

@Entity('plan')
export class Plans {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Patients, (patients) => patients.plan)
  @JoinColumn({ name: 'patient_id' })
  patients: Patients;

  @OneToMany(() => Exercise, (exercise) => exercise.plan)
  exercise: Exercise;

  @OneToMany(() => Diet, (diet) => diet.plan)
  diet: Diet;
}
