import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCharacterDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  storyId!: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsString()
  @IsNotEmpty()
  persona!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  traits?: string[];

  @IsOptional()
  @IsString()
  initialRelation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;
}

export class UpdateCharacterDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  persona?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  traits?: string[];

  @IsOptional()
  @IsString()
  initialRelation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatar?: string;
}
