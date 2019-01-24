import { Router } from "express"
import { v4 as uuidv4 } from "uuid"
import * as XLSX from 'xlsx'

import * as memberService from "./services/memberService"

import * as groupService from "./services/groupService"
import * as batchGroupService from "./services/groupMessageService"
import { Member, Group, BatchGroup } from "./model"
const router = Router()

router.post("/importGroup", async (req, res) => {
    let base64String = req.body.file;
    let base64Image = base64String.split(';base64,').pop();
    /* data is a node Buffer that can be passed to XLSX.read */
    let workbook = XLSX.read(base64Image, { type: 'base64' });
    let data: string[][] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

    let ownerId = ""
    let groupName: string = ""
    let type: string = ""
    let memberUploads = new Array<{ personalId: string, name?: string, mobilePhone?: string, email?: string, index?: number, message: string }>()
    if (req.body.hasOwnProperty("ownerId")) {
        ownerId = req.body.ownerId
    }
    if (req.body.hasOwnProperty("groupName")) {
        groupName = req.body.groupName
    }

    for (let i = 1; i < data.length; i++) {
        let cols = data[i]
        if (cols.length >= 1) {
            if (cols.length <= 1) {
                cols[1] = ""
            }

            let newMember = {
                personalId: cols[0] || "",
                message: cols[1] || ""
            }
            memberUploads.push({
                personalId: newMember.personalId.toString().trim(),
                message: newMember.message.toString().trim()
            })
            if (cols[1].toString().trim() == "") {
                type = "messageless"
            } else {
                type = ""
            }
        }
    }

    let newGroup: Group = { id: uuidv4(), name: groupName, memberId: [], ownerId: ownerId }
    let newGroupMessage: BatchGroup = { id: uuidv4(), name: groupName, members: [], ownerId: ownerId }
    // console.log("memberUploads:", memberUploads)
    for (const memberUpload of memberUploads) {
        /**
         * 檢查Member主檔是否存在
         */
        const memberSnapshot = await memberService.getMembersByName(memberUpload.personalId)
        let member: Member
        if (memberSnapshot.empty) {
            console.log("====Member不存在====")
        } else {
            // 若存在則檢查是否更新
            member = memberSnapshot.docs[0].data() as Member
            if (newGroup.memberId.indexOf(member.id) < 0) {
                newGroup.memberId.push(member.id)
            }
            if (memberUpload.message != "") {
                newGroupMessage.members.push({ id: member.id, content: memberUpload.message })
            }
            // console.log("memberUpload:", memberUpload)
            if (memberUpload.message != "") {
                if (member.hasOwnProperty("data")) {
                    member = {
                        ...member,
                        data: [{
                            message: memberUpload.message
                        }]
                    }
                } else {
                    member = {
                        ...member,
                        data: [{
                            message: memberUpload.message
                        }]
                    }
                }
                // await memberService.updateMember(member)
            }
        }
    }
    console.log("importGroup:", newGroup)
    console.log("importGroupMessage:", newGroupMessage)
    if (type == "messageless") {
        await groupService.setGroup(newGroup)
    } else {
        await batchGroupService.setBatchGroup(newGroupMessage)
    }
    res.sendStatus(200)
})

router.post("/updateGroup", async (req, res) => {
    let data: Group = req.body
    await groupService.setGroup(data).then(success => {
        res.sendStatus(200)
    }).catch(err => {
        res.sendStatus(403)
    })
})
router.post("/updateBatchGroup", async (req, res) => {
    let data: BatchGroup = req.body

    await batchGroupService.setBatchGroup(data).then(success => {
        res.sendStatus(200)
    }).catch(err => {
        res.sendStatus(403)
    })

})

router.delete("/deleteGroup/:groupId", async (req, res) => {
    let groupId: string = req.params.groupId
    await groupService.deleteGroup(groupId).then(success => {
        res.sendStatus(200)
    }).catch(err => {
        res.sendStatus(403)
    })
})
router.delete("/deleteBatchGroup/:batchGroupId", async (req, res) => {
    let batchGroupId: string = req.params.batchGroupId

    await batchGroupService.deleteBatchGroup(batchGroupId).then(success => {
        res.sendStatus(200)
    }).catch(err => {
        res.sendStatus(403)
    })

})
router.post("/importMember", async (req, res) => {
    let base64String = req.body.file;
    let base64Image = base64String.split(';base64,').pop();
    /* data is a node Buffer that can be passed to XLSX.read */
    let workbook = XLSX.read(base64Image, { type: 'base64' });
    let data: string[][] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

    let memberUploads = new Array<{ personalId: string, name: string, title: string, division: string, department: string, mobilePhone: string, email: string, lineId?: string, wechatId?: string, index?: number, referrer?: string }>()

    for (let i = 1; i < data.length; i++) {
        let cols = data[i]
        if (cols.length >= 8) {
            if (!cols[10]) {
                cols[10] = ""
            }
            if (!cols[9]) {
                cols[9] = new Date().getTime().toString()
            }
            // console.log("cols:", cols)
            let newMember = {
                personalId: cols[0] || uuidv4(),
                name: cols[1] || "",
                title: cols[2] || "",
                division: cols[3] || "",
                department: cols[4] || "",
                mobilePhone: cols[5] || "",
                email: cols[6] || "",
                lineId: cols[7] || "",
                wechatId: cols[8] || "",
                index: +cols[9],
                referrer: cols[10].toString().trim()
            }
            memberUploads.push({
                personalId: newMember.personalId.toString().trim(),
                name: newMember.name.toString().trim(),
                title: newMember.title.toString().trim(),
                division: newMember.division.toString().trim(),
                department: newMember.department.toString().trim(),
                mobilePhone: newMember.mobilePhone.toString().trim(),
                email: newMember.email.toString().trim(),
                lineId: newMember.lineId.toString().trim(),
                wechatId: newMember.wechatId.toString().trim(),
                index: +cols[9],
                referrer: cols[10].toString().trim()
            })
        }
    }

    for (const memberUpload of memberUploads) {
        /**
         * 檢查Member主檔是否存在
         */
        const memberSnapshot = await memberService.getMemberByMobilePhoneAndName(memberUpload.mobilePhone, memberUpload.name)
        let member: Member
        if (memberSnapshot.empty) {
            console.log("====Member不存在====")
            // 不存在則建立Member
            if (!memberUpload.index) {
                memberUpload.index = new Date().getTime()
            }
            member = {
                id: memberUpload.personalId,
                name: memberUpload.name,
                title: memberUpload.title,
                division: memberUpload.division,
                department: memberUpload.department,
                email: memberUpload.email,
                mobilePhone: memberUpload.mobilePhone,
                lineId: memberUpload.lineId,
                wechatId: memberUpload.wechatId,
                role: "customer",
                index: memberUpload.index,           
                unReadMessages: 0
            }
        } else {
            // 若存在則檢查是否更新職稱、部門、單位
            member = memberSnapshot.docs[0].data() as Member
            // if (memberUpload.title && memberUpload.title !== "")
            //     member.title = memberUpload.title
            if (memberUpload.division && memberUpload.division !== "")
                member.division = memberUpload.division
            if (memberUpload.department && memberUpload.department !== "")
                member.department = memberUpload.department

            // // 若存在則檢查是否更新LineId、WeChatId
            // if (memberUpload.lineId && memberUpload.lineId !== "")
            //     member.lineId = memberUpload.lineId
            // if (memberUpload.wechatId && memberUpload.wechatId !== "")
            //     member.wechatId = memberUpload.wechatId
        }
        await memberService.setMember(member)

        console.log("--------------------------------------------------")
    }

    res.sendStatus(200)
})
router.post("/updateMember", async (req, res) => {
    const content: Member = req.body
    console.log("updateMember:", content)

    let newMember: Member = {
        ...content
    }

    await memberService.setMember(newMember).then(success => {
        res.sendStatus(200)
    }).catch(err => {
        res.sendStatus(403)
    })

    console.log("--------------------------------------------------")

})
router.delete("/deleteMember/:memberId", async (req, res) => {
    let memberId: string = req.params.memberId

    await memberService.deleteMember(memberId).then(success => {
        res.sendStatus(200)
    }).catch(err => {
        res.sendStatus(403)
    })

})

export default router
