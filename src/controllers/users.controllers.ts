//controller củng chỉ là handler có nhiệm vụ tập kết dữ liệu từ người dùng và phân phát vào các service đúng chỗ
//controller là nơi tập kết và xử lý logic cho các dữ liệu nhận được
//trong controller các dữ liệu đều phải clean

import { NextFunction, Request, Response } from 'express'
import {
  ChangePasswordReqBody,
  LoginReqBody,
  LogoutReqBody,
  RefreshTokenReqBody,
  RegisterReqBody,
  ResetPasswordReqBody,
  TokenPayLoad,
  UpdateMeReqBody,
  VerifyEmailReqQuery,
  VerifyForgotPasswordTokenReqBody
} from '~/models/requests/users.requests'
import usersServices from '~/services/users.services'
import { ParamsDictionary } from 'express-serve-static-core'
import { ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'
import { USERS_MESSAGES } from '~/constants/messages'
import { UserVerifyStatus } from '~/constants/enums'

export const registerController = async (req: Request<ParamsDictionary, any, RegisterReqBody>, res: Response) => {
  const { email } = req.body
  //gọi service  và tạo user từ email, password trong req.body
  //lưu user đó vào users collection của mongoDB

  //kiểm tra email có tồn tại chưa | có ai dùng email chưa | check trùng
  const isDup = await usersServices.checkEmailExist(email)
  if (isDup) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNPROCESSABLE_ENTITY, //422
      message: USERS_MESSAGES.EMAIL_ALREADY_EXISTS
    })
  }
  const result = await usersServices.register(req.body)
  res.status(HTTP_STATUS.CREATED).json({
    message: USERS_MESSAGES.REGISTER_SUCCESS,
    result
  })
}

export const loginController = async (
  req: Request<ParamsDictionary, any, LoginReqBody>,
  res: Response,
  next: NextFunction
) => {
  //cần lấy email và password để tìm xem user vào đang sở hữu
  //nếu không có thì user ngừng cuộc chơi
  //nmếu có thì tạo at và rf
  const { email, password } = req.body
  const result = await usersServices.login({ email, password })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.LOGIN_SUCCESS,
    result //ac và rf
  })
}

export const logoutController = async (
  req: Request<ParamsDictionary, any, LogoutReqBody>,
  res: Response,
  next: NextFunction
) => {
  //xem thử user_id trong payload của refresh_token và access_token có giống không?
  const { refresh_token } = req.body
  const { user_id: user_id_at } = req.decode_authorization as TokenPayLoad
  const { user_id: user_id_rf } = req.decode_refresh_token as TokenPayLoad
  if (user_id_at != user_id_rf) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED, //401, tự tin trả về 422
      message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID
    })
  }
  //nếu trùng rồi thì mình xem thử refresh_token có được quyền dùng dịch vụ không?
  await usersServices.checkRefreshToken({
    user_id: user_id_at,
    refresh_token: refresh_token
  })
  //khi nào có mã đó trong database thì mình tiến hành logout(xóa rf khỏi hệ thống)
  await usersServices.logout(refresh_token)
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.LOGOUT_SUCCESS
  })
}

export const verifyEmailTokenController = async (
  req: Request<ParamsDictionary, any, any, VerifyEmailReqQuery>,
  res: Response,
  next: NextFunction
) => {
  //khi họ bấm vào link thi họ sẽ gữi email_verify_token leen lên thông qua
  //req.query
  const { email_verify_token } = req.query
  const { user_id } = req.decode_email_verify_token as TokenPayLoad

  //kiểm tra xem trong database có user nào sở hữu là user_id trong paylod
  //          và email_verify_token
  const user = await usersServices.checkEmailVerifyToken({ user_id, email_verify_token })
  //kiểm tra xem user tìm được bị banned chưa, chưa thì mới verify
  if (user.verify == UserVerifyStatus.Banned) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.UNAUTHORIZED, //401
      message: USERS_MESSAGES.EMAIL_HAS_BEEN_BANNED
    })
  } else {
    //chưa verify thì mình verify
    const result = await usersServices.verifyEmail(user_id)
    //sau khi verify thì
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.VERIFY_EMAIL_SUCCESS,
      result // ac và rf
    })
  }
}

export const resendVerifyEmailController = async (
  req: Request<ParamsDictionary, any, any>,
  res: Response,
  next: NextFunction
) => {
  //dùng user_id tìm user đó
  const { user_id } = req.decode_authorization as TokenPayLoad

  //kiểm tra user đó có verify hay bị banned không?
  const user = await usersServices.findUserById(user_id)
  if (!user) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.NOT_FOUND,
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  } else if (user.verify == UserVerifyStatus.Verified) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.OK,
      message: USERS_MESSAGES.EMAIL_HAS_BEEN_VERIFIED
    })
  } else {
    //chưa verify thì resend
    await usersServices.resendEmailVerify(user_id)
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.RESEND_EMAIL_VERIFY_TOKEN_SUCCESS
    })
  }
}

export const forgotPasswordController = async (
  req: Request<ParamsDictionary, any, any>,
  res: Response,
  next: NextFunction
) => {
  const { email } = req.body
  const hasUser = await usersServices.checkEmailExist(email)
  if (!hasUser) {
    throw new ErrorWithStatus({
      status: HTTP_STATUS.NOT_FOUND,
      message: USERS_MESSAGES.USER_NOT_FOUND
    })
  } else {
    await usersServices.forgotPassword(email)
    res.status(HTTP_STATUS.OK).json({
      message: USERS_MESSAGES.CHECK_EMAIL_TO_RESET_PASSWORD
    })
  }
}

export const verifyforgotPasswordTokenController = async (
  req: Request<ParamsDictionary, any, VerifyForgotPasswordTokenReqBody>,
  res: Response,
  next: NextFunction
) => {
  //người dùng gữi lên forgot_password_token
  const { forgot_password_token } = req.body
  //mình đã xác thực mã rồi
  //nhưng mà chỉ thực thi khi forgot_password_token còn hiệu lực với user không
  //nên mình cần tìm user thông qua user_id
  const { user_id } = req.decode_forgot_password_token as TokenPayLoad
  //tìm user nào đang có 2 thông tin trên, nếu không tìm được nghĩa là forgot_password_token
  //đã được thay thế hoặc bị xóa rồi

  await usersServices.checkForgotPasswordToken({ user_id, forgot_password_token })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.VERIFY_PASSWORD_FORGOT_TOKEN_SUCCESS
  })
}

export const resetPasswordController = async (
  req: Request<ParamsDictionary, any, ResetPasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  //người dùng gữi lên forgot_password_token
  const { forgot_password_token, password } = req.body
  //mình đã xác thực mã rồi
  //nhưng mà chỉ thực thi khi forgot_password_token còn hiệu lực với user không
  //nên mình cần tìm user thông qua user_id
  const { user_id } = req.decode_forgot_password_token as TokenPayLoad
  //tìm user nào đang có 2 thông tin trên, nếu không tìm được nghĩa là forgot_password_token
  //đã được thay thế hoặc bị xóa rồi

  await usersServices.checkForgotPasswordToken({ user_id, forgot_password_token })
  await usersServices.resetPasswordToken({ user_id, password })
  //nếu còn hiệu lực thì tiến hành cập nhật password
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.RESET_PASSWORD_SUCCESS
  })
}

export const getMeController = async (req: Request, res: Response, next: NextFunction) => {
  //middleware accessTokenValidator đã chạy rồi, nên ta có thể lấy đc user_id từ decoded_authorization
  const { user_id } = req.decode_authorization as TokenPayLoad
  //tìm user thông qua user_id này và trả về user đó
  //truy cập vào database nên ta sẽ code ở user.services
  const userInfor = await usersServices.getMe(user_id) // hàm này ta chưa code, nhưng nó dùng user_id tìm user và trả ra user đó
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.GET_ME_SUCCESS,
    userInfor
  })
}

export const updateMeController = async (
  req: Request<ParamsDictionary, any, UpdateMeReqBody>,
  res: Response,
  next: NextFunction
) => {
  //người dùng trên lên access_token => user_id
  const { user_id } = req.decode_authorization as TokenPayLoad
  //nội dung mà người dùng muốn cập nhật
  const payload = req.body

  //kiểm tra xem user đã verify chưa
  await usersServices.checkEmailVerify(user_id)
  //đã verify rồi thì mình tiến hành cập nhật xog thì mình trả ra thông tin user sau cập nhật
  const userInfo = await usersServices.updateMe({ user_id, payload })
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.UPDATE_PROFILE_SUCCESS,
    userInfo
  })
}

export const changePasswordController = async (
  req: Request<ParamsDictionary, any, ChangePasswordReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decode_authorization as TokenPayLoad //lấy user_id từ decoded_authorization của access_token
  const { password, old_password } = req.body //lấy old_password và password từ req.body
  //kiểm tra xem old_password có đúng với password có trong database không trong db không
  //vừa tìm vừa update nếu có
  await usersServices.changePassword({
    user_id,
    old_password,
    password
  }) //chưa code changePassword
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.CHANGE_PASSWORD_SUCCESS
  })
}

export const refreshTokenController = async (
  req: Request<ParamsDictionary, any, RefreshTokenReqBody>,
  res: Response,
  next: NextFunction
) => {
  // khi qua middleware refreshTokenValidator thì ta đã có decoded_refresh_token
  //chứa user_id và token_type
  //ta sẽ lấy user_id để tạo ra access_token và refresh_token mới
  const { user_id } = req.decode_refresh_token as TokenPayLoad //lấy refresh_token từ req.body
  const { refresh_token } = req.body
  const isRefreshTokenValid = await usersServices.checkRefreshToken({
    user_id,
    refresh_token
  })
  if (!isRefreshTokenValid) {
    throw new ErrorWithStatus({
      message: USERS_MESSAGES.REFRESH_TOKEN_IS_INVALID,
      status: HTTP_STATUS.UNAUTHORIZED
    })
  }
  const result = await usersServices.refreshToken({ user_id, refresh_token }) //refreshToken chưa code
  res.status(HTTP_STATUS.OK).json({
    message: USERS_MESSAGES.REFRESH_TOKEN_SUCCESS,
    result // ac và rf mới
  })
}
