import { Router } from "express"
import { v4 as uuidv4 } from "uuid"
import * as PubSub from "@google-cloud/pubsub"
import * as Moment from "moment-timezone"
import * as Queue from "bull"
import * as reviewMessageService from "./services/reviewMessageService"
import * as eventService from "./services/eventService"

import { User, ReviewMessage, Receiver, EventResult } from "./model"
import { pubsubConfig, MODE } from './config'
const queue = new Queue("system" + MODE, { redis: { port: 6379, host: '127.0.0.1', password: 'systemv2' } })
const pubsub = PubSub({ keyFilename: pubsubConfig.serviceAccountPath })
const router = Router()
router.post("/createReviewMessage", async (req, res) => {
    let reviewMessage = req.body as ReviewMessage & { receivers: Receiver[] } //{ receivers: { id: string, data: any[] }[] }
    if (reviewMessage) {
        const now = new Date().getTime()
        if (reviewMessage.expectTime > now) {
            const newReviewMessage = {
                id: uuidv4(),
                state: 0,
                content: reviewMessage.content,
                channel: reviewMessage.channel,
                sender: reviewMessage.sender,
                expectTime: reviewMessage.expectTime,
                urls: reviewMessage.urls,
                type: reviewMessage.type,
                auditor: null,
                receiverCount: reviewMessage.receivers.length
            } as ReviewMessage

            await reviewMessageService.createReviewMessage(newReviewMessage).then(async success => {

                const promiseArr = new Array<Promise<any>>()
                for (let index = 0; index < reviewMessage.receivers.length; index++) {
                    let receiver = reviewMessage.receivers[index]
                    receiver['index'] = index + 1
                    promiseArr.push(reviewMessageService.createReviewMessageReceivers(newReviewMessage.id, receiver))
                }

                await Promise.all(promiseArr)

                res.sendStatus(200)
            }).catch(err => {
                res.sendStatus(403)
            })

            // for (let index = 0; index < 50; index++) {
            //     newReviewMessage.id = uuidv4()
            //     await reviewMessageService.createReviewMessage(newReviewMessage).then(async success => {

            //         const promiseArr = new Array<Promise<any>>()
            //         for (const receiver of reviewMessage.receivers)
            //             promiseArr.push(reviewMessageService.createReviewMessageReceivers(newReviewMessage.id, receiver))

            //         await Promise.all(promiseArr)

            //     }).catch(err => {
            //         res.sendStatus(403)
            //     })
            // }
            // res.sendStatus(200)
        } else
            res.status(403).send("The expect time is over")
    } else {
        res.sendStatus(403)
    }

})
router.post("/updateReviewMessage", async (req, res) => {
    const reviewMessageUpload = req.body as ReviewMessage
    console.log(JSON.stringify(reviewMessageUpload, null, 4))

    if (reviewMessageUpload && reviewMessageUpload != null) {

        const newReviewMessage: ReviewMessage = {
            ...reviewMessageUpload
        }
        await reviewMessageService.setReviewMessage(newReviewMessage).then(success => {
            res.sendStatus(200)
        }).catch(err => {
            res.sendStatus(403)
        })

    } else {
        res.sendStatus(403)
    }

})
router.put("/updateReviewMessageState/:reviewMessageId/:state", async (req, res) => {
    const id = req.params.reviewMessageId as string
    const state = parseInt(req.params.state)
    let reviewMessage = await reviewMessageService.getReviewMessageById(id)
    if (reviewMessage) {
        let newReviewMessage = {
            id, state
        } as ReviewMessage
        await reviewMessageService.setReviewMessage(newReviewMessage)
        res.sendStatus(200)
    } else
        res.sendStatus(403)
})
router.delete("/deleteReviewMessage/:reviewMessageId", async (req, res) => {
    const id = req.params.reviewMessageId as string
    await reviewMessageService.deleteReviewMessage(id).then(success => {
        res.sendStatus(200)
    }).catch(err => {
        res.sendStatus(403)
    })
})
router.post("/reject/:reviewMessageId", async (req, res) => {
    const id = req.params.reviewMessageId as string
    const author: User = req["user"]
    let reviewMessage = await reviewMessageService.getReviewMessageById(id)
    if (reviewMessage) {
        let newReviewMessage = {
            id: reviewMessage.id,
            state: 3,
            auditor: author
        } as ReviewMessage

        await reviewMessageService.setReviewMessage(newReviewMessage)
        res.sendStatus(200)
    } else
        res.sendStatus(403)
})
router.post("/agree/:reviewMessageId", async (req, res) => {
    const id = req.params.reviewMessageId as string
    const author: User = req["user"]
    let reviewMessage = await reviewMessageService.getReviewMessageById(id)
    if (reviewMessage) {

        let newReviewMessage = {
            id: reviewMessage.id,
            state: 1,
            auditor: author
        } as ReviewMessage

        await reviewMessageService.setReviewMessage(newReviewMessage).then(async success => {
            // const moment = Moment(newReviewMessage.expectTime, "yyyy-MM-DD HH:mm:ss").tz("Asia/Taipei")
            const moment = Moment(reviewMessage.expectTime)//.tz("Asia/Taipei")
            const ss = 0//moment.second()
            const mm = moment.minute()
            const hh = moment.hour()
            const dd = moment.date()
            const mon = moment.month() + 1
            const yy = moment.year()

            const cron = ss + " " + mm + " " + hh + " " + dd + " " + mon + " * " + yy

            console.log(cron)
            if (reviewMessage.type.toLowerCase() == "delay") {
                const result = await queue.add({
                    id: reviewMessage.id,
                    timeStamp: new Date().getTime()
                }, { // 秒 分 時 日 月 年
                        repeat: { cron: cron },
                        jobId: reviewMessage.id//uuidv4()
                    })
            } else if (reviewMessage.type.toLowerCase() == "immediate") {
                let newEvent: EventResult = {
                    id: uuidv4(),
                    messageId: [],
                    content: reviewMessage.content,
                    urls: reviewMessage.urls || [],
                    channel: reviewMessage.channel,
                    sender: reviewMessage.sender,
                    // receivers: await reviewMessageService.getReviewMessageReceivers(reviewMessage.id),
                    timeStamp: new Date().getTime()
                }

                await eventService.createEvent(newEvent)
                const receivers = await reviewMessageService.getReviewMessageReceivers(reviewMessage.id)
                const memberCheckExecu = new Array<Promise<any>>()
                for (const receiver of await receivers)
                    memberCheckExecu.push(eventService.createEventReceiver(newEvent.id, receiver))
                await Promise.all(memberCheckExecu)


                const data = Buffer.from(JSON.stringify({
                    id: newEvent.id,
                    timeStamp: newEvent.timeStamp
                }))
                await pubsub.topic(pubsubConfig.topicName).publisher().publish(data)
                newReviewMessage.state = 2
                await reviewMessageService.setReviewMessage(newReviewMessage)
            }
            res.status(200).send(cron)
        }).catch(err => {
            res.sendStatus(403)
        })
    } else {
        res.sendStatus(403)
    }
})
export default router