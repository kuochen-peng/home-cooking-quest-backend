import User from '../models/user.js'
import Mission from '../models/mission.js'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'

export const create = async (req, res) => {
  try {
    const result = new User(req.body)
    await result.save()
    res.status(StatusCodes.CREATED).json({
      result: {
        account: result.account,
        role: result.role,
        points: result.points.current,
      },
    })
  } catch (error) {
    if (error.name === 'ValidationError') {
      const key = Object.keys(error.errors)[0]
      const message = error.errors[key].message
      res.status(StatusCodes.BAD_REQUEST).json({
        message,
      })
    } else if (error.name === 'MongoServerError' && error.code === 11000) {
      res.status(StatusCodes.CONFLICT).json({
        message: '帳號重複',
      })
    } else {
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: '伺服器錯誤',
      })
    }
  }
}

export const login = async (req, res) => {
  try {
    // 檢查上次登入日期是否不等於今天
    if (
      !req.user.missionStatus.lastLoginDate ||
      req.user.missionStatus.lastLoginDate.toLocaleDateString() !==
        req.user.missionStatus.lastResetDate.toLocaleDateString()
    ) {
      // 每日簽到任務
      const mission = await Mission.findOne({ code: '每日簽到', isActive: true })

      if (mission) {
        // 給積分
        req.user.points.current += mission.pointsReward
        req.user.points.totalEarned += mission.pointsReward
        // 更新狀態
        req.user.missionStatus.lastLoginDate = req.user.missionStatus.lastResetDate

        // 獲得積分
        req.user.pointLog.push({
          type: '獲得',
          amount: mission.pointsReward,
          event: '每日簽到',
          description: '每日簽到獎勵',
        })
      }
    }
    // 簽發 jwt
    // jwt.sign(攜帶資料, 驗證用secret, 設定)
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    // 將簽發的 token 存入使用者
    req.user.tokens.push(token)
    await req.user.save()
    res.status(StatusCodes.OK).json({
      result: {
        account: req.user.account,
        role: req.user.role,
        points: req.user.points.current,
        token,
      },
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: '伺服器錯誤',
    })
  }
}

export const profile = (req, res) => {
  res.status(StatusCodes.OK).json({
    result: {
      _id: req.user._id,
      account: req.user.account,
      role: req.user.role,
      points: req.user.points.current,
      totalEarned: req.user.points.totalEarned,
      pointLog: req.user.pointLog,
    },
  })
}

export const refresh = async (req, res) => {
  try {
    const i = req.user.tokens.indexOf(req.token)
    const token = jwt.sign({ _id: req.user._id }, process.env.JWT_SECRET, { expiresIn: '7 days' })
    req.user.tokens[i] = token
    await req.user.save()
    res.status(StatusCodes.OK).json({
      result: {
        token,
      },
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: '伺服器錯誤',
    })
  }
}

export const logout = async (req, res) => {
  try {
    const i = req.user.tokens.indexOf(req.token)
    req.user.tokens.splice(i, 1)
    await req.user.save()
    res.status(StatusCodes.OK).json({
      result: {},
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: '伺服器錯誤',
    })
  }
}

// 解鎖食譜資訊
export const getUnlockedRecipes = async (req, res) => {
  try {
    res.status(StatusCodes.OK).json({
      result: req.user.unlockedRecipes,
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: '伺服器錯誤',
    })
  }
}

// 使用者總數
export const getAccountCount = async (req, res) => {
  try {
    const result = await User.countDocuments()
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

// 所有帳號
export const getAllAccount = async (req, res) => {
  try {
    const result = await User.find({}, '_id account createdAt role points updatedAt missionStatus')
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

// 取得今日積分
export const todayPoints = async (req, res) => {
  try {
    // 時間設定為今天的 00:00:00.000
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 時間往後推一天
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const get = await User.aggregate([
      { $unwind: '$pointLog' },
      {
        $match: {
          'pointLog.type': '獲得',
          'pointLog.createdAt': {
            $gte: today,
            $lt: tomorrow,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$pointLog.count' },
        },
      },
    ])

    const consume = await User.aggregate([
      { $unwind: '$pointLog' },
      {
        $match: {
          'pointLog.type': '消耗',
          'pointLog.createdAt': {
            $gte: today,
            $lt: tomorrow,
          },
        },
      },
      {
        $group: {
          _id: null,
          totalPoints: { $sum: '$pointLog.count' },
        },
      },
    ])

    const getPoints = get.length > 0 ? get[0].totalPoints : 0
    const consumePoints = consume.length > 0 ? consume[0].totalPoints : 0

    res.status(StatusCodes.OK).json({
      getPoints,
      consumePoints,
    })
  } catch (error) {
    console.log(error)
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: '伺服器錯誤',
    })
  }
}

export const getUser = async (req, res) => {
  try {
    const result = await User.findById(req.user._id)
      .populate({
        path: 'unlockedRecipes',
        select:
          'name author image description views isOfficial isUnlocked rating createdAt unlockPrice',
        populate: {
          path: 'author',
          select: 'account',
        },
      })
      .populate({
        path: 'savedRecipes',
        select:
          'name author image description views isOfficial isUnlocked rating createdAt unlockPrice',
        populate: {
          path: 'author',
          select: 'account',
        },
      })
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
