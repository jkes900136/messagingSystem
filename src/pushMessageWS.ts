import { Router } from "express"
import * as messageRecordService from "./services/messageRecordService"
import * as memberService from "./services/memberService"
import { pushMessage as pushLineMessage, toPersonMessage, toLineTextMessage } from "./services/lineService"
import { pushTemplateMessages as pushWechatMessages, pushCustomMessage, toTemplateMessagesMQ, toCustomTextMessage } from "./services/wechatService"
import { pushMessage as pushSMSMessage, toSMSMessage } from "./services/smsService"
import { pushMessage as pushEmailMessage, getEmailFiles, toEmailMessage } from "./services/emailService"
import { Receiver, Member,  RecordDetail, ChatMessage,  MessageTemplate } from "./model"
import * as  chatMessageService from './services/chatMessageService'

import { backendUrl, idLength } from "./config"
import { resolve } from "path";

const router = Router()
router.post("/pushMessage", async (req, res, next) => {
    const sender: Member = req.body.sender

    const receivers: Receiver[] = req.body.receivers
    const messageTemplate: MessageTemplate = req.body.messageObj

    let content: string = ""

    let storageUrls: MessageTemplate["urls"] = []
    let thumb: string = ""
    if (req.body.hasOwnProperty("messageObj")) {
        content = req.body.messageObj.content

        if (req.body.messageObj.hasOwnProperty("urls")) {
            storageUrls = req.body.messageObj.urls
        }
        if (req.body.messageObj.hasOwnProperty("thumb")) {
            thumb = req.body.messageObj.thumb
        }
    }
    let messageRecord = {
        id: messageRecordService.getMessageRecordUUID(),
        sendCount: 0,
        successCount: 0,
        type: "text"
    }

    const pushMessagePromises = new Array<Promise<any>>()
    if (sender.path)
        sender.path = `(${sender.path})\n`


    for (const receiver of receivers) {
        memberService.getMemberById(receiver.id).then(async member => {
            let formatedContent = content
            if (receiver.hasOwnProperty("data")) {
                if (receiver.data instanceof Array) {
                    for (let datum of receiver.data) {
                        if (receiver.hasOwnProperty("name")) {
                            datum['name'] = member.name
                        }
                        formatedContent = formatContentByMQ(content, datum)
                    }
                } else {
                    // if (receiver.hasOwnProperty("name")) {
                    //     receiver.data['name'] = member.name
                    // }
                    // formatedContent = formatContentByMQ(content, receiver.data)
                }
            }
            if (req.body.hasOwnProperty("item")) {
                formatedContent = formatItemContentByMQ(formatedContent, req.body.item.data)
                formatedContent = formatedContent.replace(/{{item}}/g, req.body.item.name || "")
            } else {

            }

            if (messageTemplate.channel == "WeChat") {
                if (member.wechatId && member.wechatId !== "") {
                    // const trackId = messageRecordService.getRecordDetailUUID(messageRecord.id)
                    const wechatMessages = toTemplateMessagesMQ(sender, member.wechatId, formatedContent, storageUrls, thumb)
                    if (wechatMessages) {
                        messageRecord.sendCount += 1
                        pushMessagePromises.push(
                            pushWechatMessages(wechatMessages)
                                .then(() => {
                                    messageRecord.successCount += 1
                                    return createChatMessage(sender, member, messageTemplate.channel, formatedContent, storageUrls, thumb)

                                })
                                .catch(() => {
                                    return resolve()
                                })
                        )
                    }
                }
            }

            if (messageTemplate.channel == "Line") {
                // if (receiver.hasOwnProperty("groupId")) {
                //     member['lineId'] = receiver.groupId
                // }
                if (member.lineId && member.lineId !== "") {
                    // if (receiver.lineId.substring(0, 1) == "U") {
                    // const trackId = messageRecordService.getRecordDetailUUID(messageRecord.id)
                    const lineMessage = toPersonMessage(sender, formatedContent, storageUrls, thumb, messageTemplate.type)
                    if (lineMessage) {
                        messageRecord.sendCount += 1
                        // console.log("lineMessage:", JSON.stringify(lineMessage, null, 4))
                        pushMessagePromises.push(
                            pushLineMessage(member.lineId, lineMessage)
                                .then(() => {
                                    messageRecord.successCount += 1
                                    return createChatMessage(sender, member, messageTemplate.channel, formatedContent, storageUrls, thumb)
                                })
                                .catch(() => {
                                    return resolve()
                                })
                        )
                    }
                    // }
                }
            }
            if (messageTemplate.channel == "SMS") {
                const trackId = messageRecordService.getRecordDetailUUID(messageRecord.id)
                let smsMessage = toSMSMessage(sender, formatedContent)


                if (member.mobilePhone && smsMessage) {
                    messageRecord.sendCount += 1
                    pushMessagePromises.push(
                        pushSMSMessage(member.mobilePhone, smsMessage)
                            .then(() => {
                                messageRecord.successCount += 1
                                return resolve()
                            })
                            .catch(() => {
                                return resolve()
                            })
                    )
                }
            }

            if (messageTemplate.channel == "Email") {
                const emailFiles = await getEmailFiles([])
                const trackId = messageRecordService.getRecordDetailUUID(messageRecord.id)

                const emailmessage = await toEmailMessage(sender, formatedContent, messageRecord.id + trackId, emailFiles)

                if (member.email && emailmessage) {
                    messageRecord.sendCount += 1
                    pushMessagePromises.push(
                        pushEmailMessage(member.email, emailmessage)
                            .then(() => {
                                messageRecord.successCount += 1
                                return resolve()
                            })
                            .catch(() => {
                                return resolve()
                            })
                    )
                }
            }
        })
    }
    await Promise.all(pushMessagePromises).then(result => {
    }).catch(error => {
        console.log(error)
        // res.sendStatus(500)
    })
    res.sendStatus(200)
})
router.post("/replyMessage", async (req, res, next) => {
    const receiver = req.body.receiver as Member
    const message = req.body.message as string
    let storageUrls: MessageTemplate["urls"] = []
    const staff = req.body.staff as Member
    const channel = req.body.channel
    if (req.body.hasOwnProperty("urls")) {
        storageUrls = req.body.urls
    }
    console.log("receiver:", receiver)
    console.log("message:", message)
    console.log("staff:", staff)
    console.log("channel:", channel)
    const pushMessagePromises = new Array<Promise<any>>()
    if (receiver && receiver != null) {
        // let channel = ""
        if (channel == "WeChat") {
            const wechatMessages = toCustomTextMessage(receiver, message)
            pushMessagePromises.push(pushCustomMessage(wechatMessages))
            // const wechatMessages = toTemplateMessagesMQ(staff, receiver.wechatId, message, storageUrls, "")
            // pushMessagePromises.push(pushWechatMessages(wechatMessages))

        } else if (channel == "Line") {
            let lineMessage = []
            if (message != "") {
                lineMessage.push(toLineTextMessage(staff, message))
            }
            if (storageUrls.length > 0) {
                lineMessage = lineMessage.concat(toPersonMessage(staff, "", storageUrls, ""))
            }
            if (lineMessage.length > 0) {
                pushMessagePromises.push(pushLineMessage(receiver.lineId, lineMessage))
            }
            // channel = "Line"
        }
        await Promise.all(pushMessagePromises).then(result => {
            // console.log(JSON.stringify(result, null, 4))
            createChatMessage(staff, receiver, channel, message, storageUrls, "")
            res.sendStatus(200)
        }).catch(error => {
            console.log(error)
            res.sendStatus(403)
        })
  
    } else {
        res.sendStatus(403)
    }
})
const formatContentByMQ = (message: string, data: any): string => {
    let content = message
    for (const key in data) {
        const regex = new RegExp("{{" + key + "}}", "g")
        const tmp = data[key]
        if (typeof tmp == "number")
            content = content.replace(regex, numberWithCommas(data[key]))
        else
            content = content.replace(regex, tmp)
    }
    return content
}
const formatItemContentByMQ = (message: string, data: any): string => {
    let content = message
    for (const key in data) {
        const regex = new RegExp("{{" + key + "}}", "g")
        const tmp = data[key]
        if (typeof tmp == "number")
            content = content.replace(regex, numberWithCommas(data[key]))
        else
            content = content.replace(regex, tmp)
    }
    return content
}


const createChatMessage = async (staff: Member, receiver: Member, channel: string, message: string, storageUrls: MessageTemplate["urls"], thumb: string) => {
    // let memberSnapShot = await memberService.getMemberByAnyId(receiver)
    // if (!memberSnapShot.empty) {

    let userMessage: ChatMessage = {
        id: receiver.id
        
    }
    if (channel == "Line") {
        userMessage.id = receiver.lineId
    } else if (channel == "WeChat") {
        userMessage.id = receiver.wechatId
    }

    await chatMessageService.setChatMessage(userMessage)
    const trackId = chatMessageService.getRecordDetailUUID(userMessage.id)
    const recordDetail: RecordDetail = {
        id: trackId,
        receiver: receiver,
        channel: channel as MessageTemplate['channel'],
        message: message.replace(/\n/g, "\\n"),
        urls: storageUrls || [],
        thumb: thumb || "",
        isSucceed: true,
        receiveTime: new Date().getTime(),
        read: true
    }

    return chatMessageService.setRecordDetail(userMessage.id, recordDetail)
    // }
}
const getURLfromString = (message: string): string[] => {
    const urlWithParamRegex = new RegExp(/[-\w@:%\+.~#?&/=]{2,256}\.[a-z]{2,4}([\/?&/@:%\+.~#=][-\w]*)*/gi)
    // const regex = new RegExp(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi)
    return urlWithParamRegex.exec(message)
}
const numberWithCommas = (x) => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

export default router