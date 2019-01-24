import { Router } from "express"
import { v4 as uuidv4 } from "uuid"
import * as XLSX from 'xlsx'
import * as admin from 'firebase-admin';
import * as userService from "./services/userService"
import { User, Group, BatchGroup } from "./model"


const router = Router()

router.post("/importUsers", async (req, res) => {
    let base64String = req.body.file;
    let base64Image = base64String.split(';base64,').pop();
    /* data is a node Buffer that can be passed to XLSX.read */
    let workbook = XLSX.read(base64Image, { type: 'base64' });
    let data: string[][] = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });

    let userUploads = new Array<User>()

    for (let i = 1; i < data.length; i++) {
        let cols = data[i]
        if (cols.length >= 3) {
            let newData = {
                name: cols[0] || "",
                email: cols[1] || "",
                role: cols[2] || "staff"
            }
            userUploads.push({
                id: uuidv4(),
                name: newData.name.toString().trim(),
                email: newData.email.toString().trim(),
                role: newData.role.toString().trim() as User['role']
            })
        }
    }

    for (let userUpload of userUploads) {
        /**
         * 檢查User主檔是否存在
         */
        await createUser(userUpload)
        console.log("--------------------------------------------------")
    }

    res.sendStatus(200)
})
router.post("/createUser", async (req, res) => {
    const content: User = req.body
    console.log("createUser:", content)

    let userUpload: User = {
        id: uuidv4(),
        name: content.name.toString().trim(),
        email: content.email.toString().trim(),
        role: content.role.toString().trim() as User['role']
    }
    let createResult = await createUser(userUpload).then(success => {
        res.status(200).send(success)
    }).catch(err => {
        res.sendStatus(403)
    })
    console.log("--------------------------------------------------")
})
router.put("/updateUser", async (req, res) => {
    const content: User = req.body
    console.log("updateUser:", content)

    let userUpload: User = {
        id: content.id.toString().trim(),
        name: content.name.toString().trim(),
        email: content.email.toString().trim(),
        role: content.role.toString().trim() as User['role']
    }

    /**
     * 檢查User主檔是否存在
     */
    const userSnapshot = await userService.getUserById(userUpload.id)

    if (!userSnapshot || userSnapshot == null) {
        console.log("====User不存在====")
        // 不存在則建立User

        if (!userUpload.id || userUpload.id == "") {
            userUpload.id = uuidv4()
        }

    } else {

        let user = userSnapshot

        if (userUpload.email && userUpload.email !== "") {
            user.email = userUpload.email
        }
        if (userUpload.name && userUpload.name !== "") {
            user.name = userUpload.name
        }
        if (userUpload.role) {
            user.role = userUpload.role
        }
        await userService.setUser(user)
    }

    console.log("--------------------------------------------------")

    res.sendStatus(200)
})
router.delete("/deleteUser/:userId", async (req, res) => {
    const userId: string = req.params.userId || ""
    console.log("deleteUser:", userId)
    /**
     * 檢查User主檔是否存在
     */
    const userSnapshot = await userService.getUserById(userId.toString().trim())

    if (!userSnapshot || userSnapshot == null) {
        console.log("====User不存在====")
        res.sendStatus(403)
    } else {
        let user = userSnapshot
        await userService.deleteUser(user.id)
        await deleteFirebaseAccount(userId).then(success => {
            res.status(200).send(success)
        }).catch(err => {
            res.sendStatus(403)
        })
    }
    console.log("--------------------------------------------------")
})
function createFirebaseAccount(email: string, password: string, name: string) {
    return admin.auth().createUser({
        email: email,
        password: password,
        displayName: name
    });
}
function deleteFirebaseAccount(uid: string) {
    return admin.auth().deleteUser(uid)
}
function getFirebaseAccount(email: string) {
    return admin.auth().getUserByEmail(email)
}
function createUser(userUpload: User) {
    return new Promise(async (resolve, reject) => {
        const userSnapshot = await userService.getUserByEmail(userUpload.email)

        if (userSnapshot.empty) {
            console.log("====User不存在====")
            // 不存在則建立User
            let getAuthResult = await getFirebaseAccount(userUpload.email).catch(error => {
                // console.log("getAuthResult error:", error)
            })
            if (!getAuthResult || getAuthResult == null) {
                let firebaseAuthInfo = await createFirebaseAccount(userUpload.email, uuidv4(), userUpload.name).catch(error => {
                    // console.log("firebaseAuth error:", error)
                    reject()
                })
                if (firebaseAuthInfo && firebaseAuthInfo != null) {
                    // console.log("firebaseAuthInfo:", firebaseAuthInfo)
                    userUpload.id = firebaseAuthInfo.uid
                    await userService.setUser(userUpload)
                }
            } else {
                // console.log("getAuthResult:", getAuthResult)
                userUpload.id = getAuthResult.uid
                await userService.setUser(userUpload)
            }
        } else {
            // userUpload = userSnapshot.docs[0].data() as User
            // if (userUpload.email && userUpload.email !== "") {
            //     userUpload.email = userUpload.email.trim()
            // }

        }
        resolve(userUpload);
    })
}
export default router