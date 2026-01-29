import { StatusCodes } from 'http-status-codes'
import validator from 'validator'
import Article from '../models/article.js'
import Mission from '../models/mission.js'
import cloudinary from '../cloudinary/cloudinary.js'

export const createArticle = async (req, res) => {
  try {
    let image = []
    if (req.files && req.files.image) {
      image = req.files.image.map((file) => file.filename)
    }
    const result = new Article({
      ...req.body,
      image: image,
      author: req.user._id,
    })

    await result.save()

    const mission = await Mission.findOne({ code: '發文', isActive: true })
    if (req.user.missionStatus.dailyPostCount < mission.dailyLimit) {
      if (mission) {
        req.user.points.current += mission.pointsReward
        req.user.points.totalEarned += mission.pointsReward

        req.user.pointLog.push({
          type: '獲得',
          amount: mission.pointsReward,
          event: '發文',
          description: `發文：${result.title}`,
        })
        req.user.missionStatus.dailyPostCount++

        req.user.postCount++
        await req.user.save()

        return res.status(StatusCodes.CREATED).json({
          result,
          log: req.user.pointLog.at(-1),
          message: `發布成功！獲得 ${mission.pointsReward} 積分`,
        })
      }
    }
    res.status(StatusCodes.OK).json({
      result,
      message: '建立成功',
    })
  } catch (error) {
    console.log(error)
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(StatusCodes.BAD_REQUEST).json({
        message,
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: '伺服器錯誤',
      })
    }
  }
}

// 刪除發文
export const deleteArticle = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    const article = await Article.findById(req.params.id).orFail(new Error('ID'))

    // 處理圖片刪除
    if (article.image && article.image.length > 0) {
      const deleteImagePromises = article.image.map((publicId) => {
        return publicId ? cloudinary.uploader.destroy(publicId) : Promise.resolve()
      })
      await Promise.all(deleteImagePromises)
    }
    // 刪除資料庫文件
    await article.deleteOne()

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

// 所有發文
export const getAllArticle = async (req, res) => {
  try {
    // const result = await Article.find().populate('author', 'account').sort({ createdAt: -1 })
    const result = (
      await Article.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'author',
            foreignField: '_id',
            as: 'author',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  account: 1,
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: '$author',
          },
        },
        {
          $lookup: {
            from: 'comments',
            localField: '_id',
            foreignField: 'article',
            as: 'comments',
          },
        },
        {
          $addFields: {
            comments: {
              $size: '$comments',
            },
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
      ])
    ).map((article) => {
      article.imageUrl = []
      article.image.forEach((image) => {
        article.imageUrl.push(cloudinary.url(image))
      })

      return article
    })
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

// 更新發文
export const updateArticle = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('ID')
    }

    const result = await Article.findById(req.params.id).orFail(new Error('ID'))

    if (req.user._id.equals(result.author)) {
      const attachments = req.files || {}

      // 處理圖片更新 (如果有上傳新圖片)
      if (attachments.image && attachments.image.length > 0) {
        // 1. 刪除舊圖
        if (result.image && result.image.length > 0) {
          for (const publicId of result.image) {
            // 確保 publicId 存在且不是空字串
            if (publicId) await cloudinary.uploader.destroy(publicId)
          }
        }
        // 2. 儲存新圖路徑
        result.image = attachments.image.map((file) => file.filename)
      }

      // 更新其他文字欄位
      result.title = req.body.title || result.title
      result.content = req.body.content || result.content
      result.category = req.body.category || result.category

      await result.save()
    }
    res.status(StatusCodes.OK).json({
      result,
    })
  } catch (error) {
    console.log(error)
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(StatusCodes.BAD_REQUEST).json({
        message,
      })
    } else if (error.message === 'ID') {
      res.status(StatusCodes.NOT_FOUND).json({
        message: '找不到 ID',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: '伺服器錯誤',
      })
    }
  }
}

// 按讚/取消按讚
export const likeArticle = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    const article = await Article.findById(req.params.id).orFail(new Error('ID'))

    const isLiked = article.likes.includes(req.user._id)
    if (!isLiked) {
      article.likes.push(req.user._id)
    } else {
      article.likes.pull(req.user._id)
    }
    await article.save()

    res.status(StatusCodes.OK).json({
      message: '按讚狀態更新成功',
      likesCount: article.likes.length, // 回傳最新按讚數給前端
      isLiked: !isLiked,
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: '伺服器錯誤' })
  }
}
