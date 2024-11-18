import { Router } from 'express'
import { serveImageController, serveVideoStreamController } from '~/controllers/static.controllers'
import { wrapAsync } from '~/utils/handler'

const staticRouter = Router()

// staticRouter.use('/image', express.static(UPLOAD_IMAGE_DIR))
staticRouter.get('/image/:filename', wrapAsync(serveImageController))
//:filename : gọi là params

staticRouter.get('/video/:filename', wrapAsync(serveVideoStreamController))

export default staticRouter
