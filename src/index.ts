import express from 'express'
import userRouter from './routes/users.routers'
import databaseService from './services/database.services'
import { defaultErrorHandler } from './middlewares/error.middleware'
import mediasRouter from './routes/medias.routes'
import { initFolder } from './utils/file'
import staticRouter from './routes/static.routers'

const app = express()
const port = 4000
databaseService.connect() // chạy kết nối với DB

app.use(express.json()) //server dùng middlewares biến đổi các chuỗi json được gữi lên

//handler
//server dùng userRouter
app.use('/users', userRouter)
app.use('/medias', mediasRouter)
app.use('/static', staticRouter)

// tạo folder uploads
initFolder()

app.use(defaultErrorHandler)
app.listen(port, () => {
  console.log(`Server BE running at port: ${port}`)
})
