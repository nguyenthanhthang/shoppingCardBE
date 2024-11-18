import User from '~/models/schemas/User.schemas'
import databaseService from './database.services'
import { LoginReqBody, RegisterReqBody, UpdateMeReqBody } from '~/models/requests/users.requests'
import { hashPassword } from '~/utils/crypto'
import { signToken } from '~/utils/jwt'
import { TokenType, UserVerifyStatus } from '~/constants/enums'
import dotenv from 'dotenv'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import RefreshToken from '~/models/requests/RefreshToken.schema'
import { ObjectId } from 'mongodb'
import { log } from 'console'
import { update } from 'lodash'
dotenv.config()

class UsersServices {
  private signAccessToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.AccessToken },
      privateKey: process.env.JWT_SECRET_ACCESS_TOKEN as string,
      options: { expiresIn: process.env.ACCESS_TOKEN_EXPIRE_IN }
    })
  }

  private signRefreshToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.RefreshToken },
      privateKey: process.env.JWT_SECRET_REFRESH_TOKEN as string,
      options: { expiresIn: process.env.REFRESH_TOKEN_EXPIRE_IN }
    })
  }

  private signEmailVerifyToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.EmailVerficationToken },
      privateKey: process.env.JWT_SECRET_EMAIL_VERIFY_TOKEN as string,
      options: { expiresIn: process.env.EMAIL_VERIFY_TOKEN_EXPIRE_IN }
    })
  }

  private forgotPasswordToken(user_id: string) {
    return signToken({
      payload: { user_id, token_type: TokenType.ForgotPasswordToken },
      privateKey: process.env.JWT_SECRET_FORGOT_PASSWORD_TOKEN as string,
      options: { expiresIn: process.env.FORGOT_PASSWORD_TOKEN_EXPIRE_IN }
    })
  }

  async checkEmailExist(email: string) {
    //cách 1: lên DB lấy ds email xuống --> xong kiểm tra--> cách này lỏ
    //cách 2: lên DB tìm user đang sở hữu email này, nếu có sẽ lấy 1 user về, không thì nhận được null
    const user = await databaseService.users.findOne({ email })
    return Boolean(user)
  }

  async checkRefreshToken({ user_id, refresh_token }: { user_id: string; refresh_token: string }) {
    const refreshToken = await databaseService.refresh_tokens.findOne({
      user_id: new ObjectId(user_id),
      token: refresh_token
    })
    if (!refreshToken) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
      })
    }
    return refreshToken
  }

  async checkForgotPasswordToken({
    user_id,
    forgot_password_token
  }: {
    user_id: string
    forgot_password_token: string
  }) {
    //tìm user với 2 thông tin trên, ko có thì chữi, có thì return
    const user = await databaseService.users.findOne({
      _id: new ObjectId(user_id),
      forgot_password_token
    })
    //nếu không tìm ra
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.FORGOT_PASSWORD_TOKEN_IS_INVALID
      })
    }
    //nếu có thì return
    return user
  }

  async findUserByEmail(email: string) {
    return await databaseService.users.findOne({ _id: new ObjectId(email) })
  }

  async checkEmailVerifyToken({ user_id, email_verify_token }: { user_id: string; email_verify_token: string }) {
    const user = await databaseService.users.findOne({
      _id: new ObjectId(user_id),
      email_verify_token
    })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND, //404
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    return user
  }

  async checkEmailVerify(user_id: string) {
    const user = await databaseService.users.findOne({
      _id: new ObjectId(user_id),
      verify: UserVerifyStatus.Verified
    }) //nếu không có
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNFORBIDEN, //403
        message: USERS_MESSAGES.USER_NOT_VERIFIED
      })
    }
    return user
  }

  async findUserById(user_id: string) {
    return await databaseService.users.findOne({ _id: new ObjectId(user_id) })
  }

  async register(payLoad: RegisterReqBody) {
    const user_id = new ObjectId()
    console.log(user_id)

    const email_verify_token = await this.signEmailVerifyToken(user_id.toString())
    console.log(email_verify_token)

    await databaseService.users.insertOne(
      new User({
        _id: user_id,
        username: `user${user_id.toString()}`,
        email_verify_token,
        ...payLoad,
        password: hashPassword(payLoad.password), //overwrite: ghi đè, mã hóa nó lại
        date_of_birth: new Date(payLoad.date_of_birth) //overwrite: ghi đè lên, vì định nghĩa bên DB: date_of_birth là date
      })
    )

    // //tạo access va refresh token
    // const access_token = await this.signAccessToken(user_id)
    // const refresh = await this.signRefreshToken(user_id)
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id.toString()),
      this.signRefreshToken(user_id.toString())
    ]) //đây cũng chính là lý do mình chọn xử lý bất đồng bộ, thay vì chọn xử lý đồng bộ
    //Promise.all giúp nó chạy bất đồng bộ, chạy song song nhau, giảm thời gian
    //Lưu refresh_token lại

    //gữi qua email
    console.log(`
      Nội dung Email xác thực thực Email gồm:
        http://localhost:4000/users/verify-email/?email_verify_token=${email_verify_token}
      `)

    databaseService.refresh_tokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id
      })
    )
    return { access_token, refresh_token }
    //ta sẽ return 2 cái này về cho client
    //thay vì return user_id về cho client
  }

  async login({ email, password }: LoginReqBody) {
    //dùng email và password để tìm user
    const user = await databaseService.users.findOne({
      email,
      password: hashPassword(password)
    })
    if (!user) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
        message: USERS_MESSAGES.EMAIL_OR_PASSWORD_IS_INCORRECT
      })
    }
    //nếu có user thì tạo at và rf token
    const user_id = user._id.toString()
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    //Lưu refresh_token lại
    databaseService.refresh_tokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    return {
      access_token,
      refresh_token
    }
  }

  async logout(refresh_token: string) {
    await databaseService.refresh_tokens.deleteOne({ token: refresh_token })
  }

  async getMe(user_id: string) {
    const userInfo = await databaseService.users.findOne(
      { _id: new ObjectId(user_id) },
      {
        projection: {
          //phủ định hết or khẳng định hết, không được 0//1//01
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    return userInfo // sẽ k có những thuộc tính nêu trên, tránh bị lộ thông tin
  }

  async verifyEmail(user_id: string) {
    //dùng user_id tìm và cập nhật
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) }, //
      [
        {
          $set: {
            email_verify_token: '', //
            verify: UserVerifyStatus.Verified,
            updated_at: '$$NOW'
          }
        }
      ]
    )
    //tạo at và rf
    const [access_token, refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])
    //Lưu refresh_token lại
    databaseService.refresh_tokens.insertOne(
      new RefreshToken({
        token: refresh_token,
        user_id: new ObjectId(user_id)
      })
    )
    return {
      access_token,
      refresh_token
    }
  }

  async resendEmailVerify(user_id: string) {
    //ký
    const email_verify_token = await this.signEmailVerifyToken(user_id)

    //lưu
    await databaseService.users.updateOne(
      { _id: new ObjectId(user_id) }, //
      [
        {
          $set: {
            email_verify_token,
            updated_at: '$$NOW'
          }
        }
      ]
    )

    //gữi
    console.log(`
      Nội dung Email xác thực thực Email gồm:
        http://localhost:4000/users/verify-email/?email_verify_token=${email_verify_token}
      `)
  }

  async forgotPassword(email: string) {
    const user = await databaseService.users.findOne({ email })
    if (user) {
      const user_id = user._id
      const forgot_password_token = await this.forgotPasswordToken(user_id.toString())
      //lưu
      await databaseService.users.updateOne(
        { _id: user_id }, //
        [
          {
            $set: {
              forgot_password_token,
              updated_at: '$$NOW'
            }
          }
        ]
      )
      //gui mail
      console.log(`
        Bấm vô đây để đổi mật khẩu:
        http://localhost:8000/reset-password/?forgot_password_token=${forgot_password_token}
        `)
    }
  }

  async resetPasswordToken({ user_id, password }: { user_id: string; password: string }) {
    await databaseService.users.updateOne(
      {
        _id: new ObjectId(user_id)
      }, //
      [
        {
          $set: {
            password: hashPassword(password),
            forgot_password_token: '',
            updated_at: '$$NOW'
          }
        }
      ]
    )
  }

  async updateMe({ user_id, payload }: { user_id: string; payload: UpdateMeReqBody }) {
    //user_id giúp mình tìm được user cần cập nhật
    //payload là những gì user muốn cập nhật, nhưng mình không biết họ đã gữi những gì
    //nếu date_of_birth thì nó cần phải chuyển về Date
    //nếu username đc gữi lên thì nó phải unique
    const _payload = payload.date_of_birth //
      ? { ...payload, date_of_birth: new Date(payload.date_of_birth) } //
      : payload

    //kiểm tra xem người dùng có truyền username không, nếu có thì có bị trùng không
    if (_payload.username) {
      //nếu có truyền username
      //tìm user có username này chưa,
      const isDup = await databaseService.users.findOne({ username: _payload.username })
      if (isDup) {
        //có là đã có người dùng
        throw new ErrorWithStatus({
          status: HTTP_STATUS.UNPROCESSABLE_ENTITY,
          message: USERS_MESSAGES.USERNAME_ALREADY_EXISTS
        })
      }
    }
    //nếu qua hết thì cập nhật
    //mongo cho ta 2 lựa chọn update là updateOne và findOneAndUpdate
    //findOneAndUpdate thì ngoài update nó còn return về document đã update
    const userInfo = await databaseService.users.findOneAndUpdate(
      { _id: new ObjectId(user_id) },
      [
        {
          $set: {
            ..._payload,
            updated_at: '$$NOW'
          }
        }
      ],
      {
        returnDocument: 'after', //trả về document sau khi update, nếu k thì nó trả về document cũ
        projection: {
          //chặn các property k cần thiết
          password: 0,
          email_verify_token: 0,
          forgot_password_token: 0
        }
      }
    )
    return userInfo //đây là document sau khi update
  }

  async changePassword({
    user_id,
    password,
    old_password
  }: {
    user_id: string
    password: string
    old_password: string
  }) {
    //tìm user bằng username và old_password
    const user = await databaseService.users.findOne({
      _id: new ObjectId(user_id),
      password: hashPassword(old_password)
    })
    //nếu không có user thì throw error
    if (!user) {
      throw new ErrorWithStatus({
        message: USERS_MESSAGES.USER_NOT_FOUND,
        status: HTTP_STATUS.UNAUTHORIZED //401
      })
    }
    //nếu có thì cập nhật lại password
    //cập nhật lại password và forgot_password_token
    //tất nhiên là lưu password đã hash rồi
    databaseService.users.updateOne({ _id: new ObjectId(user_id) }, [
      {
        $set: {
          password: hashPassword(password),
          forgot_password_token: '',
          updated_at: '$$NOW'
        }
      }
    ])
    //nếu bạn muốn ngta đổi mk xong tự động đăng nhập luôn thì trả về access_token và refresh_token
    //ở đây mình chỉ cho ngta đổi mk thôi, nên trả về message
    return {
      message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS // trong message.ts thêm CHANGE_PASSWORD_SUCCESS: 'Change password success'
    }
  }

  async refreshToken({ user_id, refresh_token }: { user_id: string; refresh_token: string }) {
    //tạo mới
    const [new_access_token, new_refresh_token] = await Promise.all([
      this.signAccessToken(user_id),
      this.signRefreshToken(user_id)
    ])

    //Lưu rf mới vào database
    //xóa rf token cũ để không ai dùng nữa
    //gữi cặp mã mới cho người dùng
    await databaseService.refresh_tokens.deleteOne({ token: refresh_token }) //xóa refresh
    //insert lại document mới
    await databaseService.refresh_tokens.insertOne(
      new RefreshToken({ user_id: new ObjectId(user_id), token: new_refresh_token })
    )
    return { access_token: new_access_token, refresh_token: new_refresh_token }
  }
}
//tạo instance
const usersServices = new UsersServices()
export default usersServices
