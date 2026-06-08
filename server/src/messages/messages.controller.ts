import { Body, Controller, Get, ParseIntPipe, Post, Query } from '@nestjs/common';
import { AppendMessageDto } from './messages.dto';
import { MessagesService } from './messages.service';

@Controller('api/messages')
export class MessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get()
  list(
    @Query('sessionId', ParseIntPipe) sessionId: number,
    @Query('limit') limit?: string,
    @Query('beforeId') beforeId?: string,
  ) {
    return this.service.list(
      sessionId,
      limit ? Number(limit) : undefined,
      beforeId ? Number(beforeId) : undefined,
    );
  }

  @Post()
  append(@Body() dto: AppendMessageDto) {
    return this.service.append(dto);
  }
}
