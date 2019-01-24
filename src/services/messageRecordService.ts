import { firestore } from "firebase-admin"
import { MessageRecord, RecordDetail } from "../model"

const messageRecordCollection = firestore().collection("MessageRecord")

export const getMessageRecordUUID = (): string => {
    return messageRecordCollection.doc().id
}

export const setMessageRecord = (messageRecord: MessageRecord) => {
    return messageRecordCollection
        .doc(messageRecord.id)
        .set(messageRecord, { merge: true })
}

export const getRecordDetailUUID = (messageRecordId: string): string => {
    return messageRecordCollection.doc(messageRecordId).collection("RecordDetail").doc().id
}

export const setRecordDetail = (messageRecordId: string, recordDetail: RecordDetail) => {
    return messageRecordCollection
        .doc(messageRecordId)
        .collection("RecordDetail")
        .doc(recordDetail.id)
        .set(recordDetail, { merge: true })
}

export const setRecordDetailMQ = (messageRecordId: string, recordDetail: any) => {
    return messageRecordCollection
        .doc(messageRecordId)
        .collection("RecordDetail")
        .doc(recordDetail.id)
        .set(recordDetail, { merge: true })
}

export const getMessageRecords = () => {
    return messageRecordCollection.get()
}

export const getMessageRecordById = (messageRecordId: string) => {
    return messageRecordCollection.doc(messageRecordId).get()
}

export const getRecordDetails = (messageRecordId: string) => {
    return messageRecordCollection
        .doc(messageRecordId)
        .collection("RecordDetail")
        .get()
}

export const getRecordDetailById = (messageRecordId: string, recordDetailId: string) => {
    return messageRecordCollection.doc(messageRecordId)
        .collection("RecordDetail").doc(recordDetailId)
        .get()
}