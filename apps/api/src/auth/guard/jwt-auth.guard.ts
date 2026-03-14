import { ExecutionContext, ForbiddenException, Get, Injectable, RequestTimeoutException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthStrategy } from '../strategy/jwt.strategy';
import { Request } from '@nestjs/common';
import { Roles } from 'src/common/decorator/roles.decorator';
import { CanActivate } from '@nestjs/common';
import e from 'express'
@Injectable()
export class JWTAuthGuard extends AuthGuard('jwt') {
    // You can override methods here if you want to add custom behavior
    constructor(private reflactor : Reflector) {
        super();
    }
    async canActivate(context: ExecutionContext) {
        // Add custom authentication logic here if needed
        const isAuthenticated = await super.canActivate(context) as boolean;
        if (!isAuthenticated) {
            throw new UnauthorizedException('Invalid or missing token');
        }

        const requiredRoles = this.reflactor.getAllAndOverride<string[]>('roles', [
            context.getHandler(),
        ]);
        if(requiredRoles) {
            return true;
        }
        else{
            throw new ForbiddenException('You do not have permission to access this resource');
        }
    }

    private tokenExtractorFromHeader(request: Request): string | undefined {
        if (!request) {
            return undefined;
        }
        const [type, token] = request.headers.get?.('authorization')?.split(' ') ?? [];
        return type === 'Bearer' && token ? token : undefined;
    }}

   


    


