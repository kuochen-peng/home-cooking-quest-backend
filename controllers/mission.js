import Mission from '../models/mission.js'
import { StatusCodes } from 'http-status-codes'
import validator from 'validator'

// 新增任務
export const createMission = async (req, res) => {
  try {
    const result = await Mission.create(req.body)

    res.status(StatusCodes.CREATED).json({
      result,
    })
  } catch (error) {
    console.log(error)
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(StatusCodes.BAD_REQUEST).json({ message })
    } else if (error.code === 11000) {
      res.status(StatusCodes.CONFLICT).json({ message: '任務重複' })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: '伺服器錯誤' })
    }
  }
}

// 取得任務列表
export const getMission = async (req, res) => {
  try {
    const result = await Mission.find({ isActive: true }).sort({ pointsReward: 1 })

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

// 取得全部任務
export const getAllMission = async (req, res) => {
  try {
    const result = await Mission.find().sort({ createdAt: -1 })

    res.status(StatusCodes.OK).json({
      result,
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ message: '伺服器錯誤' })
  }
}

// 更新任務
export const updateMission = async (req, res) => {
  try {
    if (!validator.isMongoId(req.params.id)) {
      throw new Error('ID')
    }
    const result = await Mission.findById(req.params.id).orFail(new Error('ID'))
    result.code = req.body.code || result.code
    result.name = req.body.name || result.name
    result.pointsReward = req.body.pointsReward || result.pointsReward
    result.limit = req.body.limit || result.points.limit
    result.dailyLimit = req.body.dailyLimit || result.dailyLimit
    await result.save()

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
