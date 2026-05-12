import express from 'express'
import cors from 'cors'
import { errorMiddleware } from './middleware/error-handler'

const app = express()

app.use(cors())
app.use(express.json())

app.use(errorMiddleware)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`App running on port: ${PORT}`))