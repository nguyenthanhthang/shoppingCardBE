import fs from 'fs' //module chứa cá method xử lý file
import path from 'path'
import { Request } from 'express'
import formidable, { File } from 'formidable'
import { UPLOAD_IMAGE_TEMP_DIR, UPLOAD_VIDEO_DIR } from '~/constants/dir'
export const initFolder = () => {
  //lấy đường dẫn từ project đến thư mục uploads
  ;[UPLOAD_VIDEO_DIR, UPLOAD_IMAGE_TEMP_DIR].forEach((dir) => {
    if (!fs.existsSync(UPLOAD_IMAGE_TEMP_DIR)) {
      fs.mkdirSync(UPLOAD_IMAGE_TEMP_DIR, {
        //nếu không  tạo thì tạo ra
        recursive: true //cho phép tạo folder nested vào nhau
        //uploads/image/bla bla bla
      }) //mkdirSync: giúp tạo thư mục
    }
  })
}

//handleUploadSingleImage: hàm nhận vào req
//ép req đi qua lưới lọc formidable và trả ra các file ảnh thỏa điều kiện
//gọi hàm này bỏ req vào và nhận được các file ảnh

export const handleUploadImage = async (req: Request) => {
  //chuẩn bị lưới lọc formidable
  const form = formidable({
    uploadDir: UPLOAD_IMAGE_TEMP_DIR,
    maxFiles: 4, // tối đa 1 file
    maxFileSize: 300 * 1024,
    maxTotalFileSize: 300 * 1024 * 4,
    keepExtensions: true, // giữ lại đuôi của file
    filter: ({ name, originalFilename, mimetype }) => {
      //name là tên của field chứa file <input name='fileNe'>
      //originalFilename: tên gốc của file
      //mimetype: kiểu của file 'video/mp4' 'video/mkv
      const valid = name === 'image' && Boolean(mimetype?.includes('image')) //trick lỏ boolen để ko dup mime
      if (!valid) {
        form.emit('error' as any, new Error('File Type Invalid') as any)
      }
      return valid //chắc chắn là true
    }
  })
  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err)
      if (!files.image) return reject(new Error('Image is empty'))
      return resolve(files.image)
    })
  })
}

export const handleUploadVideo = async (req: Request) => {
  //chuẩn bị lưới lọc formidable
  const form = formidable({
    uploadDir: UPLOAD_VIDEO_DIR,
    maxFiles: 1, // tối đa 1 file
    maxFileSize: 50 * 1024 * 1024,
    keepExtensions: true, // giữ lại đuôi của file
    filter: ({ name, originalFilename, mimetype }) => {
      //name là tên của field chứa file <input name='fileNe'>
      //originalFilename: tên gốc của file
      //mimetype: kiểu của file 'video/mp4' 'video/mkv
      const valid = name === 'video' && Boolean(mimetype?.includes('video')) //trick lỏ boolen để ko dup mime
      if (!valid) {
        form.emit('error' as any, new Error('File Type Invalid') as any)
      }
      return valid //chắc chắn là true
    }
  })
  return new Promise<File[]>((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) return reject(err)
      if (!files.video) return reject(new Error('Image is empty'))
      return resolve(files.video)
    })
  })
}

//hàm lấy tên của file và bỏ qua extendsion
//asdas.png => asdas
export const getNameFormFullFile = (filename: string) => {
  //ví dụ filename là avatar.thang.png---.>avatar-thang
  const nameArr = filename.split('.')
  nameArr.pop() // xóa cuối
  return nameArr.join('-')
}
