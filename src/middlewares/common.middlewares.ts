//hàm mode lại req.body theo mảng các key mình muốn

import { pick } from 'lodash'
import { Response, Request, NextFunction } from 'express'

// import { Response, Request, NextFunction } from 'express'
// import { pick } from 'lodash'
// //ta đang dùng generic để khi dùng hàm filterMiddleware nó sẽ nhắc ta nên bỏ property nào vào mảng
// //FilterKeys là mảng các key của object T nào đó
// type FilterKeys<T> = Array<keyof T>

// export const filterMiddleware =
//   <T>(filterKey: FilterKeys<T>) =>
//   (req: Request, res: Response, next: NextFunction) => {
//     req.body = pick(req.body, filterKey)
//     next()
//   }

export const filterMiddleware = <T>(filterKeys: Array<keyof T>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    req.body = pick(req.body, filterKeys)
    next()
  }
}
