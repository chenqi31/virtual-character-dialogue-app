import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Story } from './story.entity';
import { Message } from './message.entity';

export type SessionMode = 'sandbox' | 'interactive';
export type SessionState = 'idle' | 'running' | 'paused' | 'ended';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  storyId!: number;

  @Column({ type: 'bigint' })
  charAId!: number;

  @Column({ type: 'bigint' })
  charBId!: number;

  @Column({ type: 'varchar', length: 20, default: 'sandbox' })
  mode!: SessionMode;

  @Column({ type: 'varchar', length: 20, default: 'idle' })
  state!: SessionState;

  @Column({ type: 'int', default: 20 })
  maxRounds!: number;

  @Column({ type: 'int', default: 0 })
  currentRound!: number;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt!: Date;

  @ManyToOne(() => Story, (s) => s.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storyId' })
  story?: Story;

  @OneToMany(() => Message, (m) => m.session, { cascade: true })
  messages?: Message[];

  @Index()
  @Column({ type: 'bigint', nullable: true })
  nextSpeaker?: number; // null = 由事件驱动自动决定
}
