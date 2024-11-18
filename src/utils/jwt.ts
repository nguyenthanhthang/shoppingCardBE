//file này lưu hàm để tạo ra 1 token
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { TokenPayLoad } from '~/models/requests/users.requests'
dotenv.config()
export const signToken = ({
  payload,
  privateKey,
  options = { algorithm: 'HS256' }
}: {
  payload: string | Buffer | object
  privateKey: string
  options?: jwt.SignOptions
}) => {
  return new Promise<string>((resolve, reject) => {
    jwt.sign(payload, privateKey, options, (error, token) => {
      if (error) {
        throw reject(error)
      } else return resolve(token as string) //as string: hứa token sẽ là string
    })
  })
}
//làm hàm giúp kiểm tra 1 token có đúng với chữ ký hay không
//nếu đúng thì trả ra payload đang có trong token đó
export const verifyToken = ({ token, privateKey }: { token: string; privateKey: string }) => {
  return new Promise<TokenPayLoad>((resolve, reject) => {
    jwt.verify(token, privateKey, (error, decoded) => {
      if (error) throw reject(error)
      else return resolve(decoded as TokenPayLoad)
    })
  })
}
