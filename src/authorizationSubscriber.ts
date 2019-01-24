
import { actionSubscriber } from './actionSubscriber'
import { pushMessage } from './services/chatbotService'
import * as  chatMessageService from './services/chatMessageService'
import * as memberService from "./services/memberService"
import { ChatMessage, Member, RecordDetail, MemberOrganization } from './model';
import * as config from './config';
import { Client, Message, FlexComponent, FlexMessage, FlexBox } from "@line/bot-sdk"

const dialogflow = require('dialogflow');
const projectId = config.DialogFlow.projectId;
const languageCode = config.DialogFlow.languageCode;

const sessionClient = new dialogflow.SessionsClient({ keyFilename: config.dialogflowPath });

const detectIntent = (lineId: string, textMessage: string): Promise<any> => {
    const sessionPath = sessionClient.sessionPath(projectId, lineId);
    const request = {
        session: sessionPath,
        queryInput: {
            text: {
                text: textMessage,
                languageCode: languageCode,
            },
        },
    };
    return sessionClient.detectIntent(request);
}
export const messageDispatcher = async (lineId: string, message: string): Promise<any> => {
    let t1 = new Date()

    return detectIntent(lineId, message).then(responses => {
        let t2 = new Date()
        console.log("DialogFlow spent: ", t2.getTime() - t1.getTime(), "ms")
        const result = responses[0].queryResult;


        if (result.intent) {
            // match intent
            let action = result.action
            return authorization(lineId, action, result)
        } else {
            console.log("Missing result.intent")
            return authorization(lineId, "unMatchOnce", null)
        }
    }).catch(error => {
        console.log(`${lineId} Error in Dialogflow:${error}`);
        return authorization(lineId, "dialogFlowError", null)
    });
}
export const postbackDispatcher = async (userId: string, postback: any, params: any): Promise<any> => {
    const action = postback.action.toString()
    const type = postback.type || ""
    const contents: FlexComponent[] = []
    const greetingMessage = "學長您好！"
    const studentGreetings = "學員您好！"
    const thanksMessage = "，感謝您！"
    // const agreeMessage = greetingMessage + "已收到您的回覆，感謝您的參與！"
    // const declineMessage = greetingMessage + "已收到您無法參加的回覆，期待下次您的參與！"
    const yesMessage = "參加"
    const noMessage = "不克前往"
    const systemMember: Member = { id: "system", name: "", email: "", mobilePhone: "", lineId: "", wechatId: "", role: "staff", unReadMessages: 0 }
    let message = ""
    let session = ""
    let course: string[] = []
    let flexMessage: FlexMessage = {
        type: "flex",
        altText: `回覆訊息`,
        contents: {
            type: "bubble",
            body: {
                type: "box",
                layout: "vertical",
                contents: contents
            }
        }
    }
    let memberSnapShot = await memberService.getMemberByAnyId(userId)
    if (!memberSnapShot.empty) {
       
        if (message != "") {
            contents.push(
                {
                    type: "box",
                    layout: "vertical",
                    contents: [
                        { type: "separator" },
                        {
                            type: "text",
                            text: message,
                            size: "md",
                            margin: "md",
                            wrap: true
                        }
                    ]
                },
                {
                    type: "separator",
                    margin: "md"
                }
            )
        }
        if (contents.length > 0) {
            await pushMessage(userId, flexMessage).then(success => {
                return chatMessageService.createChatMessage(systemMember, memberSnapShot.docs[0].data() as Member, "Line", message, [], "")
            })
        } else {
            return Promise.resolve()
        }
    }
    // return authorization(lineId, action, postback)
}
const addTextBox = function (message: string): FlexBox {
    return {
        type: "box",
        layout: "vertical",
        contents: [
            { type: "separator" },
            {
                type: "text",
                text: message,
                size: "md",
                margin: "md",
                wrap: true
            }
        ]
    }
}
const addRecordDetail = function (userId: string, qText: string): RecordDetail {
    const trackId = chatMessageService.getRecordDetailUUID(userId)
    return {
        id: trackId,
        receiver: { id: "system", name: "", email: "", mobilePhone: "", lineId: "", wechatId: "", role: "staff", unReadMessages: 0 },
        channel: "Line",
        message: qText.replace(/\n/g, "\\n"),
        isSucceed: true,
        receiveTime: new Date().getTime(),
        read: false
    }
}
const authorization = function async(lineId: string, action: string, dataResult: any) {
    // dataResult from dialogflow result or postback data
    console.log("In authorization: ", lineId)
    if (action == "Default Fallback Intent") {
        return actionSubscriber(lineId, "unMatchOnce", dataResult)
    }
    return actionSubscriber(lineId, action, dataResult)
}


