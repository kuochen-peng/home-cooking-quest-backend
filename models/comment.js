import { Schema, model } from 'mongoose'

const commentSchema = new Schema(
  {
    content: {
      type: String,
      required: [true, '留言內容必填'],
      trim: true,
      maxlength: [500, '留言不能超過 500 字'],
    },
    recipe: {
      type: Schema.Types.ObjectId,
      ref: 'recipes',
    },
    article: {
      type: Schema.Types.ObjectId,
      ref: 'articles',
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'users',
      required: true,
    },
    likes: [{ type: Schema.Types.ObjectId, ref: 'users' }],
    rating: {
      type: Number,
      default: 0,
      validate: {
        validator(value) {
          if (this.article) return true
          else if (value >= 1 && value <= 5) return true
          else return false
        },
      },
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
)

export default model('comments', commentSchema)
