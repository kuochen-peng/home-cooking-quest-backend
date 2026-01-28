import { Router } from 'express'
import * as recipe from '../controllers/recipe.js'
import * as auth from '../middlewares/auth.js'
import * as upload from '../middlewares/upload.js'

const router = Router()

router.post('/', auth.token, auth.admin, upload.recipe, recipe.createRecipe)
router.get('/public', recipe.getPublicRecipes)
router.get('/all', auth.token, auth.admin, recipe.getAllRecipe)
router.get('/my', auth.token, recipe.getMyRecipes)
router.get('/allRecipeNumber', auth.token, auth.admin, recipe.getAllRecipeNumber)
router.get('/:id', recipe.getRecipeInfo)
router.patch('/unlock/:id', auth.token, recipe.unlockRecipe)
router.patch('/:id', auth.token, upload.recipe, recipe.updateRecipe)
router.patch('/bookmark/:id', auth.token, recipe.bookmark)

export default router
