import { StatusCodes } from 'http-status-codes'
import validator from 'validator'
import Comment from '../models/comment.js'

export const createComment = async (req, res) => {
  try {
    req.body.author = req.user._id

    delete req.body.likes

    const result = await Comment.create(req.body)

    res.status(StatusCodes.CREATED).json({
      result,
    })
  } catch (error) {
    console.log(error)
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(StatusCodes.BAD_REQUEST).json({ message })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: '伺服器錯誤' })
    }
  }
}

// 更新留言
export const updateComment = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('ID')
    }

    const result = await Comment.findById(req.params.id).orFail(new Error('ID'))

    if (req.user._id.equals(result.author)) {
      result.content = req.body.content || result.content
      if (req.body.rating) result.rating = req.body.rating
      await result.save()
    }
    res.status(StatusCodes.OK).json({
      result,
    })
  } catch (error) {
    console.log(error)
    if (error.message === 'ID') {
      res.status(StatusCodes.NOT_FOUND).json({
        message: '找不到 ID',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: '伺服器錯誤' })
    }
  }
}

// 刪除留言
export const deleteComment = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    const result = await Comment.findById(req.params.id).orFail(new Error('ID'))

    await result.deleteOne()

    res.status(StatusCodes.OK).json({
      message: '刪除成功',
    })
  } catch (error) {
    if (error.message === 'ID') {
      res.status(StatusCodes.NOT_FOUND).json({ message: '找不到 ID' })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: '伺服器錯誤' })
    }
  }
}

// 所有留言
export const getAllComment = async (req, res) => {
  try {
    const result = await Comment.find()
      .populate('author', 'account')
      .populate('recipe', 'name')
      .populate('article', 'title')
      .sort({ createdAt: -1 })
    res.status(StatusCodes.OK).json({
      result,
    })
  } catch (error) {
    console.log(error)
    if (error.message === 'ID') {
      res.status(StatusCodes.NOT_FOUND).json({ message: '找不到 ID' })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: '伺服器錯誤' })
    }
  }
}

// 取得食譜留言
export const getRecipeComment = async (req, res) => {
  try {
    const result = await Comment.find({ recipe: req.params.id })
      .populate('author', 'account')
      .sort({ createdAt: -1 })

    res.status(StatusCodes.OK).json({
      result,
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: '伺服器錯誤' })
  }
}

// 取得文章留言
export const getArticleComment = async (req, res) => {
  try {
    const result = await Comment.find({ article: req.params.id })
      .populate('author', 'account')
      .sort({ createdAt: -1 })

    res.status(StatusCodes.OK).json({
      result,
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: '伺服器錯誤' })
  }
}

// 按讚
export const toggleLike = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    const comment = await Comment.findById(req.params.id).orFail(new Error('ID'))

    const isLiked = comment.likes.includes(req.user._id)

    if (!isLiked) {
      // 沒按過 -> 加入
      comment.likes.push(req.user._id)
    } else {
      // 按過-> 移除
      comment.likes.pull(req.user._id)
    }

    await comment.save()

    res.status(StatusCodes.OK).json({
      message: '按讚狀態更新成功',
      likesCount: comment.likes.length, // 回傳最新按讚數給前端
      isLiked: !isLiked, // 回傳當前使用者是否按讚 (true=剛按讚, false=剛取消)
    })
  } catch (error) {
    if (error.message === 'ID') {
      res.status(StatusCodes.NOT_FOUND).json({ message: '找不到此留言' })
    } else {
      console.log(error)
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: '伺服器錯誤' })
    }
  }
}
