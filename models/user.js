import { Schema, Error, model } from 'mongoose'
import validator from 'validator'
import bcrypt from 'bcrypt'

const pointLogSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['獲得', '消耗'],
      required: true,
    },
    recipe: { type: Schema.Types.ObjectId, ref: 'recipes' },

    article: { type: Schema.Types.ObjectId, ref: 'articles' },

    amount: { type: Number, required: true }, // 變動數值

    event: {
      type: String,
      enum: ['每日簽到', '發文', '解鎖食譜', '官方發放', '新增食譜'],
      required: true,
    },
    description: { type: String },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

const schema = new Schema(
  {
    account: {
      type: String,
      required: [true, '帳號必填'],
      minlength: [4, '最少4個字'],
      maxlength: [20, '最多20個字'],
      unique: true,
      trim: true,
      validate: {
        validator(value) {
          return validator.isAlphanumeric(value)
        },
        message: '帳號只能是英、數字',
      },
    },
    password: {
      type: String,
      required: [true, '密碼必填'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    tokens: {
      type: [String],
    },
    points: {
      current: { type: Number, default: 0, min: 0 }, // 餘額
      totalEarned: { type: Number, default: 0 }, // 總獲得
    },
    pointLog: [pointLogSchema],
    missionStatus: {
      lastLoginDate: { type: Date }, // 最後登入時間，判斷每日簽到
      dailyPostCount: { type: Number, default: 0 }, // 判斷每日發文
      dailyRecipeCount: { type: Number, default: 0 }, // 判斷每日新增食譜
      lastResetDate: { type: Date, default: Date.now }, // 重置每日
    },
    // 解鎖食譜
    unlockedRecipes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'recipes',
      },
    ],

    // 收藏食譜
    savedRecipes: [
      {
        type: Schema.Types.ObjectId,
        ref: 'recipes',
      },
    ],
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

// mongoose 格式驗證，存進資料夾
// this => 將要保存資料，無法用 () => {}
schema.pre('save', async function () {
  const user = this
  // 密碼欄位修改
  if (user.isModified('password')) {
    // 驗證密碼格式
    let message = ''
    if (user.password.length < 4) {
      message = '密碼最少4個字'
    } else if (user.password.length > 20) {
      message = '密碼最多20個字'
    } else if (!validator.isAscii(user.password)) {
      message = '密碼只能是英、數字、特殊符號'
    }

    // 密碼格式錯誤，拋出驗證錯誤 => 用 mongoose 一樣的驗證錯誤格式 => 方便處理
    if (message !== '') {
      const error = new Error.ValidationError()
      error.addError('password', new Error.ValidatorError({ message }))
      throw error
    }

    // 密碼格式正確，加密
    user.password = bcrypt.hashSync(user.password, 10)
  }

  if (user.isModified('tokens') && user.tokens.length > 10) {
    user.tokens.shift()
  }
})

export default model('users', schema)
