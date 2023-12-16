/* eslint-disable prettier/prettier */
import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
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

  @ManyToOne(() => Exercise, (exercise) => exercise.plan)
  @JoinColumn({ name: 'exercise_id' })
  exercise: Exercise;

  @ManyToOne(() => Diet, (diet) => diet.plan)
  @JoinColumn({ name: 'diet_id' })
  diet: Diet;
}
