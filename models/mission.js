import { Schema, model } from 'mongoose'

const missionSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      enum: ['每日簽到', '發文', '解鎖食譜', '官方發放', '新增食譜'],
    },

    name: { type: String, required: true }, // 名稱
    description: String,

    pointsReward: { type: Number, required: true }, // 完成獲得積分

    // 限制
    limit: {
      type: String,
      enum: ['唯一', '每日', '無限制'],
      default: '每日',
      required: true,
    },
    dailyLimit: { type: Number, default: 1, required: true }, // 每日最多幾次

    isActive: { type: Boolean, default: true }, // 活動開關
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

export default model('missions', missionSchema)
