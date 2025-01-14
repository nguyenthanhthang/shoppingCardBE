import { createHash } from 'crypto'
import dotenv from 'dotenv'
dotenv.config()

//build hàm nhận vào content nào đó và mã hóa thành SHA256
//đoạn code này lấy từ trang chủ của SHA256
function sha256(content: string) {
  return createHash('sha256').update(content).digest('hex')
}

//hàm mã hóa password kèm 1 mật khẩu bí mật do mình tạo ra
export function hashPassword(password: string) {
  return sha256(password + process.env.PASSWORD_SECRET)
}
