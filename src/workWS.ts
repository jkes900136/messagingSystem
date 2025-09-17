import { Router } from "express"
import { v4 as uuidv4 } from "uuid"
import * as driveService from "./services/driveService"
import rateLimit from "express-rate-limit";
import * as receiverService from "./services/receiverService"
import * as workService from "./services/workService"
import { Work, Task, Item, Flow, WorkUpload, MemberOrganization } from "./model"
import * as config from './config';

const router = Router()

// Set up rate limiter: max 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
});
// Apply rate limiter to all routes in this router
router.use(limiter);

router.post("/createWorks", async (req, res) => {
    const workUploads = req.body as WorkUpload[]

    for (const workUpload of workUploads) {
        console.log(JSON.stringify(workUpload, null, 4))
        let work: Work
        let task: Task
        if (workUpload.work != "") {
            const works = await workService.getWorkByName(workUpload.work)
            /**
             * 檢查主功能 Work是否存在
             */
            if (works.length == 0) {
                // 不存在則建立
                console.log("====建立Work====", workUpload.work)
                const newWork: Work = {
                    id: uuidv4(),
                    name: workUpload.work,
                    index: workUpload.index
                }
                await workService.setWork(newWork)
                work = newWork

            } else
                work = works[0]

            /**
             * 次選項 Task
             */
            if (workUpload.task != "") {
                const tasks = await workService.getTaskByName(work.id, workUpload.task)
                let memberReceiver: MemberOrganization = {
                    id: uuidv4(),
                    name: workUpload.task,
                    type: "department",

                    index: new Date().getTime(),
                    childrenId: [],
                    parentId: ""
                }

                if (tasks.length == 0) {
                    // 不存在則建立
                    console.log("====建立Task====", workUpload.task)
                    const newTask: Task = {
                        id: uuidv4(),
                        name: workUpload.task,
                        index: +workUpload.index
                    }
                    await workService.setTask(work.id, newTask)
                    memberReceiver.parentId = newTask.id

                    task = newTask
                } else {
                    task = tasks[0]
                    memberReceiver.parentId = tasks[0].id
                }

                if (workUpload.activity == "") {
                    const snapshot = await receiverService.getReceiverByNameAndParentId(workUpload.task, memberReceiver.parentId)
                    if (!snapshot.empty)
                        memberReceiver = snapshot.docs[0].data() as MemberOrganization

                    // 建立/更新 成員組織根節點
                    console.log("====建立成員組織根節點====")
                    await receiverService.setReceiver(memberReceiver)
                }

                const now = +Date.now()
                await driveService.authorize().then(auth => {
                    return driveService.getFileByName(workUpload.work).then(async businessFolder => {
                        let businessFolderInfo = { id: "" }
                        if (businessFolder.empty) {
                            await driveService.createFile(auth, workUpload.work, config.rootFolderId, "folder", now).then(folderId => {
                                console.log("folderId:", folderId)
                                businessFolderInfo = { id: folderId }
                            }).catch(err => {
                                console.log("error:", err.response)
                            })

                        } else {
                            businessFolderInfo = { id: businessFolder.docs[0].data().id }
                        }
                        // if (!businessFolder.empty) {
                        return driveService.getFileByName(workUpload.task).then(async folders => {
                            if (folders.empty) {
                                return driveService.createFile(auth, workUpload.task, businessFolderInfo.id, "folder", now).then(folderId => {
                                    console.log("folderId:", folderId)

                                }).catch(err => {
                                    console.log("error:", err.response)
                                })
                            }
                        })
                        // }
                    })
                })
            }

            /**
             * 活動 Item
             */
            if (workUpload.activity != "") {
                const activities = await workService.getItemByName(work.id, task.id, workUpload.activity)

                let memberReceiver: MemberOrganization = {
                    id: uuidv4(),
                    name: workUpload.task,
                    type: "department",

                    index: new Date().getTime(),
                    childrenId: [],
                    parentId: ""
                }

                if (activities.length == 0) {
                    // 不存在則建立
                    console.log("====建立Item====", workUpload.activity)
                    const activity: Item = {
                        id: uuidv4(),
                        name: workUpload.activity,              
                        index: +workUpload.index,
                        data: {
                            period: workUpload.date,                          
                            time: workUpload.time,
                            address: workUpload.address,
                            location: workUpload.location,
                            invitationUrl: workUpload.invitationUrl,
                            nursingUrl: workUpload.nursingUrl,
                            volunteerUrl: workUpload.volunteerUrl
                        }
                    }
                    await workService.setItem(work.id, task.id, activity)
                    memberReceiver.parentId = activity.id

                } else
                    memberReceiver.parentId = activities[0].id

                const snapshot = await receiverService.getReceiverByNameAndParentId(workUpload.task, memberReceiver.parentId)
                if (!snapshot.empty)
                    memberReceiver = snapshot.docs[0].data() as MemberOrganization

                // 建立/更新 成員組織根節點
                console.log("====建立成員組織根節點====")
                await receiverService.setReceiver(memberReceiver)
            }
        }
    }


    res.sendStatus(200)
})

export default router