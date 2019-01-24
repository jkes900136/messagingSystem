import Axios from "axios"
import * as Cache from "node-cache"
import { uriName, wechatAccount, textTemplateId, fileTemplateId, generalTemplateId, backendUrl } from "../config"
import { Member, File, MessageTemplate } from "../model"
import * as Moment from "moment-timezone"
import * as opencc from "node-opencc"
const cache = new Cache({ stdTTL: 7000, checkperiod: 0 })

type TemplateMessage = {
    touser: string
    template_id: string
    url?: string
    data: any
}

type CustomMessage = {
    touser: string
    msgtype: string
    text?: {
        content: string
    }
    image?: any
    video?: any
    music?: any
    news?: any
}

export const pushTemplateMessage = async (wechatMessage: TemplateMessage): Promise<any> => {
    const accessToken = await getAccessToken()
    const apiUrl = "https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=" + accessToken
    return Axios.post(apiUrl, wechatMessage).then(result => {
        console.log(result.data)
        const errorCode = result.data.errcode as number
        if (errorCode > 0)
            return Promise.reject(result.data.errmsg)
        return Promise.resolve("ok")
    }).catch(error => {
        console.log(error)
        return Promise.reject(error)
    })
}

export const pushCustomMessage = async (wechatMessage: CustomMessage): Promise<any> => {
    const accessToken = await getAccessToken()
    const apiUrl = "https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=" + accessToken
    return Axios.post(apiUrl, wechatMessage).then(result => {
        console.log(result.data)
        const errorCode = result.data.errcode as number
        if (errorCode > 0)
            return Promise.reject(result.data.errmsg)
        return Promise.resolve("ok")
    }).catch(error => {
        console.log(error)
        return Promise.reject(error)
    })
}

export const pushTemplateMessages = async (wechatMessages: Array<TemplateMessage>): Promise<any> => {
    for (const wechatMessage of wechatMessages)
        await pushTemplateMessage(wechatMessage)
}

// export const toTemplateMessages = (sender: Member, trackId: string, receiver: Member, message?: string, files?: File[]): Array<TemplateMessage> | null => {
//     const wechatMessages = []
//     if (message) {
//         const urls = getURLfromString(message)
//         if (urls) {
//             message = message.replace(urls[0], "")
//         }
//         // let wechatMessage: TemplateMessage = {
//         //     touser: receiver.wechatId,
//         //     template_id: textTemplateId,
//         //     data: {
//         //         sender: {
//         //             value: sender.name,
//         //             color: "#000000"
//         //         },
//         //         content: {
//         //             value: message,
//         //             color: "#000000"
//         //         }
//         //     }
//         // }
//         let eventTime = new Date()
//         // eventTime.setHours(eventTime.getHours() + 8) // if on Cloud 
//         const time = Moment(eventTime)
//         let wechatMessage: TemplateMessage = {
//             touser: receiver.wechatId,
//             template_id: generalTemplateId,
//             data: {
//                
//                 keyword1: {
//                     value: "訊息",
//                     color: "#000000"
//                 },
//                 keyword2: {
//                     value: message,
//                     color: "#000000"
//                 },
//                 keyword3: {
//                     value: `${time.format("YYYY-MM-DD hh:mm:ss")}`,
//                     color: "#173177"
//                 }
//             }
//         }
//         if (urls)
//             wechatMessage.url = backendUrl + "urlRedirect?trackId=" + trackId + "&url=" + urls[0]

//         if (sender.path) {
//             wechatMessage.data.path = {
//                 value: sender.path,
//                 color: "#000000"
//             }
//         }
//         wechatMessages.push(wechatMessage)
//     }

//     if (files) {
//         for (const file of files) {
//             wechatMessages.push({
//                 touser: receiver.wechatId,
//                 template_id: generalTemplateId,
//                 url: `${uriName}pdf/${file.id}/${trackId}`,
//                 data: {
//                     keyword2: {
//                         value: file.name,
//                         color: "#000000"
//                     }
//                 }
//             })
//         }
//     }
//     return wechatMessages.length > 0 ? wechatMessages : null
// }

export const toTemplateMessagesMQ = (sender: Member, channelId: string, message?: string, storageUrls?: MessageTemplate["urls"], thumb?: string): Array<TemplateMessage> | null => {
    const wechatMessages = []
    let eventTime = new Date()
    // eventTime.setHours(eventTime.getHours() + 8) // if on Cloud 
    const time = Moment(eventTime)
    if (message) {
        const urls = getURLfromString(message)
        if (urls) {
            message = message.replace(urls[0], "")
        }

        let wechatMessage: TemplateMessage = {
            touser: channelId,
            template_id: generalTemplateId,
            data: {

                keyword1: {
                    value: `訊息`,
                    color: "#000000"
                },
                keyword2: {
                    value: opencc.traditionalToSimplified(message),
                    color: "#000000"
                },
                keyword3: {
                    value: `${time.format("YYYY-MM-DD HH:mm:ss")}`,
                    color: "#173177"
                }
            }
        }
        if (urls && urls.length > 0) {
            wechatMessage.url = urls[0]
        }
        // wechatMessage.url = backendUrl + "urlRedirect?trackId=" + trackId + "&url=" + urls[0]

        if (sender.path) {
            wechatMessage.data.path = {
                value: sender.path,
                color: "#000000"
            }
        }
        wechatMessages.push(wechatMessage)
    }

    if (storageUrls) {
        for (const storageUrl of storageUrls) {
            let viewerUrl: string = encodeURI(decodeURI(storageUrl.url))
            switch (viewerUrl.substring(viewerUrl.lastIndexOf(".") + 1, viewerUrl.length).toLowerCase()) {
                case "pptx":
                case "ppt":
                case "docx":
                case "doc":
                case "xlsx":
                case "xls":
                    viewerUrl = "https://view.officeapps.live.com/op/embed.aspx?src=" + viewerUrl
                    break
                case "pdf":
                    viewerUrl = "https://docs.google.com/viewerng/viewer?url=" + viewerUrl
                    break
                default:
                    break
            }
            wechatMessages.push({
                touser: channelId,
                template_id: generalTemplateId,
                url: `${viewerUrl}`,
                data: {

                    keyword1: {
                        value: "檔案",
                        color: "#000000"
                    },
                    keyword2: {
                        value: storageUrl.name,
                        color: "#000000"
                    },
                    keyword3: {
                        value: `${time.format("YYYY-MM-DD HH:mm:ss")}`,
                        color: "#173177"
                    }
                }
            })
        }
    }
    if (thumb && thumb != "") {
        wechatMessages.push({
            touser: channelId,
            template_id: generalTemplateId,
            url: `${encodeURI(decodeURI(thumb))}`,
            data: {

                keyword1: {
                    value: "圖片",
                    color: "#000000"
                },
                keyword2: {
                    value: "公告",
                    color: "#000000"
                },
                keyword3: {
                    value: `${time.format("YYYY-MM-DD HH:mm:ss")}`,
                    color: "#173177"
                }
            }
        })

    }
    return wechatMessages.length > 0 ? wechatMessages : null
}

export const toCustomTextMessage = (receiver: Member, message: string, hyperlinks?: Array<{ key: string, url: string }>) => {
    let result = opencc.traditionalToSimplified(message)
    if (hyperlinks) {
        for (const hyperlink of hyperlinks)
            result = result.replace(hyperlink.key, `<a href="${hyperlink.url}">${hyperlink.key}</a>`)
    }
    return {
        touser: receiver.wechatId,
        msgtype: "text",
        text: {
            content: result
        }
    }
}

export const toFileMessage = (receiver: Member, file: File) => {
    const wechatMessage = {
        touser: receiver.wechatId,
        msgtype: "news",
        news: {
            articles: [{
                title: "檔案",
                description: file.name,
                url: "<http://file url>"
            }]
        }
    }
    return wechatMessage
}

export const toSmartQueryMessage = (receiver: Member) => {
    const wechatMessage = {
        touser: receiver.wechatId,
        msgtype: "text",
        text: {
            content: "《智慧查詢》\n\n請依序說出查詢條件(公司/地區/部門)以快速去得聯絡資訊"
        }
    }
    return wechatMessage
}

const getAccessToken = async (): Promise<string> => {
    const apiUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${wechatAccount.id}&secret=${wechatAccount.secret}`

    let token = ""
    try {
        token = cache.get("accessToken") as string
    } catch{
        console.log("Existing WechatToken: empty", token)
    }
    if (token != undefined && token != "") {
        console.log("Existing WechatToken: ", token)
        return token
    }

    return Axios.get(apiUrl).then(result => {
        token = result.data.access_token
        console.log("Get WechatToken: ", token)
        cache.set("accessToken", token, 7000)
        return token
    })
}


const getURLfromString = (message: string): string[] | null => {
    const regex = new RegExp(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi)
    return regex.exec(message)
}
