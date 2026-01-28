import { Schema, model } from 'mongoose'
import cloudinary from '../cloudinary/cloudinary.js'

const stepSchema = new Schema(
  {
    description: { type: String, required: [true, '步驟說明'] },
    image: String,
  },
  { toJSON: { virtuals: true }, toObject: { virtuals: true } },
)

const schema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'users',
    },
    name: {
      type: String,
      required: [true, '食譜名稱必填'],
      minlength: [1, '名稱最少 1 個字'],
      maxlength: [100, '名稱最多 100 個字'],
      trim: true,
    },
    isOfficial: { type: Boolean, default: true },
    isUnlocked: { type: Boolean, default: true },
    unlockPrice: { type: Number, default: 0 }, // 解鎖所需積分
    description: {
      type: String,
      trim: true,
    },
    likes: [{ type: Schema.Types.ObjectId, ref: 'users' }], // 按讚紀錄
    savedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'users',
      },
    ],
    // 觀看紀錄
    views: { type: Number, default: 0 },
    // 食譜內容
    ingredients: [
      {
        name: { type: String, required: [true, '食材名稱'] },
        quantity: { type: String, required: [true, '食材份量'] },
      },
    ],
    steps: [stepSchema],
    status: {
      type: String,
      enum: ['草稿', '發佈', '隱藏'],
      default: '發佈',
    },
    category: {
      type: String,
      enum: {
        values: ['中式', '日式', '西式', '甜點', '其他'],
        message: '類別無效',
      },
    },
    nutrition: [
      {
        // 營養標示 (每份)
        calories: Number, // 熱量
        protein: Number, // 蛋白質
        fat: Number, // 脂肪
        carbs: Number, // 碳水化合物
        netCarbs: Number, // 淨碳水
      },
    ],
    image: {
      type: String,
      required: [true, '商品圖片必填'],
    },
    rating: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    versionKey: false,
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// 虛擬動態欄位
// schema.virtual(欄位名稱).get(資料產生方式)
schema.virtual('imageUrl').get(function () {
  // this = 現在處理的這筆資料
  const recipe = this
  // 用 cloudinary 圖片 id 取得圖片網址
  return cloudinary.url(recipe.image)
})

stepSchema.virtual('imageUrl').get(function () {
  // this = 現在處理的這筆資料
  const step = this
  return cloudinary.url(step.image)
})

export default model('recipes', schema)
