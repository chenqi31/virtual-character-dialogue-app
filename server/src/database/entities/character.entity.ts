import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Story } from './story.entity';

@Entity('characters')
@Index(['storyId', 'name'], { unique: true })
export class Character {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  storyId!: number;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text' })
  persona!: string;

  @Column({ type: 'simple-json', default: '[]' })
  traits!: string[];

  @Column({ type: 'text', default: '' })
  initialRelation!: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  avatar?: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @ManyToOne(() => Story, (s) => s.characters, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storyId' })
  story?: Story;
}
