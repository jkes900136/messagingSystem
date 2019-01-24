import { Router } from "express"
import * as Line from "@line/bot-sdk"
import * as config from "./config"
// import * as Moment from "moment"
import * as Moment from "moment-timezone"

const groupId = config.healthReportGroupId

const lineClient = new Line.Client(config.LINE)
const router = Router()

router.post("/healthReport", async (req, res) => {
    const event = req.body
    const serviceName = event.incident.policy_name
    const serviceState = event.incident.state == "closed" ? "正常" : "異常"
    let eventTime = new Date(event.incident.started_at * 1000)
    eventTime.setHours(eventTime.getHours() + 8)
    const time = Moment(eventTime)
    // const eventTime = Moment((event.incident.started_at + 8 * 60 * 60) * 1000)

    console.log(JSON.stringify(event, null, 4))

    lineClient.pushMessage(groupId, {
        type: "text",
        text: "系統警示\n"
            + `${time.format("YYYY-MM-DD hh:mm:ss")}\n\n`
            + `服務名稱：${serviceName}\n`
            + `服務狀態：${serviceState}`
    })

    res.sendStatus(200)
})

router.get("/report", (req, res) => {
    let eventTime = new Date()
    const time = Moment(eventTime)
    lineClient.pushMessage(groupId, {
        type: "text",
        text: "系統警示\n"
            + `${time.format("YYYY-MM-DD hh:mm:ss")}\n\n`
            + `服務名稱：Dialogflow\n`
            + `服務狀態：正常`
    })


    res.sendStatus(200)

})

export default router