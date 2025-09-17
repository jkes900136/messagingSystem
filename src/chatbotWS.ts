import { Router } from "express"
import * as Line from '@line/bot-sdk';
import { LINE, monitorGroupId, wechatAccount, uriName, appName } from './config';
import { Stream } from 'stream';
import * as fs from 'fs'
import axios from "axios"
import * as wechat from 'wechat'
import rateLimit from "express-rate-limit";
import { createHash } from "crypto"
import * as mime from "mime"
import { messageDispatcher, postbackDispatcher } from './authorizationSubscriber'
import { getMemberByAnyId, setMember, deleteFirebaseToken } from './services/memberService';
import * as lineService from './services/lineService';
const queryString = require('query-string');
let path = require("path");

// Rate limiter for wechatRedir route - stricter limits due to file system access
const wechatRedirLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // limit each IP to 20 requests per windowMs (stricter than other routes)
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many file access requests from this IP, please try again later."
});

const router = Router()
router.post('/lineWebhook', (req, res) => {
    console.log("webhook");
    const signature = req.headers["x-line-signature"];
    if (Line.validateSignature(JSON.stringify(req.body), LINE.channelSecret, signature as string)) {
        const events = req.body.events;
        let responseArray: Promise<any>[] = [];
        let t2, t3;

        events.forEach(async (event) => {
            console.log(JSON.stringify(event, null, 4));
            console.log("event.type", event.type)
            let lineId = event.source.userId
            let fileName = ""
            switch (event.type) {
                case 'follow':
                    messageDispatcher(lineId, "註冊")
                    break;
                case 'unfollow':
                    // responseArray.push(memberUnfollow(lineId))
                    break;
                case 'message':
                    if (event.source.type == 'user') {
                        // from user in line@, not from group                    
                        switch (event.message.type) {
                            case "text":
                                responseArray.push(messageDispatcher(lineId, event.message.text))
                                break;
                            case "sticker":
                                break;
                            case "file":
                            case "image":
                            case "video":
                            case "audio":
                                if (event.message.hasOwnProperty('fileName')) {
                                    fileName = event.message.fileName.substring(0, event.message.fileName.lastIndexOf("."))
                                } else {
                                    fileName = event.message.id
                                }
                                // SSRF mitigation: validate message id
                                if (/^[a-zA-Z0-9_-]+$/.test(event.message.id)) {
                                    const result = await axios.get(`https://api.line.me/v2/bot/message/${event.message.id}/content`, {
                                        responseType: "stream",
                                        headers: {
                                            "Authorization": "Bearer " + LINE.channelAccessToken,
                                        }
                                    }).catch(error => {
                                        if (error.hasOwnProperty("response")) {
                                            if (error.response.hasOwnProperty("status")) {
                                                console.log("Get content failed with status code:", error.response.status + error.response.statusText)
                                            } else {
                                                console.log("Get content failed with no status code")
                                            }
                                        } else {
                                            console.log("Get content failed with no response")
                                        }
                                        return null
                                    })
                                } else {
                                    console.log("Invalid message id for LINE content fetch; possible SSRF attempt:", event.message.id);
                                }
                                if (result != null) {
                                    const stream = result.data as Stream
                                    console.log(result.headers['content-type']);
                                    let msg = result.headers['content-type'];
                                    let extention = mime.getExtension(result.headers['content-type'])

                                    let length = result.headers['content-length'];
                                    console.log("length:", length)
                                    if (length > 10485760) {
                                        console.log("很抱歉，您傳送的檔案超過 10 MB，目前無法接收。請您留言需要協助的事項，我們會儘快跟您聯絡。謝謝您！");
                                    } else {
                                        let buffer = new Buffer(0);
                                        stream.on('data', (chunk) => {
                                            buffer = Buffer.concat([buffer, chunk]);
                                            if (buffer.length >= length) {
                                                fs.writeFileSync('lib/' + Date.now() + fileName + "." + extention, buffer);
                                            }
                                        });
                                        stream.on('error', (err) => {
                                            console.log(err);
                                        });
                                    }
                                }
                                break;
                            case "location":
                                break;
                            default:
                                break;
                        }
                    }
                    console.log(lineId + " " + event.message.text)
                    break;
                case 'postback':
                    const postback = queryString.parse(event.postback.data)
                    responseArray.push(postbackDispatcher(lineId, postback, event.postback.params))
                    break
                case 'join':
                    let groupWelcome: Line.Message = {
                        "type": "template",
                        "altText": "This is a buttons template",
                        "template": {
                            "type": "buttons",
                            "text": `我是《${appName}》很高興受邀加入貴群組，請你填表幫我長智慧，讓我知道這個群組的相關資`,
                            "actions": [
                                {
                                    "type": "uri",
                                    "label": "點選前往",
                                    "uri": `${uriName}groupBinding/${event.source.groupId}`
                                }
                            ]
                        }
                    }
                    lineService.pushMessage(event.source.groupId, groupWelcome)
                    break
                default:
                    break;
            }


        });
        t2 = new Date();
        Promise.all(responseArray)
            .then(() => {
                t3 = new Date();

                console.log("Webhook Response Time:", t3.getTime() - t2.getTime());

                res.status(200).send("OK")
            })
            .catch(err => {
                console.log(err);
                res.status(200).send("not OK");
            });
    } else {
        res.status(200).send("OK")
    }
}); // end of lineWebhook
router.use('/wechatWebhook', wechat(wechatAccount.callbackToken, function (req, res) {
    console.log("wechatwebhook:", req.body);

    let responseArray: Promise<any>[] = [];
    let arr = [];
    let t1, t2, t3;
    t1 = new Date();
    if (req.method.toLowerCase() === "get") {
        const shasum = createHash("sha256")
        shasum.update([wechatAccount.callbackToken, req.query.timestamp, req.query.nonce].sort().join(""))
        const signature = shasum.digest("hex")
        if (signature !== req.query.signature)
            return res.status(403).end()
        else
            res.status(200).send(req.query.echostr)
    } else {
        const event = req.weixin
        const userId = event.FromUserName
        console.log(JSON.stringify(event, null, 4))

        switch (event.MsgType) {
            case "event":
                switch (event.Event) {
                    case "subscribe":
                        console.log("follow*---------")
                        messageDispatcher(userId, "註冊")
                        break
                    case "unsubscribe":
                        responseArray.push(memberUnfollow(userId))
                        break
                    case "CLICK":
                        switch (event.EventKey) {
                            default:
                                break
                        }
                        break;
                }
                break
            case "text":
                responseArray.push(messageDispatcher(userId, event.Content))
                break
        }
        res.reply("")
    }
    t2 = new Date();
    Promise.all(arr)
        .then(() => {
            t3 = new Date();
            console.log("D2:", t3.getTime() - t2.getTime());
        })
        .catch(err => {
            console.log(err);
        });
})); // end of wechatWebhook

router.use('/wechatRedir', wechatRedirLimiter, async function (req, res) {
    if (req.hasOwnProperty("body")) {
        console.log('Has body wechatRedir.html:', req.body)
    } else {
        console.log('Request body not found wechatRedir.html:')
    }
    res.sendFile(path.join(__dirname + '/../serviceAccount/wechatRedir.html'));
})
const memberUnfollow = (lineId: string): Promise<any> => {
    return getMemberByAnyId(lineId).then(result => {
        if (!result.empty) {
            let user = result.docs[0].data() as any
            // sendToBigQuery(lineId, user.name, user.divsionName, "unfollow")
            if (!user["unfollow"] || user["unfollow"] == false) {
                user["unfollow"] = true
                setMember(user)
                deleteFirebaseToken(user.lineId).then((result: any) => {
                    console.log(`${user.name} unfollowed`)
                    return lineId
                }).catch((error: any) => {
                    console.log("unfollow error:", error)
                    return null
                })

            }
        } else
            // sendToBigQuery(lineId, "未註冊", "未註冊", "unfollow")
            return null
    })
}

export default router