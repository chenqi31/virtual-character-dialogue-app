import { Body, Controller, Post } from '@nestjs/common';
import { SandboxCommandDto } from './sandbox.dto';
import { SandboxService } from './sandbox.service';

@Controller('api/sandbox')
export class SandboxController {
  constructor(private readonly service: SandboxService) {}

  @Post()
  command(@Body() dto: SandboxCommandDto) {
    return this.service.handle(dto);
  }
}
