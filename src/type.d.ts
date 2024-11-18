import { Request } from 'express'
import { TokenPayLoad } from './models/requests/users.requests'
declare module 'express' {
  interface Request {
    decode_authorization?: TokenPayLoad
    decode_refresh_token?: TokenPayLoad
    decode_email_verify_token?: TokenPayload
    decode_forgot_password_token?: TokenPayLoad
  }
}
