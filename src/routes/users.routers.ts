//trong users.routers.ts
//khai báo
import express from 'express'
import {
  changePasswordController,
  forgotPasswordController,
  getMeController,
  loginController,
  logoutController,
  refreshTokenController,
  registerController,
  resendVerifyEmailController,
  resetPasswordController,
  updateMeController,
  verifyEmailTokenController,
  verifyforgotPasswordTokenController
} from '~/controllers/users.controllers'
import { filterMiddleware } from '~/middlewares/common.middlewares'
import {
  accessTokenValidator,
  changePasswordValidator,
  emailVerifyTokenValidator,
  forgotPasswordTokenValidator,
  forgotPasswordValidator,
  loginValidator,
  refreshTokenValidator,
  registerValidator,
  resetPasswordValidator,
  updateMeValidator,
  verifyForgotPasswordTokenValidator
} from '~/middlewares/users.middlewares'
import { UpdateMeReqBody } from '~/models/requests/users.requests'
import { wrapAsync } from '~/utils/handler'

//tạo router
const userRouter = express.Router() //khai báo Router

/*
    Desc: Register a new user
    Path: /register
    Method: post
    Body: {
        name: string,
        email: string,
        password: string,
        confirm_password: string,
        date_of_birth: string có dạng ISO8601

    }
*/
userRouter.post('/register', registerValidator, wrapAsync(registerController))

/*
    Desc: login
    path: /login
    method: post
    body: {
        email: string,
        password: string
    }
*/
userRouter.post('/login', loginValidator, wrapAsync(loginController))

/*
    desc: logout
    path: users/logout
    method: post
    headers: {
        Authorization: 'Bearer <access_token>'
    }
        body: {
        
        }
*/

userRouter.post('/logout', accessTokenValidator, refreshTokenValidator, wrapAsync(logoutController))

/*
    desc: verify email
     khi người dùng nhấn vào link có trong email của họ
     thì evt sẽ được gữi lên server BE thông qua req.query
     path: users/verify-email/?email_verify_token=string
     method: get
*/
userRouter.get('/verify-email', emailVerifyTokenValidator, wrapAsync(verifyEmailTokenController))

/*
    desc: resend verify email token
     người dùng sẽ dùng chức năng này thì làm mất, lạc email
     phải đăng nhập thì mới cho verify
     headers {
        Authorization: 'Bearer <access_token>'
     }
     
     method: post
*/
userRouter.post('/resend-verify-email', accessTokenValidator, wrapAsync(resendVerifyEmailController))

/*
    desc: forgot password
    khi quên mật khẩu thì dùng chức năng này
    path: users/forgot-password
    body: {
        email: string
    }
     
     method: post
*/
userRouter.post('/forgot-password', forgotPasswordValidator, wrapAsync(forgotPasswordController))

// userRouter.get('/page', (req, res: Response) => {
//   fs.readFile(__dirname + '/page/index.html', 'utf8', (err, text) => {
//     res.send(text)
//   })
// })

/*
    desc:  verify forgot password token
    route kiểm tra verify_forgot_password_token có còn dùng được không
    path: users/verify-forgot-password
    body: {
        forgot_password_token: string
        }
     method: post
*/
userRouter.post('/verify-forgot-password', forgotPasswordTokenValidator, wrapAsync(verifyforgotPasswordTokenController))

/*
    desc:  reset password
    path: users/reset-password  
    body: {
        password: string,
        confirm_password: string,
        forgot_password_token: string
        }
     method: post
*/

userRouter.post(
  '/reset-password',
  verifyForgotPasswordTokenValidator,
  resetPasswordValidator,
  wrapAsync(resetPasswordController)
)

/*
des: get profile của user
path: 'users/me'
method: post
Header: {Authorization: Bearer <access_token>}
body: {}
*/
userRouter.post('/me', accessTokenValidator, wrapAsync(getMeController))

/*
des: update profile của user
path: '/me'
method: patch
Header: {Authorization: Bearer <access_token>}
body: {
  name?: string
  date_of_birth?: Date
  bio?: string // optional
  location?: string // optional
  website?: string // optional
  username?: string // optional
  avatar?: string // optional
  cover_photo?: string // optional}
*/

userRouter.patch(
  '/me',
  //cần 1 hàm sàn lọc requestbody ở đây
  filterMiddleware<UpdateMeReqBody>([
    'name',
    'date_of_birth',
    'bio',
    'location',
    'website',
    'avatar',
    'username',
    'cover_photo'
  ]),
  accessTokenValidator, //
  updateMeValidator,
  wrapAsync(updateMeController)
)

/*
  desc: change-password
  đổi mật khẩu
  path: users/change-password
  method: put
  headers: {
    Authorization: Bearer <access_token>
  }
  body: {
    old_password: string,
    password: string,
    confirm_password: string
  }
*/
userRouter.put(
  '/change-password',
  accessTokenValidator, //
  changePasswordValidator,
  wrapAsync(changePasswordController)
)

/*
  des: refreshtoken
  chức năng này dùng khi ac hết hạn, cần lấy về ac mới(quà tặng kèm rf mới)
  path: '/refresh-token'
  method: POST
  Body: {refresh_token: string}
g}
  */
userRouter.post('/refresh-token', refreshTokenValidator, wrapAsync(refreshTokenController))
//khỏi kiểm tra accesstoken, tại nó hết hạn rồi mà
//refreshTokenController chưa làm
export default userRouter
