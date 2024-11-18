import { Request, Response, NextFunction } from 'express'
import HTTP_STATUS from '~/constants/httpStatus'
import mediasServices from '~/services/medias.services'

export const uploadImageController = async (req: Request, res: Response, next: NextFunction) => {
  // console.log(__dirname): đường dẫn đến folder chứa file này
  // console.log(path.resolve('uploads')): là đường dẫn mà mình mong muốn lưu file vào

  const url = await mediasServices.handleUploadImage(req) //Nhận link
  res.status(HTTP_STATUS.OK).json({
    message: 'Upload image successfully',
    url
  })
}

export const uploadVideoController = async (req: Request, res: Response, next: NextFunction) => {
  // console.log(__dirname): đường dẫn đến folder chứa file này
  // console.log(path.resolve('uploads')): là đường dẫn mà mình mong muốn lưu file vào

  const url = await mediasServices.handleUploadVideo(req) //Nhận link
  res.status(HTTP_STATUS.OK).json({
    message: 'Upload video successfully',
    url
  })
}
