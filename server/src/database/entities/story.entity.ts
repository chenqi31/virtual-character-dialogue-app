import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Character } from './character.entity';
import { Session } from './session.entity';

@Entity('stories')
export class Story {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'varchar', length: 200 })
  @Index()
  title!: string;

  @Column({ type: 'text' })
  background!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @OneToMany(() => Character, (c) => c.story, { cascade: true })
  characters?: Character[];

  @OneToMany(() => Session, (s) => s.story, { cascade: true })
  sessions?: Session[];
}
