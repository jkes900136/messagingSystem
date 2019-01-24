import { Client, Message, FlexComponent } from "@line/bot-sdk"

import * as config from '../config';
// import infos from "./info"
import { File, Member, MessageTemplate } from "../model";

const lineClient = new Client(config.LINE)

export const textMessage = (message: string): Message => {
    let textMessage: Message = {
        type: "text",
        text: message
    }
    return textMessage
}

// export const listMessage = (results: Array<any>) => {
//     let list = ""
//     for (let i = 0; i < infos.length; i++) {
//         const result = (results[i]) ? results[i] : " "
//         list += infos[i] + "：" + result + "\n"
//     }
//     const textMessage: Message = {
//         type: "text",
//         text: list
//     }
//     return textMessage
// }

export const replyMessage = (replyToken: string, lineMessage: Message | Message[]): Promise<any> => {
    return lineClient.replyMessage(replyToken, lineMessage)
}

export const pushMessage = (userId: string, lineMessage: Message | Message[]): Promise<any> => {
    return lineClient.pushMessage(userId, lineMessage)
}

export const toLineTextMessage = (sender: Member, message: string): Message => {
    const textMessage: Message = {
        type: "text",
        text: `《來自${sender.name}》\n` + message
    }
    return textMessage
}

/**
 * receiver為人
 * @param sender 
 * @param message 
 * @param files 
 */
export const toPersonMessage = (sender: Member, message?: string, storageUrls?: MessageTemplate["urls"], thumb?: string, type?: string): Message | Message[] | null => {
    const contents: FlexComponent[] = []
    let imgObj = []
    let msgObj = []
    const urls = getURLfromString(message)
    if (urls) {
        message = message.replace(urls[0], "")
    }
    let flexMessage: Message = {
        type: "flex",
        altText: `《來自${sender.name}》${sender.path ? `\n${sender.path}` : ""}`,
        contents: {
            type: "bubble",
            header: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: `《來自${sender.name}》`,
                        weight: "bold",
                        size: "xl",
                        align: "center"
                    }
                ]
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: contents
            }
        }
    }
    if (thumb && thumb != "") {
        if (flexMessage.contents.type == "bubble") {
            flexMessage.contents.hero =
                {
                    type: "image",
                    url: encodeURI(decodeURI(thumb)),
                    size: "full",
                    aspectRatio: "20:13",
                    aspectMode: "cover"
                }
        }
    }
    if (message && message != "") {
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
        if (urls && urls.length > 0) {
            contents.push(
                {
                    type: "button",
                    action: {
                        type: "uri",
                        uri: urls[0],
                        label: "前往連結"
                    }
                },
                {
                    type: "separator",
                    margin: "md"
                }
            )
        }
    }

    if (storageUrls) {
        for (const storageUrl of storageUrls) {
            let viewerUrl: string = encodeURI(decodeURI(storageUrl.url))
            let isImg: boolean = false
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
                case "jpg":
                case "jpeg":
                case "png":
                    imgObj.push({
                        "type": "image",
                        "originalContentUrl": viewerUrl,
                        "previewImageUrl": viewerUrl
                    })
                    console.log("viewerUrl:", viewerUrl)
                    isImg = true
                    break
                default:
                    break
            }
            if (!isImg) {
                contents.push(
                    {
                        type: "box",
                        layout: "horizontal",
                        action: {
                            type: "uri",
                            label: "檢視",
                            uri: `${viewerUrl}`
                        },
                        contents: [
                            {
                                type: "text",
                                size: "sm",
                                text: storageUrl.name,
                                gravity: "center",
                                weight: "bold",
                                flex: 3
                            },
                            {
                                type: "image",
                                url: "https://ezzeng.ddns.net/icon5/file.png",
                                align: "start",
                                margin: "sm",
                                size: "xxs"
                            }
                        ]
                    },
                    {
                        type: "separator",
                        margin: "md"
                    }
                )
            }
        }
    }
    if (type) {
        switch (type) {
            case "11D":
                contents.push(
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            displayText: "登記",
                            label: "登記",
                            data: `type=${type}&action=1`
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "datetimepicker",
                            label: "預排上課時間",
                            data: `type=${type}&action=2`,
                            mode: "date"
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            displayText: "暫無法排定，未來會主動通知上課時間",
                            label: "延期",
                            data: `type=${type}&action=3`
                        }
                    },
                    {
                        type: "separator",
                        margin: "md"
                    }
                )
                break
            case "14D":
                contents.push(
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            displayText: "登記",
                            label: "登記",
                            data: `type=${type}&action=1`
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "datetimepicker",
                            label: "預排上課時間",
                            data: `type=${type}&action=2`,
                            mode: "date"
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            displayText: "暫無法排定，未來會主動通知上課時間",
                            label: "延期",
                            data: `type=${type}&action=3`
                        }
                    },
                    {
                        type: "separator",
                        margin: "md"
                    }
                )
                break
            case "21S":
                contents.push(
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            displayText: "參加",
                            label: "參加",
                            data: `type=${type}&action=1`
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "不克前往",
                            data: `type=${type}&action=2`,
                            displayText: "不克前往",
                        }
                    },
                    {
                        type: "separator",
                        margin: "md"
                    }
                )
                break
            case "23S":
                contents.push(
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "a : 台北交通車",
                            data: `type=${type}&action=1`,
                            displayText: "a : 台北交通車"
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "b : 台中交通車",
                            data: `type=${type}&action=2`,
                            displayText: "b : 台中交通車"
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "c : 高鐵到新竹",
                            data: `type=${type}&action=3`,
                            displayText: "c : 高鐵到新竹"
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "d : 自行前往",
                            data: `type=${type}&action=4`,
                            displayText: "d : 自行前往"
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "e : 課前一天接機",
                            data: `type=${type}&action=5`,
                            displayText: "e : 課前一天接機"
                        }
                    },
                    {
                        type: "separator",
                        margin: "md"
                    }
                )
                break
            case "32S":
                contents.push(
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "a : 台北",
                            data: `type=${type}&action=1`,
                            displayText: "a : 台北"
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "b : 台中",
                            data: `type=${type}&action=2`,
                            displayText: "b : 台中"
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "c : 南區",
                            data: `type=${type}&action=3`,
                            displayText: "c : 南區"
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "d : 自行前往",
                            data: `type=${type}&action=4`,
                            displayText: "d : 自行前往"
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "e : 接機",
                            data: `type=${type}&action=5`,
                            displayText: "e : 接機"
                        }
                    },
                    {
                        type: "separator",
                        margin: "md"
                    }
                )
                break
            case "33S":
                contents.push(
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "抽菸",
                            data: `type=${type}&action=1`,
                            displayText: "抽菸"
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "打鼾",
                            data: `type=${type}&action=2`,
                            displayText: "打鼾"
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "素食",
                            data: `type=${type}&action=3`,
                            displayText: "素食"
                        }
                    },
                    {
                        type: "separator",
                        margin: "md"
                    }
                )

                break
            case "41S":
                contents.push(
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "參加",
                            data: `type=${type}&action=1`,
                            displayText: "參加"
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "不克前往",
                            data: `type=${type}&action=2`,
                            displayText: "不克前往"
                        }
                    },
                    {
                        type: "separator",
                        margin: "md"
                    }
                )
                break
            case "42S":
                contents.push(
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "參加",
                            data: `type=${type}&action=1`,
                            displayText: "參加"
                        }
                    },
                    {
                        type: "button",
                        action: {
                            type: "postback",
                            label: "不克前往",
                            data: `type=${type}&action=2`,
                            displayText: "不克前往"
                        }
                    },
                    {
                        type: "separator",
                        margin: "md"
                    }
                )
                break
        }
    }

    if (sender.path) {
        if (flexMessage.contents.type == "bubble" && flexMessage.contents.header) {
            flexMessage.contents.header.contents.push({
                type: "text",
                text: sender.path,
                weight: "bold",
                size: "sm",
                margin: "md"
            })
        }
    }
    msgObj.push(flexMessage)
    msgObj = msgObj.concat(imgObj)
    // console.log(flexMessage)
    return contents.length > 0 ? msgObj : null

}

/**
 * receiver為群組
 * @param sender 
 * @param message 
 * @param files 
 */
// export const toGroupMessage = (sender: Member, message?: string, files?: File[]): Message => {
//     if (message && !files) {
//         const textMessage: Message = {
//             type: "text",
//             text: `《來自${sender.name}》\n${sender.path}\n${message}`
//         }
//         return textMessage
//     }

//     if (files)
//         return toPersonMessage(sender, message, files)
//     return null
// }

const getURLfromString = (message: string): string[] => {
    const regex = new RegExp(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi)
    return regex.exec(message)
}