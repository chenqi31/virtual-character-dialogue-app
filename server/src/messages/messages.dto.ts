import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { CharacterTarget, MessageRole } from '../database/entities';

export class AppendMessageDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionId!: number;

  @IsIn(['system', 'char_a', 'char_b', 'user'])
  role!: MessageRole;

  @IsOptional()
  @IsIn(['a', 'b'])
  target?: CharacterTarget;

  @IsString()
  @MaxLength(20_000)
  content!: string;
}
