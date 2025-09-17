import { Router } from "express"
import { firestore } from "firebase-admin"
import * as memberService from "./services/memberService"
import { RecordDetail, MessageRecord } from "./model"

const router = Router()

router.get("/urlRedirect", (req, res) => {
    const url = req.query.url
    const trackId = req.query.trackId
    if (trackId != "system") {
        urlOpender(trackId)
    }
    if (isSafeRedirectTarget(url)) {
        res.redirect(url)
    } else {
        res.redirect("/")
    }
})
router.post("/memberTimer", (req, res) => {
    let member = req.body

    if (member.session == "recent") {
        setTimeout(function () {
            console.log("1 minute")
            let newMember = { ...member, session: "active" }
            memberService.setMember(newMember)

        }, 60000)
    }
    else if (member.session == "active") {
        setTimeout(function () {
            console.log("5 minutes")
            let newMember = { ...member, session: "sleep" }
            memberService.setMember(newMember)
        }, 240000)
    }
    res.sendStatus(200)
})
const urlOpender = async (trackId: string) => {
    const messageRecordId = trackId.substring(0, 20)
    const recordDetailId = trackId.substring(20)

    const messageRecordRef = firestore().collection("MessageRecord").doc(messageRecordId)
    const recordDetailRef = messageRecordRef.collection("RecordDetail").doc(recordDetailId)

    await firestore().runTransaction(async t1 => {
        await t1.get(messageRecordRef).then(async messageRecordDoc => {
            if (messageRecordDoc.exists) {
                let messageRecord = messageRecordDoc.data() as MessageRecord

                await firestore().runTransaction(async t2 => {
                    await t2.get(recordDetailRef).then(async recordDetailDoc => {
                        if (recordDetailDoc.exists) {
                            let recordDetail = recordDetailDoc.data() as RecordDetail
                            // if (recordDetail.readTime == null) {
                            //     recordDetail.readTime = new Date().getTime()
                            //     messageRecord.readCount += 1
                            // }
                            await t2.update(recordDetailRef, recordDetail)
                        }
                    })
                })

                await t1.update(messageRecordRef, messageRecord)
            }
        })
    })

    // const messageRecordSnapshot = await getMessageRecordById(messageRecordId)
    // if (messageRecordSnapshot.exists) {
    //     let messageRecord = messageRecordSnapshot.data() as MessageRecord

    //     const recordDetailSnapshot = await getRecordDetailById(messageRecordId, recordDetailId)
    //     if (recordDetailSnapshot.exists) {
    //         let recordDetail = recordDetailSnapshot.data() as RecordDetail
    //         if (recordDetail.readTime == null) {
    //             recordDetail.readTime = new Date().getTime()
    //             messageRecord.readCount += 1

    //             await updateRecordDetail(messageRecordId, recordDetail)
    //             await updateMessageRecord(messageRecord)
    //         }
    //     }
    // }
}

// Allow only relative URLs as redirect targets
function isSafeRedirectTarget(url: any): boolean {
    // Only allow string, and only relative URLs (no protocol, no domain)
    if (typeof url !== "string") return false;
    // Disallow protocol-relative and fully qualified URLs
    if (/^(\w+:)?\/\//.test(url)) return false;
    // Disallow absolute file-system paths (optional)
    // Optionally, allow only URLs starting with /
    if (!url.startsWith("/")) return false;
    // Optionally, add further path sanitization here
    return true;
}

// router.get("/syncGAData", async (req, res) => {
//     const records = await getMessageRecord()
//     const excuPromises = new Array<Promise<any>>()

//     for (const record of records) {
//         if (record.label.trackId !== null && record.label.trackId !== "") {
//             const messageRecordId = record.label.trackId.substring(0, 20)
//             const recordDetailId = record.label.trackId.substring(20)

//             if (messageRecordId !== "" && recordDetailId !== "") {
//                 const recordDetailSnapshot = await getRecordDetailById(messageRecordId, recordDetailId)
//                 if (recordDetailSnapshot.exists) {
//                     let recordDetail = recordDetailSnapshot.data() as RecordDetail
//                     recordDetail.readTime = record.duration
//                     recordDetail.readCount = record.count
//                     recordDetail.isRead = true
//                     excuPromises.push(updateRecordDetail(messageRecordId, recordDetail))
//                 }
//             }
//         }
//     }

//     await Promise.all(excuPromises)
//     res.sendStatus(200)
// })

// router.get("/calculate", async (req, res) => {
//     const messageRecordsSnapshot = await getMessageRecords()
//     if (!messageRecordsSnapshot.empty) {
//         for (const messageRecordDoc of messageRecordsSnapshot.docs) {
//             let messageRecord = messageRecordDoc.data() as MessageRecord
//             const recordDetailsSnapshot = await getRecordDetails(messageRecordDoc.id)

//             if (!recordDetailsSnapshot.empty) {
//                 let readCount = 0
//                 for (const recordDetailDoc of recordDetailsSnapshot.docs) {
//                     const recordDetail = recordDetailDoc.data() as RecordDetail
//                     if (recordDetail.isRead) readCount += 1
//                 }
//                 messageRecord.readCount = readCount
//                 await messageRecordDoc.ref.update(messageRecord)
//             }
//         }
//     }
//     res.sendStatus(200)
// })

// const getMessageRecord = async (): Promise<GARecord[]> => {
//     const auth = authorize()
//     const range = encodeURI("!A16:E")
//     const result = await readSheet(auth, gaSpreadsheetId, range)
//     const records = new Array<GARecord>()

//     for (const row of result) {
//         records.push({
//             action: row[0],
//             label: JSON.parse(row[1]),
//             count: parseInt(row[3]),
//             duration: parseInt(row[4])
//         })
//     }
//     return records
// }

export default router