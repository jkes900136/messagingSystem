import { Router } from "express"
import { v4 as uuidv4 } from "uuid"
import * as Moment from "moment-timezone"
import * as menuService from './services/menuService'
import * as memberService from "./services/memberService"
import * as receiverService from "./services/receiverService"

import { jsonMember, Item, Member, MemberOrganization } from "./model"

const router = Router()
router.post("/connectSQL", async (req, res) => {
    const recordsets = req.body as any[]
    console.log("----connectSQL body-------------")
    console.log(JSON.stringify(recordsets, null, 4))
    res.sendStatus(200)

    if (recordsets[0].memberName) {
        await importMemberRecordset(recordsets)
    } else if (recordsets[0].workName == "拜訪") {
        await importVisitActivityRecordset(recordsets)
    } else if (recordsets[0].workName == "課程") {
        await importCourseActivityRecordset(recordsets)
    }
})

/**
 * 課程model轉換
 * @param recordsets
 */
const importCourseActivityRecordset = async (recordsets) => {
    let activity: Item
    let activityUploads: Item[] = []

    for (const data of recordsets) {
        let start = Moment(data.startDate).format("YYYY/MM/DD")
        let end = Moment(data.endDate).format("YYYY/MM/DD")
        activity = {
            id: data.id,
            name: data.courseName.trim(),
            index: new Date(start).getTime(),
            data: {
                period: start + " - " + end,
                address: data.address.trim(),
                location: data.location.trim(),
                time: "",
            }
        }
        activityUploads.push(activity)
    }

    console.log("----------Course------------", activityUploads)
    await importCourseActivity(activityUploads)
}

/**
 * 拜訪model轉換
 * @param recordsets 
 */
const importVisitActivityRecordset = async (recordsets) => {
    let activity: Item
    let activityUploads: Item[] = []

    for (const data of recordsets) {
        let start = Moment(data.startDate).format("YYYY/MM/DD")
        let end = Moment(data.endDate).format("YYYY/MM/DD")
        activity = {
            id: data.id,
            name: data.cityName.trim() + "拜訪 (" + start + " - " + end + ")",
            index: new Date(start).getTime(),
            data: {
                period: start + " - " + end,
                address: data.address.trim(),
                location: data.location.trim(),
                time: "",
                invitationUrl: data.invitationUrl,
                nursingUrl: data.nursingUrl,
                volunteerUrl: data.volunteerUrl
            }
        }
        activityUploads.push(activity)
    }

    console.log("-----------Visit------------", activityUploads)
    await importVisitActivity(activityUploads)
}

/**
 * 成員model轉換
 * @param recordsets 
 */
const importMemberRecordset = async (recordsets) => {
    let member: jsonMember
    let memberUploads: jsonMember[] = []
    for (const data of recordsets) {
        console.log("-------SQLDB member result---------\n", data)
        let date = data.meetingDate.replace("年", "/").replace("月", "/").replace("日", "/")
        member = {
            memberId: data.memberId,
            organizationId: data.participantId,
            personalId: "",
            name: data.memberName,
            title: "",
            division: data.division,
            department: data.department,
            mobilePhone: data.mobilePhone,
            email: data.email,
            lineId: data.lineId,
            wechatId: data.wechatId,
            meetingDate: date,
            meetingTime: data.meetingTime ? data.meetingTime : "",
            meetingLocation: data.meetingLocation,
            preEventMeeting: data.preEventMeeting,
            unitIndex: 0,
            referrer: ""
        }
        memberUploads.push(member)
    }

    const nodeSnapshot = await receiverService.getReceiverByNameAndParentId(recordsets[0].visitFlowName.trim(), recordsets[0].sessionId)
    console.log("-------組織根節點ID---------\n", nodeSnapshot.docs[0].data().id)
    await importMember(memberUploads, nodeSnapshot.docs[0].data().id)
}

/**
 * 同步課程梯次
 * @param activityUploads 
 */
const importCourseActivity = async (activityUploads: Item[]) => {
    for (const activityUpload of activityUploads) {
        if (activityUpload.name != "") {

            let memberReceiverBefore: MemberOrganization = {
                id: uuidv4(),
                name: "課前",
                type: "department",

                index: new Date().getTime(),
                childrenId: [],
                parentId: activityUpload.id
            }

            let memberReceiverAfter: MemberOrganization = {
                id: uuidv4(),
                name: "課中",
                type: "department",
                index: new Date().getTime(),
                childrenId: [],
                parentId: activityUpload.id
            }

            await menuService.setBeforeCourseActivity(activityUpload)
            console.log("====課前梯次建立 / 更新成功====")
            memberReceiverBefore.parentId = activityUpload.id

            await menuService.setAfterCourseActivity(activityUpload)
            console.log("====課中梯次建立 / 更新成功====")
            memberReceiverAfter.parentId = activityUpload.id


            const snapshotBefore = await receiverService.getReceiverByNameAndParentId("課前", memberReceiverBefore.parentId)
            if (!snapshotBefore.empty)
                memberReceiverBefore = snapshotBefore.docs[0].data() as MemberOrganization

            const snapshotAfter = await receiverService.getReceiverByNameAndParentId("課中", memberReceiverAfter.parentId)
            if (!snapshotAfter.empty)
                memberReceiverAfter = snapshotAfter.docs[0].data() as MemberOrganization

            // 建立/更新 成員組織根節點
            await receiverService.setReceiver(memberReceiverBefore)
            await receiverService.setReceiver(memberReceiverAfter)
            console.log("====課前 / 中成員組織根節點建立成功====")
        }
    }
}

/**
 * 同步拜訪梯次
 * @param activityUploads
 */
const importVisitActivity = async (activityUploads: Item[]) => {
    for (const activityUpload of activityUploads) {
        if (activityUpload.name != "") {
            // const beforeActivities = await menuService.getBeforeActivityByNmae(activityUpload.name)
            // const afterActivities = await menuService.getAfterActivityByNmae(activityUpload.name)

            let memberReceiverBefore: MemberOrganization = {
                id: uuidv4(),
                name: "拜訪前",
                type: "department",
                parentId: activityUpload.id,
                index: new Date().getTime(),
                childrenId: []
            }

            let memberReceiverAfter: MemberOrganization = {
                id: uuidv4(),
                name: "拜訪後",
                type: "department",
                parentId: activityUpload.id,
                index: new Date().getTime(),
                childrenId: []
            }

            await menuService.setBeforeActivity(activityUpload)
            console.log("====拜訪前梯次建立 / 更新成功====")
            memberReceiverBefore.parentId = activityUpload.id

            await menuService.setAfterActivity(activityUpload)
            console.log("====拜訪後梯次建立 / 更新成功====")
            memberReceiverAfter.parentId = activityUpload.id


            const snapshotBefore = await receiverService.getReceiverByNameAndParentId("拜訪前", memberReceiverBefore.parentId)
            if (!snapshotBefore.empty)
                memberReceiverBefore = snapshotBefore.docs[0].data() as MemberOrganization

            const snapshotAfter = await receiverService.getReceiverByNameAndParentId("拜訪後", memberReceiverAfter.parentId)
            if (!snapshotAfter.empty)
                memberReceiverAfter = snapshotAfter.docs[0].data() as MemberOrganization

            // 建立/更新 成員組織根節點
            await receiverService.setReceiver(memberReceiverBefore)
            await receiverService.setReceiver(memberReceiverAfter)
            console.log("====拜訪前 / 後成員組織根節點建立成功====")
        }
    }
}

/**
 * 同步成員名單
 * @param memberUploads 
 * @param nodeId 
 */
const importMember = async (memberUploads: jsonMember[], nodeId: string) => {
    const rootSnapshot = await receiverService.getReceiverById(nodeId)
    if (!rootSnapshot.empty) {
        console.log("====組織根節點存在====")
        const rootOrg = rootSnapshot.docs[0].data() as MemberOrganization
        for (const memberUpload of memberUploads) {
            /**
             * Member主檔是否存在
             */
            // const memberSnapshot = await memberService.getMembersByMobilePhoneAndName(memberUpload.mobilePhone.trim(), memberUpload.name.trim())
            const memberSnapshot = await memberService.getMemberByAnyId(memberUpload.memberId)
            let member: Member
            if (memberSnapshot.empty) {
                console.log("====Member不存在====")
                // 不存在則建立Member
                member = {
                    id: memberUpload.memberId,
                    name: memberUpload.name.trim(),
                    title: memberUpload.title.trim(),
                    division: memberUpload.division.trim(),
                    department: memberUpload.department.trim(),
                    email: memberUpload.email.trim(),
                    mobilePhone: memberUpload.mobilePhone.trim(),
                    lineId: memberUpload.lineId ? memberUpload.lineId.trim() : "",
                    wechatId: memberUpload.wechatId ? memberUpload.wechatId.trim() : "",
                    data: {
                        meetingDate: memberUpload.meetingDate ? memberUpload.meetingDate.trim() : "",
                        meetingTime: memberUpload.meetingTime ? memberUpload.meetingTime.trim() : "",
                        meetingLocation: memberUpload.meetingLocation ? memberUpload.meetingLocation.trim() : "",
                        preEventMeeting: memberUpload.preEventMeeting ? memberUpload.preEventMeeting.trim() : "",
                    },
                    role: "customer",
                    index: new Date().getTime(),                 
                    unReadMessages: 0
                }
            } else {
                console.log("====Member已存在====")
                // 若存在則檢查是否更新職稱、部門、單位、電話、Email
                member = memberSnapshot.docs[0].data() as Member
                if (memberUpload.name && memberUpload.name !== "")
                    member.name = memberUpload.name.trim()
                if (memberUpload.email && memberUpload.email !== "")
                    member.email = memberUpload.email.trim()
                if (memberUpload.mobilePhone && memberUpload.mobilePhone !== "")
                    member.mobilePhone = memberUpload.mobilePhone.trim()
                if (memberUpload.title && memberUpload.title !== "")
                    member.title = memberUpload.title.trim()
                if (memberUpload.division && memberUpload.division !== "")
                    member.division = memberUpload.division.trim()
                if (memberUpload.department && memberUpload.department !== "")
                    member.department = memberUpload.department.trim()
                if (memberUpload.meetingDate && memberUpload.meetingDate !== "")
                    member.data.meetingDate = memberUpload.meetingDate.trim()
                if (memberUpload.meetingTime && memberUpload.meetingTime !== "")
                    member.data.meetingTime = memberUpload.meetingTime.trim()
                if (memberUpload.meetingLocation && memberUpload.meetingLocation !== "")
                    member.data.meetingLocation = memberUpload.meetingLocation.trim()
                if (memberUpload.preEventMeeting && memberUpload.preEventMeeting !== "")
                    member.data.preEventMeeting = memberUpload.preEventMeeting.trim()

                // 若存在則檢查是否更新LineId、WeChatId
                if (memberUpload.lineId && memberUpload.lineId !== "")
                    member.lineId = memberUpload.lineId.trim()
                if (memberUpload.wechatId && memberUpload.wechatId !== "")
                    member.wechatId = memberUpload.wechatId.trim()
            }
            await memberService.setMember(member)
            console.log("====member建立 / 更新成功====")
            if (rootOrg.type == "department") {
                if (rootOrg.childrenId.indexOf(member.id) < 0)
                    rootOrg.childrenId.push(member.id)
            }

            let parentId = nodeId
            if (memberUpload.division && memberUpload.division !== "") {
                /**
                 * 檢察部門是否存在
                 */
                const divsionSnapshot = await receiverService.getReceiverByNameAndParentId(memberUpload.division.trim(), nodeId)
                let divsionReceiver: MemberOrganization
                if (divsionSnapshot.empty) {
                    console.log("====Divsion不存在====")
                    // 不存在則建立部門
                    divsionReceiver = {
                        id: uuidv4(),
                        name: memberUpload.division.trim(),
                        type: "department",
                        parentId: nodeId,
                        index: memberUpload.unitIndex,
                        childrenId: [member.id]

                    }
                } else {
                    console.log("====Divsion存在====")
                    divsionReceiver = divsionSnapshot.docs[0].data() as MemberOrganization
                    if (divsionReceiver.type == "department") {
                        if (divsionReceiver.childrenId.indexOf(member.id) < 0) {
                            console.log("====將member存進Divsion====")
                            divsionReceiver.childrenId.push(member.id)
                        }
                    }
                }
                await receiverService.setReceiver(divsionReceiver)
                parentId = divsionReceiver.id
            }

            if (memberUpload.department && memberUpload.department !== "") {
                /**
                 * 檢查單位是否存在
                 */
                const departmentSnapshot = await receiverService.getReceiverByNameAndParentId(memberUpload.department.trim(), parentId)
                let departmentReceiver: MemberOrganization
                if (departmentSnapshot.empty) {
                    console.log("====Department不存在====")
                    // 不存在則建立單位
                    departmentReceiver = {
                        id: uuidv4(),
                        name: memberUpload.department.trim(),
                        type: "department",
                        parentId: parentId,
                        index: new Date().getTime(),
                        childrenId: [member.id]

                    }
                } else {
                    console.log("====Department存在====")
                    departmentReceiver = departmentSnapshot.docs[0].data() as MemberOrganization
                    if (departmentReceiver.type == "department") {
                        if (departmentReceiver.childrenId.indexOf(member.id) < 0) {
                            console.log("====將member存進Department====")
                            departmentReceiver.childrenId.push(member.id)
                        }
                    }
                }
                await receiverService.setReceiver(departmentReceiver)
                parentId = departmentReceiver.id
            }


            /**
             * 檢查此部門單位是否已有此成員
             */
            const memberOrgSnapshot = await receiverService.getReceiverByNameAndParentId(memberUpload.name.trim(), parentId)
            if (memberOrgSnapshot.empty) {
                console.log("====MemberReceiver不存在====")
                // 不存在則建立成員節點
                const memberReceiver: MemberOrganization = {
                    id: memberUpload.organizationId,
                    name: memberUpload.name.trim(),
                    type: "member",
                    memberId: member.id,
                    parentId: parentId,
                    index: new Date().getTime()

                }
                await receiverService.setReceiver(memberReceiver)
            } else {
                console.log("====MemberReceiver存在====")
            }

            console.log("--------------------------------------------------")
        }
        await receiverService.setReceiver(rootOrg)
    } else {
        console.log("====組織根節點不存在====")
    }
}

export default router