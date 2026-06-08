import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CreateCharacterDto, UpdateCharacterDto } from './characters.dto';
import { CharactersService } from './characters.service';

@Controller('api/characters')
export class CharactersController {
  constructor(private readonly service: CharactersService) {}

  @Get()
  list(@Query('storyId', ParseIntPipe) storyId: number) {
    return this.service.listByStory(storyId);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Post()
  create(@Body() dto: CreateCharacterDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCharacterDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
