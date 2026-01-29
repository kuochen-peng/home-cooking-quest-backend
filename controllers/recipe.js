import Recipe from '../models/recipe.js'
import Mission from '../models/mission.js'
import { StatusCodes } from 'http-status-codes'
import validator from 'validator'
import cloudinary from '../cloudinary/cloudinary.js'

// 新增食譜
export const createRecipe = async (req, res) => {
  try {
    req.body.ingredients = JSON.parse(req.body.ingredients)
    req.body.nutrition = JSON.parse(req.body.nutrition)
    // 取得上傳的檔案 (因為用了 fields，所以是 req.files)
    // req.files 結構: { image: [File...], stepImages: [File...] }
    const attachments = req.files || {}

    // 處理主圖片 (如果有上傳，取第 0 張的 path)
    const mainImage =
      attachments.image && attachments.image.length > 0 ? attachments.image[0].filename : ''

    // 處理步驟與步驟圖片
    let steps = []
    if (req.body.steps) {
      // 前端傳來的是 JSON 字串，必須解析
      steps = JSON.parse(req.body.steps)

      // 如果有上傳步驟圖
      if (attachments.stepImages && attachments.stepImages.length > 0) {
        steps.forEach((step) => {
          // 根據前端傳來的 fileIndex，去 stepImages 陣列找對應的檔案
          // 確保 fileIndex 是數字且大於等於 0
          if (typeof step.fileIndex === 'number' && step.fileIndex > -1) {
            // 安全檢查：確認該 index 真的有檔案
            if (attachments.stepImages[step.fileIndex]) {
              step.image = attachments.stepImages[step.fileIndex].filename
            }
          }
          // 處理完後，移除 fileIndex，不需要存進資料庫
          delete step.fileIndex
        })
      }
    }
    if (req.body.unlockPrice !== 0) {
      req.body.isUnlocked = false
    } else if (req.user.role !== 'admin') {
      req.body.isOfficial = false
    }
    // 建立資料庫資料
    // 注意：這裡不直接用 ...req.body，避免把字串格式的 steps 存進去導致錯誤
    const result = new Recipe({
      ...req.body,
      image: mainImage,
      steps: steps, // 使用處理好的 steps 陣列
      author: req.user._id,
    })

    await result.save()
    const mission = await Mission.findOne({ code: '新增食譜', isActive: true })
    if (req.user.missionStatus.dailyPostCount < mission.dailyLimit) {
      if (mission) {
        req.user.points.current += mission.pointsReward
        req.user.points.totalEarned += mission.pointsReward

        req.user.pointLog.push({
          type: '獲得',
          amount: mission.pointsReward,
          event: '新增食譜',
          description: `發布食譜獎勵：${result.name}`,
        })

        req.user.missionStatus.dailyRecipeCount++

        await req.user.save()
        res.status(StatusCodes.CREATED).json({
          result,
          recipe: req.user.pointLog.at(-1),
          message: `發布成功！獲得 ${mission.pointsReward} 積分`,
        })
      }
      return
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

// 查看所有食譜
export const getAllRecipe = async (req, res) => {
  try {
    const result = await Recipe.find().populate('author', 'account').sort({ createdAt: -1 })
    res.status(StatusCodes.OK).json({
      result,
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: '伺服器錯誤',
    })
  }
}

// 查看所有公開的食譜
export const getPublicRecipes = async (req, res) => {
  try {
    const result = await Recipe.find({ status: '發佈' })
      .populate('author', 'account')
      .sort({ createdAt: -1 })
    res.status(StatusCodes.OK).json({
      result,
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: '伺服器錯誤',
    })
  }
}

// 查看所有食譜數量
export const getAllRecipeNumber = async (req, res) => {
  try {
    const result = await Recipe.countDocuments()
    res.status(StatusCodes.OK).json({
      result,
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: '伺服器錯誤',
    })
  }
}

// 食譜的狀態
export const getRecipeInfo = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) throw new Error('ID')

    const result = await Recipe.findById(req.params.id)
      .populate('author', 'account')
      .orFail(new Error('ID'))

    // 觀看次數 +1
    result.views++

    await result.save()

    if (result.unlockPrice === 0) {
      result.isUnlocked = true
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

// 解鎖食譜
export const unlockRecipe = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('ID')
    }

    const result = await Recipe.findById(req.params.id).orFail(new Error('ID'))

    if (req.user.unlockedRecipes.some((id) => id.equals(result._id))) {
      throw new Error('已擁有')
    }
    if (result.author.equals(req.user._id)) {
      throw new Error('自己發布的食譜')
    }
    if (req.user.points.current < result.unlockPrice) {
      throw new Error('積分不足')
    }
    if (req.user.role === 'admin') {
      throw new Error('不是管理員')
    }
    req.user.points.current -= result.unlockPrice
    req.user.unlockedRecipes.push(result._id)

    if (req.user.savedRecipes.some((id) => id.equals(result._id))) {
      req.user.savedRecipes.pull(result._id)
    }

    req.user.pointLog.push({
      type: '消耗',
      amount: result.unlockPrice,
      event: '解鎖食譜',
      description: `解鎖食譜：${result.name}`,
      targetId: result._id,
    })

    await result.save()
    await req.user.save()

    res.status(StatusCodes.OK).json({
      remainingPoints: req.user.points.current,
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
    } else if (
      error.message === '已擁有' ||
      error.message === '自己發布的食譜' ||
      error.message === '積分不足'
    ) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: '無法解鎖',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: '伺服器錯誤',
      })
    }
  }
}

// 更新食譜
export const updateRecipe = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('ID')
    }

    const result = await Recipe.findById(req.params.id).orFail(new Error('ID'))

    if (req.user._id.equals(result.author) || req.user.role === 'admin') {
      req.body.ingredients = JSON.parse(req.body.ingredients)

      const attachments = req.files || {}

      // 處理主圖片更新
      if (attachments.image && attachments.image.length > 0) {
        // 如果原本有舊圖，先刪除 Cloudinary 上的舊圖
        if (result.image) {
          await cloudinary.uploader.destroy(result.image)
        }
        result.image = attachments.image[0].filename
      }

      // 處理步驟更新
      if (req.body.steps) {
        const newStepsData = JSON.parse(req.body.steps)

        // 處理新上傳的步驟圖片
        if (attachments.stepImages && attachments.stepImages.length > 0) {
          newStepsData.forEach((step) => {
            if (typeof step.fileIndex === 'number' && step.fileIndex > -1) {
              if (attachments.stepImages[step.fileIndex]) {
                // 如果是編輯模式，這裡也可能有舊圖，直接覆蓋成新圖
                step.image = attachments.stepImages[step.fileIndex].filename
              }
            }
            delete step.fileIndex
          })
        }

        // 清理被刪除的步驟圖片 (Cloudinary 清理)
        // 邏輯：找出「原本資料庫有的圖」但在「新的步驟資料」中消失的圖
        const oldStepImages = result.steps.map((s) => s.image).filter(Boolean)
        const newStepImages = newStepsData.map((s) => s.image).filter(Boolean)

        // 找出需要刪除的圖片
        const imagesToDelete = oldStepImages.filter((img) => !newStepImages.includes(img))

        for (const img of imagesToDelete) {
          await cloudinary.uploader.destroy(img)
        }

        // 更新步驟資料
        result.steps = newStepsData
      }

      // 更新其他文字欄位
      result.name = req.body.name || result.name
      result.description = req.body.description || result.description
      result.ingredients = req.body.ingredients || result.ingredients
      result.category = req.body.category || result.category
      result.unlockPrice = req.body.unlockPrice || result.unlockPrice
      result.status = req.body.status || result.status
      result.rating = req.body.rating || result.rating

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

// user 的食譜
export const getMyRecipes = async (req, res) => {
  try {
    const result = await Recipe.find({ author: req.user._id })
      .populate('author', 'account')
      .sort({ createdAt: -1 })

    res.status(StatusCodes.OK).json({
      result,
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: '伺服器錯誤',
    })
  }
}

// 收藏
export const bookmark = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id).orFail(new Error('ID'))

    // 檢查是否收藏
    if (req.user.savedRecipes.some((id) => id.equals(recipe._id))) {
      // 移除
      req.user.savedRecipes.pull(recipe._id)
      recipe.savedBy.pull(req.user._id)
    } else {
      // 加入
      req.user.savedRecipes.addToSet(recipe._id)
      recipe.savedBy.addToSet(req.user._id)
    }
    await Promise.all([req.user.save(), recipe.save()])

    res.status(StatusCodes.OK).json({
      message: req.user.savedRecipes.some((id) => id.equals(recipe._id)) ? '加入收藏' : '取消收藏',
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: '伺服器錯誤',
    })
  }
}
