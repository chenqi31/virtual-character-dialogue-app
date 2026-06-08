import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { IsIn } from 'class-validator';
import { CreateSessionDto } from './sessions.dto';
import { SessionsService } from './sessions.service';
import { SessionState } from '../database/entities';

class UpdateStateDto {
  @IsIn(['idle', 'running', 'paused', 'ended'])
  state!: SessionState;
}

@Controller('api/sessions')
export class SessionsController {
  constructor(private readonly service: SessionsService) {}

  @Get()
  list(@Query('storyId', ParseIntPipe) storyId: number) {
    return this.service.listByStory(storyId);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.get(id);
  }

  @Post()
  create(@Body() dto: CreateSessionDto) {
    return this.service.create(dto);
  }

  @Post(':id/reset')
  reset(@Param('id', ParseIntPipe) id: number) {
    return this.service.reset(id);
  }

  @Post(':id/clear')
  clear(@Param('id', ParseIntPipe) id: number) {
    return this.service.clearMessages(id);
  }

  @Patch(':id/state')
  updateState(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStateDto,
  ) {
    return this.service.updateState(id, dto.state);
  }
}
