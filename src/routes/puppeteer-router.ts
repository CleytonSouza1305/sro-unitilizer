import { Router } from 'express'
import { closeUnitilizer, getUnitilizer } from '../controllers/scrapper-controller'
import { authorizationByToken } from '../middleware/authorization-middleware'

const puppeteerRouter = Router()

puppeteerRouter.get('/scrapp', authorizationByToken, getUnitilizer)
puppeteerRouter.post('/scrapp/close', authorizationByToken, closeUnitilizer)

export default puppeteerRouter