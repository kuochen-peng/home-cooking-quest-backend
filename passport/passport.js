import passport from 'passport'
import passportLocal from 'passport-local'
import passportJWT from 'passport-jwt'
import bcrypt from 'bcrypt'
import User from '../models/user.js'

// 驗證策略定義自己的驗證方式
// passport.use(驗證方式, 驗證策略(策略設定, 策略執行後處理))
// passportLocal 帳號密碼驗證策略，檢查帳號密碼欄位有沒有值
passport.use(
  'login',
  new passportLocal.Strategy(
    {
      // 設定檢查欄位名稱
      usernameField: 'account', // 預設：username
      passwordField: 'password', // 預設：password
    },
    // 檢查完後的處理
    // done = 驗證方式執行完成，把結果帶到下一步 => (錯誤, 驗證結果, info)
    async (account, password, done) => {
      try {
        // 檢查帳號密碼
        const user = await User.findOne({ account }).orFail(new Error('帳號不存在'))
        const match = await bcrypt.compare(password, user.password)
        if (!match) {
          throw new Error('密碼錯誤')
        }
        // 驗證成功，下一步
        done(null, user)
      } catch (error) {
        // 驗證錯誤，下一步
        done(error)
      }
    },
  ),
)

passport.use(
  'jwt',
  new passportJWT.Strategy(
    {
      jwtFromRequest: passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET,
      // 將 req 傳入下面 function
      passReqToCallback: true,
      // 忽略過期檢查 => 允許過期的 jwt
      ignoreExpiration: true,
    },
    // req => 設定 passReqToCallback 才能用 => 套件不提供原有的 jwt，要自取
    // payload = jwt 內容
    async (req, payload, done) => {
      try {
        // 從 req 取 token
        const token = passportJWT.ExtractJwt.fromAuthHeaderAsBearerToken()(req)
        // 手動檢查過期
        const expired = payload.exp * 1000 < Date.now()
        // 請求路徑
        const url = req.baseUrl + req.path
        if (expired && url !== '/user/refresh' && url !== '/user/logout') {
          throw new Error('')
        }
        // 檢查使用者是否存在，且有這個 token
        const user = await User.findOne({ _id: payload._id, tokens: token }).orFail(
          new Error('USER'),
        )

        // 驗證成功，下一步
        done(null, { user, token })
      } catch (error) {
        // 驗證失敗，錯誤帶到下一步
        done(error)
      }
    },
  ),
)
