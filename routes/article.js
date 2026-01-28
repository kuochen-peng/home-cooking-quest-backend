import { Router } from 'express'
import * as article from '../controllers/article.js'
import * as auth from '../middlewares/auth.js'
import * as upload from '../middlewares/upload.js'

const router = Router()

router.post('/', auth.token, upload.article, article.createArticle)
router.get('/all', article.getAllArticle)
router.patch('/updateArticle/:id', auth.token, upload.article, article.updateArticle)
router.patch('/likeArticle/:id', auth.token, article.likeArticle)
router.delete('/deleteArticle/:id', auth.token, article.deleteArticle)

export default router
