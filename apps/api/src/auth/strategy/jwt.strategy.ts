import { PrismaService } from 'src/prisma/prisma.service';
import { Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
@Injectable()
export class JwtAuthStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
	super({
    // jwtFromRequest, secretOrKey, etc. should be configured here
    secretOrKey: process.env.JWT_SECRET ?? process.env.Secret_JWT,
    jwtFromRequest: (req: any) => {
        if (!req || !req.headers) {
            return null;
        }
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return null;
        }
        const [type, token] = authHeader.split(' ');
        if (type !== 'Bearer' || !token) {
            return null;
        }
        return token;

    }

    }

  );}
  async validate(payload: any) {
    return payload; // You can add more user validation logic here if needed
  }
    private tokenExtractorFromHeader(request: Request): string | undefined {
        if (!request) {
            return undefined;
        }
        const [type, token] = request.headers.get?.('authorization')?.split(' ') ?? [];
        return type === 'Bearer' && token ? token : undefined;
    }}

   
