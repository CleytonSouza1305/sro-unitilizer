import { Router } from 'express'
import { allObjects, closeUnitilizer, getUnitilizer } from '../controllers/scrapper-controller.js'
import { authorizationByToken } from '../middleware/authorization-middleware.js'

const puppeteerRouter = Router()

puppeteerRouter.get('/scrapp', authorizationByToken, getUnitilizer)
puppeteerRouter.post('/scrapp/close', authorizationByToken, closeUnitilizer)
puppeteerRouter.get('/scrapp/objects', authorizationByToken, allObjects)

export default puppeteerRouter