import { jsonToStructProto, structProtoToJson } from './structjson'
import * as responseConfig from './responseConfig'
import * as config from './config'
import * as memberService from "./services/memberService"
import * as lineServices from "./services/lineService"
import { pushMessage } from './services/chatbotService'
import { ChatMessage, Member, RecordDetail, MessageTemplate } from './model';
import * as  chatMessageService from './services/chatMessageService'
const userRegistration = (lineId: string): Promise<any> => {
    let uri = config.uriName + "lineLogin?target=login"
    if (lineId.length == config.idLength.WECHAT) {
        uri = config.uriName + "wechatLogin?target=loginWechat"
    }
    let message = {
        type: "template",
        altText: `歡迎使用《${config.appName}》`,
        template: {
            type: "buttons",
            title: `歡迎使用《${config.appName}》`,
            text: `請點選<登入>，經身份認證後，授權您使用《${config.appName}》`,
            actions: [
                {
                    type: "uri",
                    label: "登入",
                    uri: uri
                }
            ]
        }
    }

    return pushMessage(lineId, message)
}

const unMatchOnce = (lineId: string): Promise<any> => {
    let message = { type: "text", text: "我不太了解您的指令，請再說一次" }
    return pushMessage(lineId, message)
}

const unMatchTwice = (lineId: string): Promise<any> => {
    let message = [{ type: "text", text: "我不太了解您的指令，請再說一次，或以下列主選單操作" }, JSON.parse(responseConfig.mainMenu)]
    return pushMessage(lineId, message)
}

const dialogFlowError = (lineId: string): Promise<any> => {
    let message = { type: "text", text: "系統忙碌中，請稍後再試" }
    return pushMessage(lineId, message)
}

const menuAction = async (lineId, dialogflowResult): Promise<any> => {
    const parameters = structProtoToJson(dialogflowResult.parameters)
    const instruction = parameters["instruction"]
    let lineMsg

    if (responseConfig[instruction] != undefined) {
        // sendToBigQuery(lineId, userName, divsionName, `menu:${instruction}`)
        lineMsg = JSON.parse(responseConfig[instruction])
        return pushMessage(lineId, lineMsg)

    } else {
        console.log("responseConfig[instruction] is undefined")
    }
}

const dialogflowFulfillmentText = async (userId, dialogflowResult): Promise<any> => {
    // should set response from dialogflow 
    let speech = ""
    let msg = {
        type: "text",
        text: ""
    }
    if (dialogflowResult.fulfillmentText != undefined) {
        speech = dialogflowResult.fulfillmentText.replace(/\\n/g, "\n");
    }
    let qText: string = dialogflowResult.queryText
    let memberSnapShot = await memberService.getMemberByAnyId(userId)
    if (!memberSnapShot.empty) {
        let memberData: Member = memberSnapShot.docs[0].data() as Member
        // if (receiverData.type == "member") {
        let memberUpdateData: Member = { ...memberData, session: "recent" }
        await memberService.setMember(memberUpdateData)

        let userMessage: ChatMessage = {
            id: userId,
            sender: memberSnapShot.docs[0].data() as Member
        }

        await chatMessageService.setChatMessage(userMessage)
        let channel = ""
        if (userId.length == config.idLength.LINE) {
            channel = "Line"
        } else if (userId.length == config.idLength.WECHAT) {
            channel = "WeChat"
        }
        const trackId = chatMessageService.getRecordDetailUUID(userMessage.id)
        const recordDetail: RecordDetail = {
            id: trackId,
            receiver: { id: "system", name: "", email: "", mobilePhone: "", lineId: "", wechatId: "", role: "staff", unReadMessages: 0 },
            channel: channel as MessageTemplate['channel'],
            message: qText.replace(/\n/g, "\\n"),
            isSucceed: true,
            receiveTime: new Date().getTime(),
            read: false
        }
        // const lineMessage = lineServices.toPersonMessage(memberSnapShot.docs[0].data() as Member, "system", `${userMessage.sender.name}留言通知\nhttps://messagingsystem-218402.firebaseapp.com/connect/${userId}`, [])
        // pushMessage("Uea40f2abaf004484ff382dcdaf1a3a94", lineMessage).catch(err => {
        //     console.log("err:", err)
        // })
        // const wechatMessages = toTemplateMessages(memberSnapShot.docs[0].data() as Member, "system", { id: "system", name: "", email: "", mobilePhone: "", lineId: "", wechatId: "ov3qV1fHPnVuEihyiKTVODNofGF4", role: "staff" }, `${userMessage.sender.name}留言通知\nhttps://messagingsystem-218402.firebaseapp.com/connect/${userId}`, [])
        // pushTemplateMessages(wechatMessages).catch(err => {
        //     console.log("err:", err)
        // })
        // if (qText == "參加") {
        //     msg.text = "學長您好！已收到您的回覆，謝謝您！"

        //     await pushMessage(userId, msg).then(success=>{
        //          chatMessageService.createChatMessage(recordDetail.receiver, memberSnapShot.docs[0].data() as Member, channel, msg.text, [], "")
        //     })
        // } else if (qText == "不克參加") {
        //     msg.text = "學長您好！謝謝您的回覆，期待下次您的參與！"
        //     await pushMessage(userId, msg).then(success=>{
        //         chatMessageService.createChatMessage(recordDetail.receiver, memberSnapShot.docs[0].data() as Member, channel, msg.text, [], "")
        //    })
        // }

        return chatMessageService.setRecordDetail(userMessage.id, recordDetail)
        // }
    }

    if (speech.length > 0) {
        // msg.text = speech
        // msg.text = "我不太了解您的指令，請再說一次"
    } else {
        msg.text = "我不太了解您的指令，請再說一次"
    }
    if (msg.text != "") {
        return pushMessage(userId, msg)
    } else {
        return Promise.resolve()
    }
}

export const actionSubscriber = async (lineId: string, action: string, dataResult: any) => {
    // dataResult from dialogflow result or postback data

    let lineMessage = new Array
    const response = dataResult.fulfillmentText
    const parameters: any = structProtoToJson(dataResult.parameters)
    // let results = getResultFromParameters(parameters)
    const userId = lineId
    // sendToBigQuery(lineId, userName, divsionName, action)
    console.log(`[${dataResult.queryText}] matches [${action}] in actionSubscriber`)
    // console.log(JSON.stringify(dataResult, null, 2))
    switch (action) {
        case 'userRegistration':
            return userRegistration(lineId).catch(error => console.log("%s userRegistration error:", lineId, error))

        case 'unMatchOnce':
            return unMatchOnce(lineId).catch(error => console.log("%s unMatchOnce error:", lineId, error))

        case 'unMatchTwice':
            return unMatchTwice(lineId).catch(error => console.log("%s unMatchTwice error:", lineId, error))

        case 'dialogFlowError':
            return dialogFlowError(lineId).catch(error => console.log("%s dialogFlowError error:", lineId, error))

        case 'menu':
            return menuAction(lineId, dataResult).catch(error => console.log("%s menuAction error:", lineId, error))
        case 'flightInfo':
            lineMessage.push(lineServices.textMessage("我們已收到您的回覆"))
            // setDialogflowEvent(userId, "askForDepartDate", {})
            break
        case 'attend':
            lineMessage.push(lineServices.textMessage("感謝您的參與，稍後將與您聯繫"))
            break
        case 'absent':
            lineMessage.push(lineServices.textMessage("感謝您的回覆，期待您下次的參與"))
            break
        case "askForDepartDate":

            lineMessage.push(lineServices.textMessage(response))

            break
        case "askForDepartFlight":
            lineMessage.push(lineServices.textMessage(response))
            break
        case "askForDepartPlace":
            lineMessage.push(lineServices.textMessage(response))
            break
        case "askForDepartTime":
            lineMessage.push(lineServices.textMessage(response))
            break
        case "askForArrivePlace":
            lineMessage.push(lineServices.textMessage(response))
            break
        case "askForArriveTime":
            lineMessage.push(lineServices.textMessage(response))
            break
        case "askForPickUp":
            lineMessage.push(lineServices.textMessage(response))
            break

        default:
            return dialogflowFulfillmentText(lineId, dataResult).catch(error => console.log("%s dialogflowFulfillmentText error:", lineId, error))

    }
    lineServices.pushMessage(userId, lineMessage)
}

// module.exports = router;