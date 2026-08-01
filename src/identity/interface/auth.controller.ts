import { Body, Controller, Get, HttpCode, Post, Req, Res, UseFilters, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { RegisterUser } from '#identity/application/register-user.js';
import { LoginUser } from '#identity/application/login-user.js';
import { LogoutUser } from '#identity/application/logout-user.js';
import { GetCurrentUser } from '#identity/application/get-current-user.js';
import { ListUsers, type UserView } from '#identity/application/list-users.js';
import { IdentityExceptionFilter } from './identity-exception.filter.js';
import { SessionAuthGuard, parseCookie } from './session-auth.guard.js';
import { RolesGuard } from './roles.guard.js';
import { Roles } from './roles.decorator.js';

function setSessionCookie(res: Response, req: Request, token: string, expiresAt: Date): void {
  res.cookie('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: expiresAt.getTime() - Date.now(),
    secure: req.secure,
  });
}

@Controller('api/auth')
@UseFilters(IdentityExceptionFilter)
export class AuthController {
  constructor(
    private registerUser: RegisterUser,
    private loginUser: LoginUser,
    private logoutUser: LogoutUser,
    private getCurrentUser: GetCurrentUser,
    private listUsers: ListUsers,
  ) {}

  @Post('register')
  @HttpCode(201)
  async register(
    @Body() body: { email: string; password: string; role: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ id: string; email: string; role: string }> {
    await this.registerUser.execute({ email: body?.email, password: body?.password, role: body?.role });
    const { token, expiresAt, user } = await this.loginUser.execute({ email: body?.email, password: body?.password });
    setSessionCookie(res, req, token, expiresAt);
    return user;
  }

  @Post('login')
  @HttpCode(200)
  async login(
    @Body() body: { email: string; password: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ id: string; email: string; role: string }> {
    const { token, expiresAt, user } = await this.loginUser.execute({ email: body?.email, password: body?.password });
    setSessionCookie(res, req, token, expiresAt);
    return user;
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = parseCookie(req.headers.cookie, 'session');
    if (token) {
      await this.logoutUser.execute({ token });
    }
    res.clearCookie('session', { path: '/' });
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  me(@Req() req: Request): unknown {
    return (req as any).user;
  }

  @Get('users')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('Researcher', 'Trainer')
  users(): Promise<UserView[]> {
    return this.listUsers.execute();
  }
}
