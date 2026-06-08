import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { SessionMode } from '../database/entities';

export class CreateSessionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  storyId!: number;

  @Type(() => Number)
  @IsInt()
  charAId!: number;

  @Type(() => Number)
  @IsInt()
  charBId!: number;

  @IsOptional()
  @IsIn(['sandbox', 'interactive'])
  mode?: SessionMode;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  maxRounds?: number;
}
