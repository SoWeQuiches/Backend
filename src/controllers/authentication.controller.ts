import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthenticationService } from '../services/authentication.service';
import { RegisterDTO } from '../dto/register.dto';
import { LoginDTO } from '../dto/login.dto';
import { SwaDTO } from '../dto/swa.dto';
import { User } from '../models/user.model';
import { JWTGuard } from '../guards/jwt.guard';

@Controller('auth')
@ApiTags('Authentication')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Post('login')
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  loginUser(@Body() parameters: LoginDTO): Promise<{ token: string }> {
    return this.authenticationService.login(parameters);
  }

  @Post('register')
  @ApiOkResponse()
  @ApiBadRequestResponse()
  registerUser(@Body() parameters: RegisterDTO): Promise<User> {
    return this.authenticationService.registerUser(parameters);
  }

  @Get('me')
  @UseGuards(JWTGuard)
  @ApiSecurity('Bearer')
  me(@Req() request) {
    return request.user;
  }

  @Post('/login/apple-id')
  async appleIdWebhook(@Body() body: SwaDTO): Promise<{ token: string }> {
    return this.authenticationService.loginWithApple(body);
  }
}
