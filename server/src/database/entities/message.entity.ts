import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Session } from './session.entity';

export type MessageRole = 'system' | 'char_a' | 'char_b' | 'user';
export type CharacterTarget = 'a' | 'b';

@Entity('messages')
@Index(['sessionId', 'id'])
export class Message {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ type: 'bigint' })
  sessionId!: number;

  @Column({ type: 'varchar', length: 20 })
  role!: MessageRole;

  @Column({ type: 'varchar', length: 10, nullable: true })
  target?: CharacterTarget;

  @Column({ type: 'text' })
  content!: string;

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date;

  @ManyToOne(() => Session, (s) => s.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session?: Session;
}
