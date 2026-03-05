import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    async hashpPassword(password:string):Promise<string>{
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    }
    async comparePassword(password:string, hash:string):Promise<boolean>{
        return await bcrypt.compare(password, hash);
    }

}
