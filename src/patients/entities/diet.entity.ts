/* eslint-disable prettier/prettier */
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Plans } from './plans.entity';

@Entity('diet')
export class Diet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  data: string;

  @Column()
  day: string;

  @Column({ default: false })
  completed: boolean;

  @ManyToOne(() => Plans, (plan) => plan.diet)
  @JoinColumn({ name: 'plan_id' })
  plan: Plans;
}
