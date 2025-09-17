import { createTransport } from "nodemailer"
import he from "he"
import Axios from "axios"
import * as driveService from './driveService'
import { appName, emailConfig, backendUrl } from "../config"
import { Member, File } from "../model"
import { Stream } from "stream"

export const pushMessage = (email: string, options: { subject: string, message: string, files?: Array<{ filename: string, content: Buffer, encoding: string }> }): Promise<any> => {
    return new Promise((resolve, reject) => {
        const transporter = createTransport({
            service: "Gmail",
            auth: {
                type: "OAuth2",
                ...emailConfig
            }
        })

        let mailOptions = {
            from: appName + `<${emailConfig.user}>`,
            to: email,
            subject: options.subject,
            html: he.encode(options.message),
            attachments: options.files
        }

        transporter.sendMail(mailOptions, error => {
            if (error) reject(error)
            else resolve("ok")
        })
    })
}

export const toEmailMessage = async (sender: Member, message: string, trackId: string, files?: Array<{filename: string, content: Buffer, encoding: string}>): Promise<{ subject: string, message: string, files?: Array<{ filename: string, content: Buffer, encoding: string }> }> => {
    let emailMessage = {
        subject: `《來自${sender.name}》`,
        message: message,
        files: files
    }

    if (message) {
        const urls = getURLfromString(message)
        if (urls)
            emailMessage.message = emailMessage.message.replace(urls[0], `<a href="${backendUrl}urlRedirect?trackId=${trackId}&url=${urls[0]}">${urls[0]}</a>`)
        emailMessage.message = emailMessage.message.replace(/\n/g, "<br>")

        if (sender.path)
            emailMessage.subject += sender.path
    }

    return emailMessage
}

export const getEmailFiles = async (files: File[]): Promise<Array<{filename: string, content: Buffer, encoding: string}>> => {
    const emailFiles = []
    const auth = await driveService.authorize()
    for (const file of files) {
        const token = await auth.refreshAccessToken()
        const fileStream = await Axios.get(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
            responseType: "stream",
            headers: {
                "Authorization": "Bearer " + token.credentials.access_token,
                "Content-Type": file.mimeType
            }
        }).then(result => {
            return result.data as Buffer
        })
        emailFiles.push({
            filename: file.fullName,
            content: fileStream,
            encoding: "base64"
        })
    }
    return emailFiles
}


const getURLfromString = (message: string): string[] => {
    const regex = new RegExp(/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi)
    return regex.exec(message)
}

// import { createTransport } from "nodemailer"
// import Axios from "axios"
// import * as driveService from './driveService'
// import { appName, emailConfig } from "../config"
// import { Member, File } from "../model"

// export const pushMessage = (email: string, options: { subject: string, message: string, files?: Array<{ filename: string, content: Buffer, encoding: string }> }): Promise<any> => {
//     return new Promise((resolve, reject) => {
//         const transporter = createTransport({
//             service: "Gmail",
//             auth: {
//                 type: "OAuth2",
//                 ...emailConfig
//             }
//         })

//         let mailOptions = {
//             from: appName + `<${emailConfig.user}>`,
//             to: email,
//             subject: options.subject,
//             text: options.message,
//             attachments: options.files
//         }

//         transporter.sendMail(mailOptions, error => {
//             if (error) reject(error)
//             else resolve("ok")
//         })
//     })
// }

// export const toEmailMessage = async (sender: Member, message: string, files?: Array<{filename: string, content: Buffer, encoding: string}>): Promise<{ subject: string, message: string, files?: Array<{ filename: string, content: Buffer, encoding: string }> }> => {
//     let emailMessage = {
//         subject: `《來自${sender.name}》`,
//         message: message,
//         files: files
//     }

//     if (message) {
//         emailMessage.message = message
//         if (sender.path)
//             emailMessage.subject += sender.path
//     }

//     return emailMessage
// }

// export const getEmailFiles = async (files: File[]): Promise<Array<{filename: string, content: Buffer, encoding: string}>> => {
//     const emailFiles = []
//     const auth = await driveService.authorize()
//     for (const file of files) {
//         const token = await auth.refreshAccessToken()
//         const fileStream = await Axios.get(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`, {
//             responseType: "stream",
//             headers: {
//                 "Authorization": "Bearer " + token.credentials.access_token,
//                 "Content-Type": file.mimeType
//             }
//         }).then(result => {
//             return result.data as Buffer
//         })
//         emailFiles.push({
//             filename: file.fullName,
//             content: fileStream,
//             encoding: "base64"
//         })
//     }
//     return emailFiles
// }