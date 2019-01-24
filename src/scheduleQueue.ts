import * as Queue from "bull"
import * as cluster from "cluster"
import * as admin from "firebase-admin"
import * as PubSub from "@google-cloud/pubsub"
import { databaseURLPath, pubsubConfig, serviceAccountPath, storageBucket, prefix, idLength, MODE } from './config'
import { ScheduleEvent, EventResult } from "./model"
admin.initializeApp({
    credential: admin.credential.cert(serviceAccountPath),
    databaseURL: databaseURLPath,
    storageBucket: storageBucket
})
const settings = { timestampsInSnapshots: true }
admin.firestore().settings(settings)
import * as reviewMessageService from "./services/reviewMessageService"
import * as eventService from "./services/eventService"
import uuid = require("uuid");
const q = new Queue("system" + MODE, { redis: { port: 6379, host: '127.0.0.1', password: 'systemv2' } })
const numWorkers = 10

const pubsub = PubSub({ keyFilename: pubsubConfig.serviceAccountPath })

if (cluster.isMaster) {
    for (var i = 0; i < numWorkers; i++) {
        cluster.fork()
    }
    cluster.on('exit', function (worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died')
    })
} else {
    console.log(`bull server run !`)
    q.on("active", () => {
        console.log(`bull server active !`)
    })
    q.on("waiting", () => {
        console.log(`bull server waiting !`)
    })
    q.on("error", (error) => {
        console.log(`bull server error: ${error.message} !`)
    })
    q.on("failed", (error) => {
        console.log(`bull server fail !`)
    })

    q.process(async (job) => {
        console.log("Process", JSON.stringify(job.data, null, 4))
        const event: ScheduleEvent = job.data
        let reviewMessageInfo = await reviewMessageService.getReviewMessageById(event.id)
        if (reviewMessageInfo && reviewMessageInfo.state == 1) {
            let newEvent: EventResult = {
                id: uuid.v4(),
                messageId: [],
                content: reviewMessageInfo.content,
                urls: reviewMessageInfo.urls || [],
                channel: reviewMessageInfo.channel,
                sender: reviewMessageInfo.sender,
                // receivers: await reviewMessageService.getReviewMessageReceivers(reviewMessageInfo.id),
                timeStamp: new Date().getTime()
            }
            // console.log(JSON.stringify(newEvent, null, 4))
            await eventService.createEvent(newEvent)

            const receivers = await reviewMessageService.getReviewMessageReceivers(reviewMessageInfo.id)
            const memberCheckExecu = new Array<Promise<any>>()
            for (const receiver of await receivers)
                memberCheckExecu.push(eventService.createEventReceiver(newEvent.id, receiver))
            await Promise.all(memberCheckExecu)

            const data = Buffer.from(JSON.stringify({
                id: newEvent.id,
                timeStamp: newEvent.timeStamp
            }))
            await pubsub.topic(pubsubConfig.topicName).publisher().publish(data)
            reviewMessageInfo.state = 2
            await reviewMessageService.setReviewMessage(reviewMessageInfo)
        }

    })
}