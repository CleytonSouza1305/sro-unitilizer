import { Router } from 'express'
import { getUnitilizer } from '../controllers/scrapper-controller'

const puppeteerRouter = Router()

puppeteerRouter.get('/scrapp', getUnitilizer)

export default puppeteerRouter