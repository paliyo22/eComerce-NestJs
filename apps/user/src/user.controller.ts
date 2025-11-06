import { Controller} from '@nestjs/common';
import { UserService } from './user.service';
import { MessagePattern, Payload } from '@nestjs/microservices';

@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @MessagePattern({ cmd: 'get_user_info' })
  getUserInfo(@Payload() data: { id: string }) {
    return this.userService.findUserById(data.id);
  }

  @MessagePattern({ cmd: 'check_user_exist' })
  async checkUserExist(@Payload() data: { userId: string }) {
    return this.userService.findUserById(data.userId)
  }
}
