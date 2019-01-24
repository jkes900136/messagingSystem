import { Router } from "express"
import * as PubSub from "@google-cloud/pubsub"
import { pubsubConfig, pubsubSwitch, PORT } from './config';
import { Event, PubSubEvent, Member, MessageTemplate, User, EventResult, Receiver } from './model'
import axios from "axios"
import * as eventService from './services/eventService'

import * as memberService from "./services/memberService"

import { v4 as uuidv4 } from "uuid"

const googlePubsub = PubSub({ keyFilename: pubsubConfig.serviceAccountPath });

const messageTopicName = pubsubConfig.topicName + pubsubConfig.messageTopicName
const router = Router()
router.post("/createEvent", async (req, res) => {
    console.log("===req.body.receiver===", req.body.receiver)
    let receivers: Member[] = req.body.receivers
    let updatePromise = new Array<Promise<any>>()

    let eventObj: Event = {
        id: uuidv4(),
        timeStamp: new Date().getTime(),
        receivers: receivers,
        sender: { id: "system", name: "system", email: "", role: "staff" },
        content: "",
        channel: "WeChat",
        urls: [],
        thumb: ""
    }
    let period = ""
    let location = ""
    let address = ""
    if (req.body.hasOwnProperty("sender")) {
        eventObj.sender = req.body.sender
    }
    if (req.body.hasOwnProperty("content")) {
        eventObj.content = req.body.content
    }
    if (req.body.hasOwnProperty("type")) {
        eventObj.type = req.body.type
    }
    if (req.body.hasOwnProperty("channel")) {
        eventObj.channel = req.body.channel
    }
    if (req.body.hasOwnProperty("urls")) {
        eventObj.urls = req.body.urls
    }
    if (req.body.hasOwnProperty("thumb")) {
        eventObj.thumb = req.body.thumb
    }
    if (req.body.hasOwnProperty("period")) {
        period = req.body.period
    }
    if (req.body.hasOwnProperty("location")) {
        location = req.body.location
    }
    if (req.body.hasOwnProperty("address")) {
        address = req.body.address
    }
    console.log("===eventObj===", JSON.stringify(eventObj, null, 4))

    receivers.forEach(async receiver => {
        if (receiver.hasOwnProperty("groupId")) {
            receiver['id'] = receiver.groupId
        }
        const memberSnapshot = await memberService.getMemberByIdAndName(receiver.id, receiver.name)
        if (memberSnapshot.empty) {

            const newMember: Member = {
                ...receiver
            }
            if (!newMember.hasOwnProperty("id")) {
                if (!newMember.id || newMember.id == "") {
                    newMember.id = uuidv4()
                }
            }

            if (receiver.hasOwnProperty('mobilePhone')) {
                updatePromise.push(memberService.setMember(newMember).then(() => console.log("===create member success===")))
            }
        } else {
            // const newMember: Member = {
            //     ...message,
            //     id: memberSnapshot.docs[0].data().id,
            //     division: memberSnapshot.docs[0].data().division,
            //     department: memberSnapshot.docs[0].data().department,
            //     lineId: memberSnapshot.docs[0].data().lineId,
            //     wechatId: memberSnapshot.docs[0].data().wechatId,
            //     email: memberSnapshot.docs[0].data().email,
            //     mobilePhone: memberSnapshot.docs[0].data().mobilePhone,                   
            // }
            // updatePromise.push(memberService.updateMember(newMember).then(() => console.log("===update member success===")))
            console.log("== member exist===")
        }
    })
    await Promise.all(updatePromise).then(updateRes => {
        eventService.createEvent(eventObj).then(async () => {
            let eventArray: Array<Promise<any>> = []
            await Promise.all(eventArray)
            // messagePub(eventObj.id)
            res.status(200).send(eventObj.id)
        })
    }).catch(error => {
        console.log(error)
        res.sendStatus(403)
    })

})
router.post("/publish", async (req, res) => {
    if (req.body.hasOwnProperty("id")) {
        console.log("messagePub:", req.body.id)
        messagePub(req.body.id)
        res.sendStatus(200)
    } else {
        res.sendStatus(403)
    }
})
const messagePub = (id: string) => {
    let data: PubSubEvent = {
        id: id,
        timeStamp: new Date().getTime()
    }
    console.log("===messagePub data===", data)
    const dataBuffer = Buffer.from(JSON.stringify(data));
    googlePubsub.topic(messageTopicName).publisher().publish(dataBuffer)
    console.log("===messagePub success===")
}
if (pubsubSwitch) {
    const messageSubscription = googlePubsub.subscription(pubsubConfig.subName + pubsubConfig.messageSubName);
    messageSubscription.on('message', async messageSub => {
        let event: PubSubEvent = JSON.parse(Buffer.from(messageSub.data, 'base64').toString())
        console.log("=====message Subscription==========", event)
        if (event.hasOwnProperty('id')) {
            console.log("event", event)
            let messages: MessageTemplate = { content: "", id: "", title: "", channel: "Line", urls: [], thumb: "", type: "text" }

            let eventData = await eventService.getEvent(event.id)

            const receivers: Receiver[] = await eventService.getEventServices(event.id)
            let sender: User = {
                id: "system",
                name: "系統",
                email: "admin@gmail.com",
                role: "staff"
            }
            // if (eventData.messageId) {
            // let messageSnapShots = await messageService.getMessageTemplate(eventData.messageId)
            // if (messageSnapShots.exists) {
            messages = {
                id: "",
                title: "",
                content: "",
                urls: [],
                thumb: "",

                channel: eventData.channel as MessageTemplate['channel'],
                type: ""
            }
            if (eventData.hasOwnProperty("content") && eventData.content != "") {
                messages.content = eventData.content
            }
            if (eventData.hasOwnProperty("type") && eventData.type != "") {
                messages.type = eventData.type
            }
            if (eventData.hasOwnProperty("sender")) {
                if (eventData.sender.hasOwnProperty("id")) {
                    sender = eventData.sender
                } else {
                    sender.name = eventData.sender.toString()
                }
            }
            if (eventData.hasOwnProperty("urls")) {
                messages.urls = eventData.urls
            }
            if (eventData.hasOwnProperty("thumb")) {
                messages.thumb = eventData.thumb
            }
            // }
            // }
            console.log("===messages===", messages)

            // const itemData = await workService.getItemById(eventData.workId, eventData.taskId, eventData.itemId)
            // if (itemData && itemData.length > 0) {
            axios.post(`http://localhost:${PORT}/push/pushMessage`, {
                sender: sender,
                messageObj: messages ? messages : "",
                receivers: receivers
            }).then(success => {
                console.log("======Message Send Success==========", success.data)
            }).catch(err => {
                console.log("======Message Send Err==========", err)
            })
            // } else {
            // }

        } else if (event.hasOwnProperty('receivers')) {
        }
        messageSub.ack()
    })
}

export default router