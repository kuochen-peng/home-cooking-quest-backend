import { Router } from 'express'
import * as comment from '../controllers/comment.js'
import * as auth from '../middlewares/auth.js'

const router = Router()

router.post('/', auth.token, comment.createComment)
router.get('/all', auth.token, auth.admin, comment.getAllComment)
router.get('/recipe/:id', comment.getRecipeComment)
router.get('/article/:id', comment.getArticleComment)
router.patch('/updateComment/:id', auth.token, comment.updateComment)
router.patch('/:id', auth.token, comment.toggleLike)
router.delete('/deleteComment/:id', auth.token, auth.admin, comment.deleteComment)

export default router
