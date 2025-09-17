import { Router } from "express"
import rateLimit from "express-rate-limit";
import * as structureService from './services/structureService'
import * as loginService from './services/loginService';
import * as memberService from './services/memberService'
import { pushMessage } from './services/chatbotService';
import * as driveService from "./services/driveService"
import { Client, validateSignature, WebhookEvent, Message, TextMessage, TemplateMessage } from "@line/bot-sdk"
import * as config from './config';
import * as receiverService from './services/receiverService';
import * as admin from 'firebase-admin';
import { IssueOrganization, GroupOrganization, Group, MemberOrganization, Member } from './model';
const uuidv4 = require('uuid').v4;

// Utility to escape HTML meta-characters (minimal version)
function escapeHTML(str: string): string {
    if (typeof str !== 'string') return str;
    return str.replace(/[&<>"'`]/g, function (char) {
        const map: { [char: string]: string } = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '`': '&#x60;'
        };
        return map[char];
    });
}

const router = Router()

// set up rate limiter for /Binding route
const bindingLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many binding requests from this IP, please try again later."
});

router.post('/Binding', bindingLimiter, async function (req, res) {
    const applicationName = config.appName
    const lineId = req.body.lineId
    const data = req.body.data
    const name = req.body.name
    const action = req.body.action
    console.log("---data", data)
    console.log("---lineId", lineId)
    console.log("---action", action)
    let result
    if (lineId != null && lineId != "guest") {
        switch (action) {
            case "fileVersion":
                result = fileVersion(lineId, data)
                res.send(result)
                break
            case "productInfo":
                result = productInfo(lineId, data)
                res.send(result)
                break
            case "login":
                result = await login(lineId, data, applicationName).catch(err => {
                    res.status(403).json({ error: escapeHTML(err.toString()) })
                })
                console.log("result", result)
                res.send(result)
                break
            case "groupBinding":
                result = await groupBinding(lineId, data, applicationName).then(() => {
                }).catch(err => {
                    res.status(403).json({ error: escapeHTML(err.toString()) })
                })
                console.log("result", result)
                res.send(result)
                break
            default:
                break
        }
    } else {
        res.sendStatus(200)
    }
});
router.post('/initialization',  async function (req, res) {
    const email = "admin@example.com"
    const mobile = "0911222333"
    const name = "系統管理員"
    await initialization({ email, mobile, name }).then(DBInfo => {
        console.log("DBInfo", DBInfo)
        res.status(200).send(DBInfo)
    }).catch(err => {
        res.status(403).send(err)
    })
});
const login = async (lineId: string, data: any, applicationName: string) => {
    const personalId = ""
    let password = data.mobilePhone
    if (password) {
        return memberService.getMemberByAnyId(lineId).then(snapshot => {
            if (snapshot.size < 1) { // 確認  此PersonalId已註冊數量
                // personalId尚未被綁定
                return registeration(lineId, personalId, password, applicationName)
            } else {
                //personalId被綁定過
                let users = []
                snapshot.forEach(doc => users.push(doc.data()))
                for (let i = 0; i < users.length; i++) {
                    if (!users[i]["unfollow"] || users[i]["unfollow"] == false) {
                        console.log(`${lineId}重複綁定，PID:[${personalId}]`)
                        // return Promise.reject("此帳號已被綁定, 請勿重複登入")
                    }
                }
                return registeration(lineId, personalId, password, applicationName)
            }
        })
        // return  existSale(lineId, personalId, password)
        // return registeration(lineId, personalId, password, applicationName)
    } else
        return Promise.reject("請輸入帳號密碼")
}
const registeration = (platformId, personalId, password, applicationName) => {

    return loginService.tempLogin(personalId, password, platformId).then(async result => {
        if (platformId.length == config.idLength.LINE) {
            result["lineId"] = platformId
            result["lineBindingAt"] = +Date.now()
        } else if (platformId.length == config.idLength.WECHAT) {
            result["wechatId"] = platformId
            result["wechatBindingAt"] = +Date.now()

        }

        result["errorCounter"] = 0
        result["isActive"] = true
        result["unfollow"] = false
        if (!result.hasOwnProperty("path")) { result["path"] = "" }
        if (!result.hasOwnProperty("lineId")) { result["lineId"] = "" }
        if (!result.hasOwnProperty("wechatId")) { result["wechatId"] = "" }


        return driveService.authorize().then(auth => {
            const now = +Date.now()
            let newUid = uuidv4()
            let companyInfo: MemberOrganization = {
                parentId: result.id, name: "我的通訊錄", type: "department", id: newUid
            }
            let structureInfo: IssueOrganization = {
                parentId: result.id, name: "我的議題", type: "system", id: newUid
            }
            let groupInfo: GroupOrganization = {
                parentId: result.id, name: "我的群組", type: "system", id: newUid
            }
            return driveService.getFileByName(result.id).then(async folders => {
                if (folders.empty) {
                    await driveService.createFile(auth, result.id, config.personalRootFolderId, "folder", now).then(folderId => {
                        console.log("folderId:", folderId)
                        driveService.createFile(auth, "保存", folderId, "folder", now).then(() => {
                        }).catch(err => {
                            console.log("error:", err.response)
                        })
                    }).catch(err => {
                        console.log("error:", err.response)
                    })
                }
                await structureService.getStructureByParentId(result.id).then(issueSnapshot => {
                    if (issueSnapshot.empty) {
                        structureService.setStructure(structureInfo)
                    }
                })
                // await groupOrganizationService.getGroupByParentId(result.id).then(groupSnapshot => {
                //     if (groupSnapshot.empty) {
                //         groupOrganizationService.updateGroup(groupInfo)
                //     }
                // })
                return receiverService.getReceiverByParentId(result.id).then(orgSnapshot => {
                    if (orgSnapshot.empty) {
                        receiverService.setReceiver(companyInfo).catch(err => {
                            console.log(err)
                            return Promise.resolve("ok")
                        })
                    }

                    let lineMsg = {
                        type: "text",
                        text: `感謝${result.name} ，加入《${applicationName}》。請點選主選單，開始體驗智能世代下的通訊協作。`
                    }
                    pushMessage(platformId, lineMsg)
                    return memberService.setMember(result).then(async () => {

                        let firebaseToken = await generateFirebaseToken(platformId).catch(error => {
                            console.log("generateFirebaseToken error:", error)
                        })
                        console.log("----------", firebaseToken)
                        return firebaseToken
                    }).catch(err => {
                        console.log(err)
                        return Promise.resolve("ok")
                    })
                })
            })
        });
    }).catch(error => {
        console.log(error)
        return Promise.reject(error)
    })
}
const groupBinding = (lineId: string, data: any, applicationName: string) => {
    return new Promise<any>(async (resolve, reject) => {
        let groupName = data.groupName
        let groupId = data.groupId
        if (groupName && groupId) {
            let memberSnapshot = await memberService.getMemberByAnyId(lineId)
            let member: Member
            if (memberSnapshot.empty) {
                console.log("====Member不存在====")
            } else {
                member = memberSnapshot.docs[0].data() as Member
                let newGroups: Member["lineGroup"] = []
                if (member.hasOwnProperty("lineGroup")) {
                    newGroups = member.lineGroup
                }
                newGroups.push({ groupId: groupId, name: groupName })
                member = {
                    ...member,
                    lineGroup: newGroups
                }
                await memberService.setMember(member)
            }
            resolve()
            // receiverService.getReceiverByParentId(memberSnapshot.docs[0].data().id).then(orgSnapshot => {
            // groupService.getGroupBylineId(groupId).then(snapshot => {
            //     if (snapshot.size < 1) { // 確認  此PersonalId已註冊數量
            //         // personalId尚未被綁定
            //         // return registeration(lineId, personalId, password, applicationName)
            //         let newUid = uuidv4()
            //         let groupData: Group = {
            //             id: newUid,
            //             name: groupName,
            //             ownerId: memberSnapshot.docs[0].data().id,
            //             lineId: groupId,
            //             childrenId: [{ id: memberSnapshot.docs[0].data().id, name: memberSnapshot.docs[0].data().name }]
            //             // path: "",                                   
            //             // role: "private",             
            //         }
            //         let groupOrgData: GroupOrganization = {
            //             type: "group",
            //             id: newUid,
            //             name: groupName,
            //             parentId: orgSnapshot.docs[0].data().id,
            //             groupId: newUid,
            //             ownerId: memberSnapshot.docs[0].data().id
            //         }
            //         groupOrganizationService.updateGroup(groupOrgData)
            //         groupService.updateGroup(groupData).then(() => {
            //             resolve()
            //         })
            //     } else {
            //         resolve()

            //     }
            // }).catch(() => {
            //     reject("無法新增至我的群組")
            // })
            // }).catch(() => {
            //     reject("無法新增至我的群組")
            // })

        } else
            reject("請輸入帳號密碼")
    })
}
const initialization = (accInfo: any) => {
    return new Promise<any>(async (resolve, reject) => {
        let newUid = uuidv4()

        let firebaseDesktop = await createFirebaseAccount(accInfo.email, accInfo.mobile, accInfo.name).catch(error => {
            console.log("DesktopFirebaseToken error:", error)
        })
        await login("", { mobilePhone: accInfo.mobile }, config.appName).catch(err => {
            reject(err)
        })
        resolve()
    })
}
const productInfo = (lineId: string, data: any) => {
    let productName = data.productName
    let fileId = data.fileId
    let type = data.type
    let url = `${config.uriName}#/pdf/${lineId}/`
  
    let lineMsgArray = []
    // let lineMsg = {
    //     type: "template",
    //     altText: `${productName}_${type}`,
    //     template: {
    //         type: "confirm",
    //         text: `${productName}_${type}`,
    //         actions: []
    //     }
    // }

    let lineMsg = {
        type: "template",
        altText: `${productName}_${type}`,
        template: {
            type: "buttons",
            text: `${productName}`,
            actions: []
        }
    }


    if (fileId == undefined || fileId.length == 0) {

        lineMsg.template.actions.push({
            "type": "postback",
            "label": type,
            "data": `action=fileNotFound&fileName=${productName}${type}`
        })
    } else {
        // lineMsg.template.actions.push(
        //     {
        //         "type": "uri",
        //         "label": "檢視",
        //         "uri": url + fileId
        //     }, {
        //         "type": "uri",
        //         "label": "轉傳",
        //         "uri": `${config.uriName}#/forward/${lineId}/${fileId}/${type}`
        //     }
        // )
        lineMsg.template.actions.push(
            {
                "type": "uri",
                "label": `${type}`,
                "uri": url + fileId
            }
        )
    }

    lineMsgArray.push(lineMsg)

    pushMessage(lineId, lineMsgArray)
    return "OK"
}

const fileVersion = (lineId: string, data: any) => {
    const folderId = data.folderId
    const name = data.name
    const path = data.path
    console.log("folderId", folderId)
    console.log("name", name)
    console.log("path", path)

    let lineMsg: TemplateMessage = {
        type: "template",
        altText: `${name}`,
        template: {
            type: "buttons",
            text: `${path}`,
            actions: [
                {
                    type: "uri",
                    label: `${name}`,
                    uri: `${config.uriName}#/pdf/${lineId}/${folderId}`
                }
            ]
        }
    }

    pushMessage(lineId, lineMsg)
    return "OK"
}

function generateFirebaseToken(userId: string) {
    let firebaseUid = userId;
    // admin.auth().dis
    return admin.auth().createCustomToken(firebaseUid);
}
function createFirebaseAccount(email: string, mobile: string, name: string) {
    return admin.auth().createUser({
        email: email,
        password: mobile,
        displayName: name
    });
}
export default router
