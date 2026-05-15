import { config } from "dotenv";
import express from 'express'
import cors from 'cors'
import { errorMiddleware } from './middleware/error-handler'
import puppeteerRouter from './routes/puppeteer-router'
import authRouter from "./routes/auth-router";
config()

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api', puppeteerRouter)
app.use('/api/auth', authRouter)

app.use(errorMiddleware)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`App running on port: ${PORT}`))