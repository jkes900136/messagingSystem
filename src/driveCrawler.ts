import { Router } from "express"
import * as config from './config';
import * as googleDrive from "./services/driveService"
var fs = require('fs');
const router = Router()

// Rate limiting middleware
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the RateLimit-* headers
    legacyHeaders: false, // Disable the X-RateLimit-* headers
});
router.use(limiter);
router.post('/crawler', async function (req, res) {
    console.log("crawler");
    const auth = await googleDrive.authorize();
    let t1, t2, t3;
    t1 = new Date();

    const now = +Date.now()
    await googleDrive.rename({
        "name": config.rootFolderName,
        "sid": 0,
        "fullName": config.rootFolderName,
        "parents": config.publicFolderId,
        "parentsName": [
            {
                "name": "Module",
                "fullName": "Module",
                "id": config.publicFolderId
            }
        ],
        "id": config.rootFolderId,
        "docId": config.rootFolderId,
        "mimeType": "application/vnd.google-apps.folder",
        modifiedDate: 9999999999999,
        modifiedTime: 9999999999999,
        createdTime: 9999999999999
    })
    let fileList = await googleDrive.listFiles(auth, config.rootFolderId, [{ fullName: config.rootFolderName, name: config.rootFolderName, id: config.rootFolderId }], now)
        .catch(err => {
            console.log("error:", err)
            res.status(403).send("list file failed")
        })
    await googleDrive.deleteFilesForSync(200, now, config.rootFolderId).catch(err => {
        console.log("error:", err)
        // res.status(403).send("delete file failed")
    })
    t2 = new Date();
    console.log("D1:", t2.getTime() - t1.getTime());
    res.status(200).send({ ok: "OK" })
});

router.post('/anyCrawler', async function (req, res) {
    console.log("anyCrawler");
    const rootFolderId = req.body.rootFolderId
    const rootFolderName = req.body.rootFolderName
    let setNow = true
    const auth = await googleDrive.authorize();
    if (req.body.setNow == "false") {
        setNow = false
    } else {
        setNow = true
    }
    let t1, t2, t3;
    t1 = new Date();
    const now = +Date.now()
    let fileList = await googleDrive.listFiles(auth, rootFolderId, [{ fullName: rootFolderName, name: rootFolderName, id: rootFolderId }], now)
        .catch(err => {
            console.log("error:", err)
            res.status(403).send("list file failed")
        })
    if (setNow) {
        await googleDrive.deleteFilesForSync(200, now, rootFolderId).catch(err => {
            console.log("error:", err)
            // res.status(403).send("failed")
        })
    }
    t2 = new Date();
    console.log("D1:", t2.getTime() - t1.getTime());
    res.status(200).send({ ok: "OK" })
});

router.post('/uploadFile', async function (req, res) {
    console.log("uploadFile");
    const mimeType = req.headers["content-type"]
    const name = req.body.filename
    const path = req.body.path
    console.log("req.headers:", mimeType + " " + name + " " + path);
    const auth = await googleDrive.authorize();
    let t1, t2;
    t1 = new Date();
    const now = +Date.now()
    // let fileList = "uploadFile"
    let base64String = req.body.file;
    let base64Image = base64String.split(';base64,').pop();
    fs.writeFile(`fileTemp`, base64Image, { encoding: 'base64' }, async function (err) {
        let fileList = await googleDrive.createFileWithFile(auth, name, path, mimeType, now)
            .catch(err => {
                console.log("error:", err)
                res.status(403).send("failed")
            })
        t2 = new Date();
        console.log("D1:", t2.getTime() - t1.getTime());
        res.status(200).send({ fileList })
    })
});
router.post('/createFolder', async function (req, res) {
    console.log("createFolder");
    const name = req.body.name
    const parent = req.body.parent
    console.log("name:", name);
    const auth = await googleDrive.authorize();
    let t1, t2, t3;
    t1 = new Date();
    const now = +Date.now()
    let fileList = await googleDrive.createFile(auth, name, parent, "folder", now)
        .catch(err => {
            console.log("error:", err)
            res.status(403).send("failed")
        })
    t2 = new Date();
    console.log("D1:", t2.getTime() - t1.getTime());
    res.status(200).send({ ok: "ok" })
});
router.delete('/deleteFile', async function (req, res) {
    console.log("deleteFile");
    const fileId = req.query.fileId
    console.log("fileId:", fileId);
    const auth = await googleDrive.authorize();
    let t1, t2, t3;
    t1 = new Date();
    let fileList = await googleDrive.deleteFile(auth, fileId)
        .catch(err => {
            console.log("error:", err)
            res.status(403).send("failed")
        })
    t2 = new Date();
    console.log("D1:", t2.getTime() - t1.getTime());
    res.status(200).send({ fileList })
});
router.patch('/renameFile', async function (req, res) {
    console.log("renameFile");
    const fileId = req.query.fileId
    const name = req.body.name
    console.log("fileId:", fileId);
    console.log("name:", name);
    const auth = await googleDrive.authorize();
    let t1, t2, t3;
    t1 = new Date();
    const now = +Date.now()
    let fileList = await googleDrive.renameFile(auth, fileId, name, now)
        .catch(err => {
            console.log("error:", err)
            res.status(403).send("failed")
        })
    t2 = new Date();
    console.log("D1:", t2.getTime() - t1.getTime());
    res.status(200).send({ fileList })
});
router.patch('/moveFile', async function (req, res) {
    console.log("moveFile");
    const fileId = req.query.fileId
    const folderId = req.body.folderId
    console.log("fileId:", fileId);
    console.log("folderId:", folderId);
    const auth = await googleDrive.authorize();
    let t1, t2, t3;
    t1 = new Date();
    const now = +Date.now()
    let fileList = await googleDrive.moveFile(auth, fileId, folderId, now)
        .catch(err => {
            console.log("error:", err)
            res.status(403).send("failed")
        })
    t2 = new Date();
    console.log("D1:", t2.getTime() - t1.getTime());
    res.status(200).send({ fileList })
});

export default router
