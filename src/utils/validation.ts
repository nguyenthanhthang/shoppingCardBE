import { ValidationChain, validationResult } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema'
import { Request, Response, NextFunction } from 'express'
import { EntityError, ErrorWithStatus } from '~/models/Errors'
import HTTP_STATUS from '~/constants/httpStatus'

//hàm validation sẽ nhận vào checkShema và trả ra middleware xử lý lỗi
export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await validation.run(req) // tạo danh sách lỗi cất vào req
    const errors = validationResult(req) //lấy ds lỗi trong req cưới dạng mạng
    if (errors.isEmpty()) {
      return next()
    } else {
      const errorObject = errors.mapped()
      const entityError = new EntityError({ errors: {} }) //entityError dùng để thay thế errorObject
      for (const key in errorObject) {
        const { msg } = errorObject[key]
        if (msg instanceof ErrorWithStatus && msg.status != HTTP_STATUS.UNPROCESSABLE_ENTITY) {
          return next(msg)
        }
        // nếu lỗi phát sinh không dạng ErrorWithStatus và có status 422 thì thêm vào entityError với công thức đã nói trước đó
        entityError.errors[key] = msg
      }
      //sau khi tổng hợp xong thì ném ra cho defaultErrorHandler xử lý
      next(entityError)
    }
  }
}
