import multer from 'multer'
import cloudinary from '../cloudinary/cloudinary.js'
import { CloudinaryStorage } from 'multer-storage-cloudinary'
import { StatusCodes } from 'http-status-codes'

// 設定上傳
const upload = multer({
  storage: new CloudinaryStorage({
    cloudinary,
  }),
  limits: {
    fileSize: 1024 * 1024,
  },
  // req = 請求資訊
  // file ＝ 檔案資訊
  // callback(錯誤, 是否允許上傳)
  fileFilter: (req, file, callback) => {
    if (['image/png', 'image/jpg', 'image/jpeg'].includes(file.mimetype)) {
      callback(null, true)
    } else {
      callback(null, false)
    }
  },
})

// 設定接收多個欄位
// upload.fields 接受一個陣列，定義每個欄位的名稱與最大數量
const uploadRecipe = upload.fields([
  { name: 'image', maxCount: 1 }, // 主圖：最多 1 張
  { name: 'stepImages', maxCount: 50 }, // 步驟圖：設定一個夠大的上限 (例如 50)
])

const uploadArticle = upload.fields([{ name: 'image', maxCount: 4 }])

const handleUpload = (middleware) => (req, res, next) => {
  middleware(req, res, (error) => {
    if (error) {
      // 建議：區分是 Multer 的錯誤 (如檔案太大) 還是其他錯誤
      if (error instanceof multer.MulterError) {
        let message = '上傳錯誤'
        if (error.code === 'LIMIT_FILE_SIZE') {
          message = '檔案太大 (限制 1MB)'
        } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
          message = '檔案欄位錯誤或是數量過多'
        }
        return res.status(StatusCodes.BAD_REQUEST).json({
          message,
          error: error.code,
        })
      }

      return res.status(StatusCodes.BAD_REQUEST).json({
        message: '上傳失敗',
        error: error.message,
      })
    }
    // 上傳成功
    next()
  })
}

export const recipe = handleUpload(uploadRecipe)
export const article = handleUpload(uploadArticle)
