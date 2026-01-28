import { Router } from 'express'
import * as mission from '../controllers/mission.js'
import * as auth from '../middlewares/auth.js'

const router = Router()

router.post('/', auth.token, auth.admin, mission.createMission)
router.get('/', auth.token, mission.getMission)
router.get('/all', auth.token, auth.admin, mission.getAllMission)
router.patch('/updateMission/:id', auth.token, auth.admin, mission.updateMission)

export default router
