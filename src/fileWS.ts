import { Router } from "express"
import * as driveService from './services/driveService';
import * as config from './config';
import { google } from "googleapis"
import axios from 'axios'
import { Stream } from 'stream';
let fs = require('fs');
import * as mime from "mime"
import * as admin from 'firebase-admin';

const router = Router()
router.get('/getFile', async function (req, res) {
    const auth = await driveService.authorize()
    const drive = google.drive({ version: 'v3', auth });
    const fileId = req.query.fileId;
    // Validate fileId: must be a plausible Drive file ID (alphanum, _, -, length 20-100)
    if (typeof fileId !== "string" || !/^[a-zA-Z0-9_-]{20,100}$/.test(fileId)) {
        return res.status(400).send('Invalid fileId');
    }

    driveService.getFileById(fileId).then(async doc => {
        if (doc.exists) {
            let file = doc.data()
            // res.contentType("arraybuffer")
            res.setHeader('content-type', 'arraybuffer');
            res.setHeader("Content-Disposition", "attachment; filename=" + encodeURI(file.name) + "." + mime.getExtension(file.mimeType))
            // res.setHeader("Content-Type", "arraybuffer; title=" + encodeURI(file.name))
            console.log(JSON.stringify(file, null, 2))
            const token = await auth.refreshAccessToken()
            const result = await axios.get(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                responseType: "stream",
                headers: {
                    "Authorization": "Bearer " + token.credentials.access_token,
                }
            })
            const stream = result.data as Stream

            stream.pipe(res)  // <-- 將數據來源變成 ReadableStream
                .on('finish', function () {
                    console.log('Sending done.');
                });
        } else {
            res.sendStatus(403)
        }

    })
});

router.post('/uploadFileToStorage', async function (req, res) {
    console.log("uploadFile");
    // const mimeType = req.headers["content-type"]
    const filename = req.body.filename
    let path = ""
    console.log("req.headers:", filename + " " + path);
    if (req.body.hasOwnProperty("path")) {
        path = req.body.path + "/"
    }
    let t1, t2;
    t1 = new Date();
    const now = +Date.now()
    // let fileList = "uploadFile"
    let base64String = req.body.file;
    let bufferStream = new Stream.PassThrough();
    let base64Image = base64String.split(';base64,').pop();
    bufferStream.end(new Buffer(base64Image, 'base64'));
    //Define bucket.
    let bucket = admin.storage().bucket();
    //Define file & file name.
    var file = bucket.file(`${path}${now}/${filename}`, {});
    //Pipe the 'bufferStream' into a 'file.createWriteStream' method.
    let newType = mime.getType(filename.substring(filename.lastIndexOf(".") + 1, filename.length))
    if (newType && newType != null) {
        bufferStream.pipe(file.createWriteStream({
            metadata: {
                contentType: newType.toString()
            },
            validation: "md5"
        }))
            .on('error', function (err) { })
            .on('finish', function () {
                // The file upload is complete.
                console.log(`${newType} ${now}/${filename} uploaded to bucket.`);
                res.status(200).send({ url: `https://storage.googleapis.com/${config.storageBucket}/${path}${now}/${filename}` })
            });
    } else {
        console.log(`${now}/${filename} cannot be uploaded to bucket.`);
        res.sendStatus(403)
    }
});

router.post('/deleteFileFromStorage', async function (req, res) {
    console.log("deleteFile");
    let path = "temp/"
    let t1, t2;
    t1 = new Date();
    const now = +Date.now()
    // let fileList = "uploadFile"   
    let bufferStream = new Stream.PassThrough();
    //Define bucket.
    let bucket = admin.storage().bucket();
    //Define file & file name.
    let filesGotten = bucket.getFiles({ prefix: path })
    await filesGotten.then(fileObjs => {
        // console.log("fileObjs:", fileObjs)
        for (const fileObj of fileObjs[0]) {
            console.log("fileObj.name:", fileObj.name)
            let subObjName = fileObj.name.replace(path, "")
            let stampNum = parseInt(subObjName.substring(0, subObjName.indexOf("/")))
            console.log("subObjName:", stampNum)
            if ((now - stampNum) > 604800000) {
                let fileToDelete = path + subObjName.substring(0, subObjName.indexOf("/")) + "/"
                console.log("Older than a week!", fileToDelete)
                console.log("Expired:", (now - stampNum))
                bucket.deleteFiles({ prefix: fileToDelete }).then(res => {
                    console.log("deleted", res)
                }).catch(err => {
                    console.log("ERROR")
                })
            } else {
                console.log("Newer than a week!")
            }
        }
    })

    res.status(200).send("files deleted")

});
// module.exports = router;
export default router
// router.get('/getFileFromLocal', bodyParser.json(), async function (req, res) {
//     const fileId = req.query.fileId;
//     driveService.getFileById(fileId).then(async doc => {
//         if (doc.exists) {
//             let file = doc.data()
//             let basePath = "C:\\driveFiles\\Files\\"
//             let extPath = ""
//             res.setHeader('content-type', 'arraybuffer');
//             res.setHeader("Content-Disposition", "attachment; filename=" + encodeURI(file.name) + "." + mime.getExtension(file.mimeType))
//             console.log(JSON.stringify(file, null, 2))
//             for (let i = 1; i < file.parentsName.length; i++) {
//                 extPath += file.parentsName[i].fullName + "\\"
//             }
//             console.log("basePath+extPath:", basePath + extPath + file.fullName)
//             const stream = fs.createReadStream(basePath + extPath + file.fullName)
//             stream.pipe(res)  // <-- 將數據來源變成 ReadableStream
//                 .on('finish', function () {
//                     console.log('Sending done.');
//                 });
//         } else {
//             res.sendStatus(403)
//         }
//     })
// });