import { Injectable } from '@nestjs/common';
import {bycrypt} from 'bycrypt';

@Injectable()
export class AuthService {
    async hashpPassword(password:string):Promise<string>{
        const salt = await bycrypt.genSalt(10);
        return await bycrypt.hash(password, salt);
    }
    async comparePassword(password:string, hash:string):Promise<boolean>{
        return await bycrypt.compare(password, hash);
    }

}
