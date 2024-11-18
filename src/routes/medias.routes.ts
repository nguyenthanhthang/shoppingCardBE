import { Router } from 'express'
import { uploadImageController, uploadVideoController } from '~/controllers/medias.controllers'
import { wrapAsync } from '~/utils/handler'

const mediasRouter = Router()

mediasRouter.post('/upload-image', wrapAsync(uploadImageController))
mediasRouter.post('/upload-video', wrapAsync(uploadVideoController))

export default mediasRouter
