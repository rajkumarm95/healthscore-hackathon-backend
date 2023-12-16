/* eslint-disable prettier/prettier */
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Plans } from './plans.entity';

@Entity('exercise')
export class Exercise {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  data: string;

  @Column()
  day: string;

  @Column({ default: false })
  completed: boolean;

  @ManyToOne(() => Plans, (plan) => plan.exercise)
  @JoinColumn({ name: 'plan_id' })
  plan: Plans;
}
