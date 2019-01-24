import * as Line from '@line/bot-sdk';
import * as config from '../config';
import * as memberService from './memberService';

import * as NodeCache from "node-cache"
import * as axios from 'axios'
import * as Moment from "moment-timezone"
const chatbotCache = new NodeCache({ stdTTL: 600, checkperiod: 0 });
// const express = require('express');
const lineBot = new Line.Client(config.LINE);

const monitorResponseMessage = (lineId: string, message: any): Promise<any> => {
    let lineArr = []
    let user;
    if (lineId == undefined || lineId == null)
        lineId = "User from Web without login"

    return memberService.getMemberByAnyId(lineId).then(receiver => {
        if (!receiver.empty) {
            user = receiver.docs[0].data()
            lineArr.push({ type: "text", text: `Response to: ${lineId} \n[${user.businessName} ${user.name} ${user.title}]` })
        } else
            lineArr.push({ type: "text", text: `Response to: ${lineId} [未綁定]` })

        if (!Array.isArray(message))
            lineArr.push(message)
        else {
            message.forEach(msg => {
                lineArr.push(msg)
            })
        }
        return lineBot.pushMessage(config.monitorGroupId, lineArr)
    }).catch(error => {
        lineArr.push({ type: "text", text: `Response to: ${lineId} getSales Error: ${error}` })
        return lineBot.pushMessage(config.monitorGroupId, lineArr)
    })

}
const wechatSend = (messageToSend) => {
    return new Promise((resolve, reject) => {
        chatbotCache.get("wechatAccessToken", (err, value) => {
            if (!err && value) {
                console.log("GetWechatToken: ", value)
                const accessToken = value;
                const pushMessageUrl = `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`;
                axios.default.post(pushMessageUrl, messageToSend).then(function (response) {
                    console.log("response.data:", response.data)
                    if (response.data.errcode != 0) {
                       
                    }
                    console.log("Send Success")
                    resolve("Send Success")
                }).catch(error => console.log(error));
            } else {
                const getAccessTokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.wechatAccount.id}&secret=${config.wechatAccount.secret}`;
                axios.default.get(getAccessTokenUrl).then(res => {
                    const accessToken = res.data.access_token;
                    console.log("token:",accessToken)
                    const pushMessageUrl = `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${accessToken}`;
                    chatbotCache.set("wechatAccessToken", accessToken, 7000);
                    axios.default.post(pushMessageUrl, messageToSend).then(function (response) {
                        console.log("response.data:", response.data)
                        if (response.data.errcode != 0) {
                           
                        }
                        resolve("Send Success")
                    }).catch(error => console.log(error));
                }).catch(error => console.log(error));
            }
        });
    })
}
export const pushMessage = async (platformId, platformMessage) => {
    // console.log("platformMessage:", JSON.stringify(platformMessage, null, 2))
    if (platformId != config.monitorGroupId && platformMessage.hasOwnProperty("type")) {
        monitorResponseMessage(platformId, platformMessage)
    }
    if (platformId.length == config.idLength.LINE) {
        return lineBot.pushMessage(platformId, platformMessage);
    } else {
        let messageToSend = {}
        let messageArray = []
        if (platformMessage.constructor === Array) {
            messageArray = platformMessage
        } else {
            messageArray.push(platformMessage)
        }

        for (let i = 0; i < messageArray.length; i++) {
            if (messageArray[i].hasOwnProperty("type")) {
                switch (messageArray[i].type) {
                    case "text":
                        messageToSend = {
                            touser: platformId,
                            msgtype: "text",
                            text: { content: messageArray[i].text }
                        };
                        break;
                    case "location":
                        messageToSend = {
                            type: "location",
                            location: {
                                title: messageArray[i].title,
                                address: messageArray[i].address,
                                latitude: messageArray[i].latitude,
                                longitude: messageArray[i].longitude
                            }
                        };
                        if (platformId.length == config.idLength.WECHAT) {
                            messageToSend = {
                                touser: platformId,
                                msgtype: "text",
                                text: {
                                    content: `${messageArray[i].title}\n${messageArray[i].address}`
                                }
                            };
                        }
                        break;
                    case "image":
                        messageToSend = {
                            type: "image",
                            image: messageArray[i].originalContentUrl
                        };
                        break;
                    case "audio":
                        messageToSend = {
                            type: "audio",
                            audio: {
                                audioUrl: messageArray[i].originalContentUrl,
                                duration: messageArray[i].duration
                            }
                        };
                        break;
                    case "video":
                        messageToSend = {
                            type: "video",
                            video: {
                                title: "<Video title>",
                                description: "<Video description>",
                                previewImage: messageArray[i].previewImageUrl,
                                videoUrl: messageArray[i].originalContentUrl
                            }
                        };
                        break;
                    case "template":
                        let columnsOptions = [];
           
                        if (platformId.length == config.idLength.WECHAT) {
                            if (messageArray[i].template.type == "confirm") {
                                columnsOptions.push({
                                    title: messageArray[i].template.text + "\n" + messageArray[i].template.actions[0].label,
                                    description: messageArray[i].template.text,
                                    url: messageArray[i].template.actions[0].uri,

                                });
                                for (let k = 1; k < messageArray[i].template.actions.length; k++) {
                                    columnsOptions.push({
                                        title: messageArray[i].template.actions[k].label,
                                        description: messageArray[i].template.text,
                                        url: messageArray[i].template.actions[k].uri,
                                    });
                                }
                                messageToSend = {
                                    touser: platformId,
                                    msgtype: "news",
                                    news: {
                                        articles: columnsOptions
                                    }
                                };
                            }
                            if (messageArray[i].template.type == "buttons") {
                                for (let k = 0; k < messageArray[i].template.actions.length; k++) {
                                    columnsOptions.push({
                                        title: messageArray[i].template.actions[k].label,
                                        description: messageArray[i].template.text,
                                        url: messageArray[i].template.actions[k].uri,

                                    });
                                }
                                messageToSend = {
                                    touser: platformId,
                                    msgtype: "news",
                                    news: {
                                        articles: columnsOptions
                                    }
                                };
                            }
                            if (messageArray[i].template.type == "carousel") {
                                for (let k = 0; k < messageArray[i].template.columns.length; k++) {
                                    columnsOptions.push({
                                        title: messageArray[i].template.columns[k].text,
                                        description: messageArray[i].template.columns[k].text,
                                        url: ``,

                                    });
                                }
                                messageToSend = {
                                    touser: platformId,
                                    msgtype: "news",
                                    news: {
                                        articles: columnsOptions
                                    }
                                }
                            }
                        }
                        break;
                    case "imagemap":
                        let actionsOptions = [];
                        for (let k = 0; k < messageArray[i].actions.length; k++) {
                            actionsOptions.push({
                                title: messageArray[i].altText,
                                description: messageArray[i].altText,
                                url: messageArray[i].actions[k].linkUri,

                            });
                        }
                        messageToSend = {
                            touser: platformId,
                            msgtype: "news",
                            news: {
                                articles: actionsOptions
                            }
                        }
                        break;

                }
            } else {
                messageArray[i].touser = platformId
                messageToSend = messageArray[i]
                
               
            }
            console.log(JSON.stringify(messageToSend));
            await wechatSend(messageToSend)
        }
    }
};
export const pushWechatTemplateMessage = async (platformId, platformMessage) => {
    console.log("platformMessage:", JSON.stringify(platformMessage, null, 2))
    if (platformId != config.monitorGroupId && platformMessage.hasOwnProperty("type")) {
        monitorResponseMessage(platformId, platformMessage)
    }

    let messageToSend = {}
    let messageArray = []
    let eventTime = new Date()
    eventTime.setHours(eventTime.getHours() + 8) // if on Cloud 
    const time = Moment(eventTime)
    if (platformMessage.constructor === Array) {
        messageArray = platformMessage
    } else {
        messageArray.push(platformMessage)
    }
    for (let i = 0; i < messageArray.length; i++) {
        messageArray[i].touser = platformId
        messageArray[i].template_id = config.generalTemplateId

        for (let j = 1; j < messageArray[i].news.articles.length; j++) {
            messageArray[i].url = messageArray[i].news.articles[j].url
            messageArray[i].data = {}
            messageArray[i].data["first"] = {
                value: "",
                color: "#173177"
            }
            messageArray[i].data["keyword1"] = {
                value: messageArray[i].news.articles[0].title,
                color: "#173177"
            }
            messageArray[i].data["keyword2"] = {
                value: messageArray[i].news.articles[0].description,
                color: "#173177"
            }
            messageArray[i].data["keyword3"] = {
                value: `${time.format("YYYY-MM-DD hh:mm:ss")}`,
                color: "#173177"
            }
            messageArray[i].data["remark"] = {
                value: `請點選「詳情」${messageArray[i].news.articles[j].description}`,
                color: "#173177"
            }
            messageToSend = messageArray[i]
            console.log(JSON.stringify(messageToSend));
            await wechatTemplateSend(messageToSend)
        }
    }
};
export const wechatTemplateSend = async (messageToSend) => {
    return new Promise((resolve, reject) => {
        chatbotCache.get("wechatAccessToken", (err, value) => {
            if (!err && value) {
                console.log("GetWechatToken: ", value)
                const accessToken = value;
                const pushMessageUrl = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;
                axios.default.post(pushMessageUrl, messageToSend).then(function (response) {
                    console.log("response.data:", response.data)
                    if (response.data.errcode != 0) {
                      
                    }
                    console.log("Send Success")
                    resolve("Send Success")
                }).catch(error => console.log(error));
            } else {
                const getAccessTokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${config.wechatAccount.id}&secret=${config.wechatAccount.secret}`;
                axios.default.get(getAccessTokenUrl).then(res => {
                    const accessToken = res.data.access_token;
                    const pushMessageUrl = `https://api.weixin.qq.com/cgi-bin/message/template/send?access_token=${accessToken}`;
                    chatbotCache.set("wechatAccessToken", accessToken, 7000);
                    axios.default.post(pushMessageUrl, messageToSend).then(function (response) {
                        console.log("response.data:", response.data)
                        if (response.data.errcode != 0) {
                          
                        }
                        resolve("Send Success")
                    }).catch(error => console.log(error));
                }).catch(error => console.log(error));
            }
        });
    })
}
export const replyMessage = (replyToken, lineMessage) => {
    return lineBot.replyMessage(replyToken, lineMessage);
};