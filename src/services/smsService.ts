import Axios from "axios"
import { every8dConfig } from "../config"
import { Member } from "../model"

export const pushMessage = (mobilePhone: string, message: string): Promise<any> => {
    const apiUrl = "https://oms.every8d.com/API21/HTTP/sendSMS.ashx"
    return Axios.get(apiUrl, {
        params: {
            UID: every8dConfig.UID,
            PWD: every8dConfig.PWD,
            DEST: mobilePhone,
            MSG: message
        }
    })
}

export const toSMSMessage = (sender: Member, message: string): string | null => {
    if (message) {
        let smsMessage = `《來自${sender.name}》\n`
        if (sender.path)
            smsMessage += sender.path + "\n"
        return smsMessage + message
    }
    return null
}