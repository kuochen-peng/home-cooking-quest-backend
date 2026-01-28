import 'dotenv/config'
import express from 'express'
import mongoose from 'mongoose'
import { StatusCodes } from 'http-status-codes'
import userRouter from './routes/user.js'
import cors from 'cors'
import recipeRouter from './routes/recipe.js'
import missionRouter from './routes/mission.js'
import articleRouter from './routes/article.js'
import commentRouter from './routes/comment.js'
import './passport/passport.js'

mongoose
  .connect(process.env.DB_URL)
  .then(() => {
    console.log('資料庫連線成功')
  })
  .catch((error) => {
    console.log('資料庫連線失敗')
    console.error(error)
  })

const app = express()

app.use(cors())

app.use(express.json())
app.use((error, req, res, _next) => {
  res.status(StatusCodes.BAD_REQUEST).json({
    message: '資料格式錯誤',
  })
})

app.use('/user', userRouter)
app.use('/recipe', recipeRouter)
app.use('/mission', missionRouter)
app.use('/comment', commentRouter)
app.use('/article', articleRouter)

app.listen(process.env.PORT || 4000, () => {
  console.log('伺服器啟動 http://localhost:4000')
})
