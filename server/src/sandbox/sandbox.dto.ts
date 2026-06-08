import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class SandboxCommandDto {
  @IsIn(['start', 'pause', 'resume', 'reset', 'inject'])
  action!: 'start' | 'pause' | 'resume' | 'reset' | 'inject';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sessionId!: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  event?: string;
}
