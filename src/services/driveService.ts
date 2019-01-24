import { google } from "googleapis"
import { OAuth2Client } from "google-auth-library"
import * as admin from 'firebase-admin';
import { google_client_secret_drive, drive_token } from "../config"

import { File } from '../model'
import * as mime from "mime"

var fs = require('fs');
const addFile = (file: File): Promise<any> => {
    return admin.firestore().collection("File").doc(file.id).set(file, { merge: true })
}
const addNowProperty = (file: File, now: number): Promise<any> => {
    return admin.firestore().collection("File").doc(file.id).set({ modifiedDate: now },
        { merge: true })
}
export const getFiles = function () {
    return admin.firestore().collection("File").get()
}

export const getFolders = function () {
    return admin.firestore().collection("File").where("mimeType", "==", "application/vnd.google-apps.folder").get()
}

export const getFileByName = (fileName: string) => {
    return admin.firestore().collection("File").where("name", "==", fileName).get()
}

export const getFileById = (id: string) => {
    return admin.firestore().collection("File").doc(id).get()
}

export const getFilesByParentId = (id: string) => {
    return admin.firestore().collection("File").where("parents", "==", id).get()
}

export const rename = (file: File): Promise<any> => {
    let docId = file.id
    if (file.modifiedDate == 9999999999999) {
        docId = file.docId
        return admin.firestore().collection("File").doc(file.docId).set(file,
            { merge: true })
    } else {
        return admin.firestore().collection("File").doc(file.id).set(file,
            { merge: true })
    }
}
export const deleteFileById = (id: string) => {
    return admin.firestore().collection("File").doc(id).delete()
}

export const setFilePath = function (file) {
    return admin.firestore().collection("File").doc(file.docId).set(file, { merge: true })
}

export const authorize = (): Promise<OAuth2Client> => {
    return new Promise(resolve => {
        const secret = google_client_secret_drive.installed.client_secret
        const clientId = google_client_secret_drive.installed.client_id
        const redirectUrl = google_client_secret_drive.installed.redirect_uris[0]
        const oauth2Client = new OAuth2Client(clientId, secret, redirectUrl)

        oauth2Client.setCredentials({
            access_token: drive_token.access_token,
            token_type: drive_token.token_type,
            refresh_token: drive_token.refresh_token,
            expiry_date: drive_token.expiry_date
        })
        resolve(oauth2Client)
    })
}
export const addNowToFile = (auth: OAuth2Client, parentId: string, now: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const drive = google.drive({ version: 'v3', auth });
        drive.files.list({
            q: `'${parentId}' in parents and trashed = false`,
            fields: 'nextPageToken, files(id, name,parents,mimeType)',
        }, async (err, { data }) => {
            if (err) {
                console.error("err:", err.response);
                return reject(err.response.data)
            }
            const files = data.files;
            if (files.length > 0) {
                for (const file of files) {
                    file["modifiedDate"] = now
                    await addNowProperty(file, now)
                    if (file.mimeType == "application/vnd.google-apps.folder") {
                        try {
                            await addNowToFile(auth, file.id, now)
                        } catch (err) {
                            console.log(err)
                        }
                    }
                }
            } else {
                console.log('An empty folder found.');
            }
            resolve()
        })
    })
}
export const listFiles = (auth: OAuth2Client, parentId: string, parentsName: any[], now: number, pageToken?: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        // console.log("Pid:", parentId);
        const drive = google.drive({ version: 'v3', auth });
        drive.files.list({
            q: `'${parentId}' in parents and trashed = false`,
            fields: 'nextPageToken, files(id, name,parents,mimeType, createdTime, modifiedTime)',
            pageToken: pageToken
        }, async (err, response) => {
            if (err || !response.data) {
                console.error("err:", err.response);
                return reject(err.response.data)
            } else {
                const files: File[] = response.data.files;
                if (files && files.length > 0) {
                    // console.log('Number of Files in ', parentId + " is " + files.length);

                    let fullName = ""
                    for (const file of files) {
                        fullName = file.name
                        file.fullName = file.name

                        file["docId"] = file.id
                        if (file.name.indexOf(".") != -1) {
                            if (!isNaN(Number(file.name.substring(0, file.name.indexOf("."))))) {
                                if ((fullName.match(/\./g) || []).length == 2) {
                                    file.sid = parseInt(file.name.substring(0, file.name.indexOf(".")))
                                    file.name = file.name.substring(file.name.indexOf(".") + 1, file.name.length)
                                } else {
                                    if (file.mimeType == "application/vnd.google-apps.folder") {
                                        file.sid = parseInt(file.name.substring(0, file.name.indexOf(".")))
                                        file.name = file.name.substring(file.name.indexOf(".") + 1, file.name.length)
                                    } else {
                                        file.sid = 0
                                    }
                                }
                            } else {
                                // console.log("No sid:", file.name.substring(0, file.name.indexOf(".")))
                                file.sid = 0
                            }
                        } else {
                            // console.log("No sid:", file.name.substring(0, file.name.indexOf(".")))
                            file.sid = 0
                        }
                        if (file.mimeType != "application/vnd.google-apps.folder") {
                            if (file.name.lastIndexOf(".") != -1) {
                                // console.log("Has file ext:", file.name.lastIndexOf("."))
                                file.name = file.name.substring(0, file.name.lastIndexOf("."))
                            } else {
                                // console.log("No file ext:", file.name.indexOf("."))
                            }
                        }

                        file.parentsName = parentsName
                        file.modifiedDate = now
                        file.parents = file.parents[0]
                        file.createdTime = new Date(file.createdTime).getTime()
                        file.modifiedTime = new Date(file.modifiedTime).getTime()
                        if (file.name != "SBSE____") {
                            await addFile(file)
                        }
                        if (file.mimeType == "application/vnd.google-apps.folder") {
                            try {
                                let pName = file.parentsName.slice()
                                pName.push({ fullName: fullName, name: file.name, id: file.id })
                                await listFiles(auth, file.id, pName, now)
                            } catch (err) {
                                console.log(err)
                            }
                            // folders.push(file)
                        }
                    }
                    if (response.data.nextPageToken) {
                        await listFiles(auth, parentId, parentsName, now, response.data.nextPageToken)
                    }
                } else {
                    console.log('No files found.');
                }
                resolve()
            }
        });
    })
}

export const createFile = (auth: OAuth2Client, name: string, path: string, type: string, now: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const drive = google.drive({ version: 'v3', auth });
        let fileDBRec: File = { id: "", docId: "", sid: 0, mimeType: "", modifiedDate: 0, name: "", fullName: "", parents: "", parentsName: [], modifiedTime: 0, createdTime: 0 }
        let parentName = []
        let fileMetadata = {
            'name': name,
            'mimeType': `application/vnd.google-apps.${type}`,
            parents: [path]
        };
        name.substring(name.lastIndexOf(".") + 1, name.length)
        drive.files.create({
            resource: fileMetadata,
            fields: 'id'
        }, async function (err, file) {
            if (err) {
                // Handle error
                console.error("err:", err.response);
                reject("err")
            } else {
                console.log(`${type} Id: ${file.data.id} ${name} ${path} ${type}`);

                await getFileById(path).then(async doc => {
                    if (doc.exists) {
                        parentName = doc.data().parentsName.slice()
                        parentName.push({ fullName: doc.data().fullName, name: doc.data().name, id: path })
                    }
                })
                fileDBRec["fullName"] = name
                fileDBRec["name"] = name
                fileDBRec["docId"] = file.data.id
                fileDBRec["id"] = file.data.id
                fileDBRec["parents"] = path
                fileDBRec["mimeType"] = `application/vnd.google-apps.${type}`
                fileDBRec["parentsName"] = parentName
                fileDBRec["modifiedDate"] = now
                if (fileDBRec.name.indexOf(".") != -1) {
                    if (!isNaN(Number(fileDBRec.name.substring(0, fileDBRec.name.indexOf("."))))) {
                        if ((name.match(/\./g) || []).length == 2) {
                            fileDBRec["sid"] = parseInt(fileDBRec.name.substring(0, fileDBRec.name.indexOf(".")))
                            fileDBRec["name"] = fileDBRec.name.substring(fileDBRec.name.indexOf(".") + 1, fileDBRec.name.length)
                        } else {
                            if (fileDBRec.mimeType == "application/vnd.google-apps.folder") {
                                fileDBRec["sid"] = parseInt(fileDBRec.name.substring(0, fileDBRec.name.indexOf(".")))
                                fileDBRec["name"] = fileDBRec.name.substring(fileDBRec.name.indexOf(".") + 1, fileDBRec.name.length)
                            } else {
                                fileDBRec["sid"] = 0
                            }
                        }
                    } else {
                        // console.log("No sid:",.name.substring(0, .name.indexOf(".")))
                        fileDBRec["sid"] = 0
                    }
                } else {
                    // console.log("No sid:",.name.substring(0, .name.indexOf(".")))
                    fileDBRec["sid"] = 0
                }
                if (fileDBRec.mimeType != "application/vnd.google-apps.folder") {
                    if (fileDBRec.name.lastIndexOf(".") != -1) {
                        // console.log("Has  ext:", .name.lastIndexOf("."))
                        fileDBRec["name"] = fileDBRec.name.substring(0, fileDBRec.name.lastIndexOf("."))
                    } else {
                        // console.log("No  ext:",.name.indexOf("."))
                    }
                }
                console.log("fileDBRec:", fileDBRec)
                await rename(fileDBRec)
                resolve(file.data.id);
            }
        });
    })
}
export const createFileWithFile = (auth: OAuth2Client, name: string, path: string, type: string, now: number): Promise<string> => {
    return new Promise((resolve, reject) => {
        const drive = google.drive({ version: 'v3', auth });
        let fileDBRec: File = {
            name: "", sid: 0, fullName: "", parents: "", parentsName: [], id: "", docId: "", mimeType: "", modifiedDate: 0, modifiedTime: 0, createdTime: 0
        }
        let parentName = []
        var fileMetadata = {
            'name': name,
            parents: [path]
        };
        console.log("fileContent:", " " + mime.getType(name.substring(name.lastIndexOf(".") + 1, name.length)))

        var media = {
            mimeType: mime.getType(name.substring(name.lastIndexOf(".") + 1, name.length)),
            body: fs.createReadStream('fileTemp')
        };

        drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id'
        }, async function (err, file) {
            if (err) {
                // Handle error
                console.error("err:", err.response);
                reject("err")
            } else {
                console.log(`${type} Id: ${file.data.id} ${name} ${path} ${type}`);

                await getFileById(path).then(async doc => {
                    if (doc.exists) {
                        parentName = doc.data().parentsName.slice()
                        parentName.push({ fullName: doc.data().fullName, name: doc.data().name, id: path })
                    }
                })
                fileDBRec["fullName"] = name
                fileDBRec["name"] = name
                fileDBRec["docId"] = file.data.id
                fileDBRec["id"] = file.data.id
                fileDBRec["parents"] = path
                fileDBRec["mimeType"] = mime.getType(name.substring(name.lastIndexOf(".") + 1, name.length)).toString()
                fileDBRec["parentsName"] = parentName
                fileDBRec["modifiedDate"] = now
                if (fileDBRec.name.indexOf(".") != -1) {
                    if (!isNaN(Number(fileDBRec.name.substring(0, fileDBRec.name.indexOf("."))))) {
                        if ((name.match(/\./g) || []).length == 2) {
                            fileDBRec["sid"] = parseInt(fileDBRec.name.substring(0, fileDBRec.name.indexOf(".")))
                            fileDBRec["name"] = fileDBRec.name.substring(fileDBRec.name.indexOf(".") + 1, fileDBRec.name.length)
                        } else {
                            if (fileDBRec.mimeType == "application/vnd.google-apps.folder") {
                                fileDBRec["sid"] = parseInt(fileDBRec.name.substring(0, fileDBRec.name.indexOf(".")))
                                fileDBRec["name"] = fileDBRec.name.substring(fileDBRec.name.indexOf(".") + 1, fileDBRec.name.length)
                            } else {
                                fileDBRec["sid"] = 0
                            }
                        }
                    } else {
                        // console.log("No sid:",.name.substring(0, .name.indexOf(".")))
                        fileDBRec["sid"] = 0
                    }
                } else {
                    // console.log("No sid:",.name.substring(0, .name.indexOf(".")))
                    fileDBRec["sid"] = 0
                }
                if (fileDBRec.mimeType != "application/vnd.google-apps.folder") {
                    if (fileDBRec.name.lastIndexOf(".") != -1) {
                        // console.log("Has  ext:", .name.lastIndexOf("."))
                        fileDBRec["name"] = fileDBRec.name.substring(0, fileDBRec.name.lastIndexOf("."))
                    } else {
                        // console.log("No  ext:",.name.indexOf("."))
                    }
                }
                console.log("fileDBRec:", fileDBRec)
                await rename(fileDBRec)
                resolve(file.data.id);
            }
        });

    })
}
export const deleteFilesForSync = (batchSize: number, now: number, rootFolderId: string) => {
    var collectionRef = admin.firestore().collection("File");
    var query = collectionRef.where("modifiedDate", "<", now).orderBy('modifiedDate')

    return new Promise((resolve, reject) => {
        deleteQueryBatch(query, batchSize, resolve, reject, now, rootFolderId);
        console.log("deleteFilesForSync")
    });
}
export const deleteQueryBatch = async (query, batchSize, resolve, reject, now, rootFolderId) => {
    query.get()
        .then(async (snapshot) => {
            // When there are no documents left, we are done
            if (snapshot.size == 0) {
                console.log("snapshot.size")
                return 0;
            }
            // Delete documents in a batch
            var batch = admin.firestore().batch();
            var numberLimit = 0
            snapshot.docs.forEach(async doc => {
                if (doc.data().hasOwnProperty('parentsName') && numberLimit < 500) {
                    if (doc.data().parentsName.length > 0) {
                        if (doc.data().modifiedDate != now && doc.data().parentsName[0].id == rootFolderId) {
                            console.log("deleted file:", doc.data().name + doc.data().modifiedDate + " " + now + " " + doc.data().parentsName[0].id + " " + rootFolderId);
                            batch.delete(doc.ref);
                            numberLimit++
                        }
                    }
                }
            });

            return batch.commit().then(() => {
                console.log("batch.commit()", numberLimit)

                return 0
            });
        }).then((numDeleted) => {
            if (numDeleted === 0) {
                console.log("numDeleted === 0")
                resolve();
                return;
            } else {
                console.log("Recurse on the next process tick")
            }
            process.nextTick(() => {
                deleteQueryBatch(query, batchSize, resolve, reject, now, rootFolderId);
            });
        })
        .catch(reject);
}

export const deleteFile = (auth: OAuth2Client, fileId: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        // const drive = google.drive({ version: 'v3', auth });

        // drive.files.delete({
        //     'fileId': fileId
        // }, function (err, file) {
        //     if (err) {
        //         // Handle error
        //         console.error("err:", err.response);
        //         reject("err")
        //     } else {
        deleteFileById(fileId).then().catch(err => { })
        getFilesByParentId(fileId).then(foldersSnapshot => {
            if (!foldersSnapshot.empty) {
                let folders = []
                foldersSnapshot.forEach(folderdoc => folders.push(folderdoc.data()))
                for (const folder of folders) {
                    console.log("folder.id:", folder.id + " " + folder.name)
                    deleteFileById(folder.id)
                }
            }
        })
        console.log(` Id: file deleted`);
        resolve("file deleted");
        // }
        //     });
    })
}
export const renameFile = (auth: OAuth2Client, fileId: string, fullName: string, now: number): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const drive = google.drive({ version: 'v3', auth });
        let file
        let ext = ""
        await getFileById(fileId).then(async doc => {
            if (doc.exists) {
                file = doc.data()
                file["modifiedDate"] = now
                file.name = fullName
                if (file.name.indexOf(".") != -1) {
                    if (!isNaN(Number(file.name.substring(0, file.name.indexOf("."))))) {
                        file["sid"] = parseInt(file.name.substring(0, file.name.indexOf(".")))
                        file["name"] = file.name.substring(file.name.indexOf(".") + 1, file.name.length)

                    } else {
                        // console.log("No sid:", file.name.substring(0, file.name.indexOf(".")))
                        file["sid"] = 0
                    }
                } else {
                    // console.log("No sid:", file.name.substring(0, file.name.indexOf(".")))
                    file["sid"] = 0
                }
                if (file.mimeType != "application/vnd.google-apps.folder") {
                    if (file.fullName.lastIndexOf(".") != -1) {
                        ext = file.fullName.substring(file.fullName.lastIndexOf(".") + 1, file.fullName.length)
                        file["fullName"] = fullName + "." + ext
                        console.log("ext:", ext)
                    } else {
                        file["fullName"] = fullName
                    }
                } else {
                    file["fullName"] = fullName
                }
            }
        })
        console.log("file:", file)
        await rename(file)
        if (file.mimeType == "application/vnd.google-apps.folder") {
            try {
                let pName = file["parentsName"].slice()
                pName.push({ fullName: fullName, name: file.name, id: file.id })
                await listFiles(auth, file.id, pName, now)
            } catch (err) {
                console.log(err)
            }
        }
        let fileMetadata = {
            'name': file.fullName,
            'mimeType': file.mimeType
        };
        drive.files.update({
            resource: fileMetadata,
            'fileId': fileId,
            fields: 'id'
        }, function (err, file) {
            if (err) {
                // Handle error
                console.error("err:", err.response);
                resolve("err")
            } else {
                console.log(`The fileId of renamed file : ${file.data.id}`);
                resolve(file.data.id);
            }
        });
    })
}
export const moveFile = (auth: OAuth2Client, fileId: string, folderId: string, now: number): Promise<string> => {
    return new Promise(async (resolve, reject) => {
        const drive = google.drive({ version: 'v3', auth });
        let fileInfo
        let folderInfo
        await getFileById(fileId).then(async doc => {
            if (doc.exists) {
                fileInfo = doc.data()
                fileInfo["modifiedDate"] = now
                fileInfo["parents"] = folderId
                getFileById(folderId).then(folder => {
                    if (folder.exists) {
                        folderInfo = folder.data()
                        let pName = fileInfo["parentsName"].slice()
                        pName.push({ fullName: folderInfo.name, name: folderInfo.name, id: folderId })
                        fileInfo["parentsName"] = pName
                        console.log("file:", fileInfo)
                        rename(fileInfo)
                    }
                })
            }
        })

        // Retrieve the existing parents to remove
        drive.files.get({
            fileId: fileId,
            fields: 'parents'
        }, function (err, file) {
            if (err) {
                // Handle error
                console.error("get err:", err.response.data);
                resolve("get err")
            } else {
                console.log("get file:", file.data);
                // Move the file to the new folder
                var previousParents = file.data.parents.join(',');
                drive.files.update({
                    fileId: fileId,
                    addParents: folderId,
                    removeParents: previousParents,
                    fields: 'id, parents'
                }, function (err, file) {
                    if (err) {
                        // Handle error
                        console.error("err:", err.response);
                        resolve("err")
                    } else {
                        console.log(`The fileId of moved file : ${file.data.id}`);
                        resolve(file.data.id);
                    }
                });
            }
        });
    })
}
