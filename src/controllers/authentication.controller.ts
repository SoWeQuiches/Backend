import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticationService } from '../services/authentication.service';
import { RegisterDTO } from '../dto/register.dto';
import { LoginDTO } from '../dto/login.dto';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { AuthenticationService } from '../services/authentication.service';
import { RegisterDTO } from '../data-transfer-objects/register.dto';
import { LoginDTO } from '../data-transfer-objects/login.dto';
import { User } from '../models/user.model';
import { JWTGuard } from '../guards/jwt.guard';
import config from '../config';
import { SwaDto } from 'src/data-transfer-objects/swa.dto';

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

  @Get('apple-client-secret')
  getAppleClientSecret() {
    return this.authenticationService.appleIdClientSecret();
  }

  @Post('apple-id')
  appleIdWebhook(@Body() body: SwaDto) {
    console.log({ body });

    try {
      jwt.verify(body.id_token);

      const decodedToken = jwt.decode(body.id_token);

      const appleToken = axios.post('https://appleid.apple.com/auth/token', {
        client_id: config.swa.serviceId,
        client_secret: this.authenticationService.appleIdClientSecret(),
        code: body.code,
        grant_type: 'authorization_code',
        redirect_uri: 'https://api.sign.quiches.ovh/auth/test',
      });

      return {
        userEmail: decodedToken.email,
        appleToken,
      };
    } catch (err) {
      return {
        err,
      };
    }
  }

  @Get('apple-id-authorization-url')
  appleIdAuthorizationUrl() {
    const baseUrl = 'https://appleid.apple.com/auth/authorize';

    const params = {
      response_type: 'code id_token',
      response_mode: 'form_post',
      client_id: config.swa.serviceId,
      redirect_uri: 'https://api.sign.quiches.ovh/auth/apple-id',
      // state: '32ba49aa07', // TODO: need generation
      scope: 'name email',
    };

    const searchParams = Object.keys(params)
      .map((key) => {
        return `${key}=${encodeURIComponent(params[key])}`;
      })
      .join('&');

    return `${baseUrl}?${searchParams}`;
  }

  @Get('test')
  @Post('test')
  test(@Body() body) {
    console.log({ body });
  }
}
