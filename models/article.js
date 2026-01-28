import { Schema, model } from 'mongoose'
import cloudinary from '../cloudinary/cloudinary.js'

const articleSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
    },

    content: {
      type: String,
      required: [true, '內容'],
      maxlength: [100000],
    },

    image: [
      {
        type: String,
      },
    ],

    // 分類
    category: {
      type: String,
      required: [true, '請選擇分類'],
      enum: {
        values: ['閒聊', '提問', '分享', '曬圖', '公告'],
        message: '分類格式錯誤',
      },
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'users',
    },

    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'users',
      },
    ],

    comment: {
      type: Schema.Types.ObjectId,
      ref: 'comments',
    },
  },
  {
    timestamps: true, // 發文時間
    versionKey: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// 虛擬動態欄位
// schema.virtual(欄位名稱).get(資料產生方式)
articleSchema.virtual('imageUrl').get(function () {
  // this = 現在處理的這筆資料
  const article = this
  const imageUrl = []
  article.image?.forEach((image) => {
    imageUrl.push(cloudinary.url(image))
  })

  return imageUrl
})

export default model('articles', articleSchema)
