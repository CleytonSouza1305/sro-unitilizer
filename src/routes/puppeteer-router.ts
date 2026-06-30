import { Router } from 'express'
import { allObjects, closeUnitilizer, dowloadUnitReq, getAvaliableUnit, getUnitilizer } from '../controllers/scrapper-controller.js'
import { authorizationByToken } from '../middleware/authorization-middleware.js'

const puppeteerRouter = Router()

puppeteerRouter.get('/scrapp', authorizationByToken, getUnitilizer)
puppeteerRouter.post('/scrapp/close', authorizationByToken, closeUnitilizer)
puppeteerRouter.get('/scrapp/objects', authorizationByToken, allObjects)
puppeteerRouter.get('/scrapp/unitilizers', authorizationByToken, getAvaliableUnit)
puppeteerRouter.post('/scrapp/unitilizers/dowload', authorizationByToken, dowloadUnitReq)

export default puppeteerRouter