import { Router } from 'express'
import { getUnitilizer } from '../controllers/scrapper-controller'
import { authorizationByToken } from '../middleware/authorization-middleware'

const puppeteerRouter = Router()

puppeteerRouter.get('/scrapp', authorizationByToken, getUnitilizer)

export default puppeteerRouter