import * as admin from 'firebase-admin';
import { MessageTemplate } from '../model';

const messageTemplateCollection = admin.firestore().collection("Message");

export const setMessageTemplate = function (message: MessageTemplate) {
    return messageTemplateCollection.doc(message.id).set(message, { merge: true })
}

export const getMessageTemplate = function (id: string) {
    return messageTemplateCollection.doc(id).get().then(snapshot => {
        if (snapshot.exists)
            return snapshot.data() as MessageTemplate
        return null
    })
}
export const getMessageTemplateByContent = function (content: string) {
    return messageTemplateCollection.where("content", "==", content).get()
}
export const deleteMessageTemplate = (id: string) => {

    return messageTemplateCollection.doc(id).delete()
}