import { Router } from 'express'
import * as user from '../controllers/user.js'
import * as auth from '../middlewares/auth.js'

const router = Router()

router.post('/', user.create)
router.post('/login', auth.login, auth.checkDailyReset, user.login)
router.get('/profile', auth.token, auth.checkIn, auth.checkDailyReset, user.profile)
router.get('/accountCount', auth.token, auth.admin, user.getAccountCount)
router.get('/allAccount', auth.token, auth.admin, user.getAllAccount)
router.get('/unlockedRecipes', auth.token, user.getUnlockedRecipes)
router.get('/todayPoints', auth.token, auth.admin, user.todayPoints)
router.get('/getUser', auth.token, user.getUser)
router.patch('/refresh', auth.token, user.refresh)
router.delete('/logout', auth.token, user.logout)

export default router
