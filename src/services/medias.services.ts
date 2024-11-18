import { Request } from 'express'
import sharp from 'sharp'
import { UPLOAD_IMAGE_DIR } from '~/constants/dir'
import { getNameFormFullFile, handleUploadImage, handleUploadVideo } from '~/utils/file'
import fs from 'fs'
import { MediaType } from '~/constants/enums'
import { Media } from '~/models/Order'

class MediasServices {
  async handleUploadImage(req: Request) {
    const files = await handleUploadImage(req) //lấy file trong req
    const result = await Promise.all(
      files.map(async (file) => {
        const newFileName = getNameFormFullFile(file.newFilename) + '.jpg'
        const newPath = UPLOAD_IMAGE_DIR + '/' + newFileName

        //dùng sharp để nén
        //toFile là promise nên phải có await
        const infor = await sharp(file.filepath).jpeg().toFile(newPath)

        //sau khi lưu xong thì xóa file cũ
        fs.unlinkSync(file.filepath)

        //trả ra link truy cập ảnh
        const url: Media = { url: `http://localhost:4000/static/image/${newFileName}`, type: MediaType.Image }
        return url
      })
    )
    return result
  }

  async handleUploadVideo(req: Request) {
    const files = await handleUploadVideo(req) //lấy file trong req
    const result = await Promise.all(
      files.map(async (file) => {
        const url: Media = {
          url: `http://localhost:4000/static/video/${file.newFilename}`, //
          type: MediaType.Video
        }
        return url
      })
    )
    return result
  }
}

const mediasServices = new MediasServices()
export default mediasServices
