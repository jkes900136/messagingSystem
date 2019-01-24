import * as admin from 'firebase-admin';
import { ChatMessage, RecordDetail, Member, MessageTemplate } from '../model';

const chatMessageCollection = admin.firestore().collection("ChatMessage");

export const getChatMessageUUID = (): string => {
    return chatMessageCollection.doc().id
}

export const setChatMessage = (chatMessage: ChatMessage) => {
    return chatMessageCollection
        .doc(chatMessage.id)
        .set(chatMessage, { merge: true })
}

export const getRecordDetailUUID = (chatMessageId: string): string => {
    return chatMessageCollection.doc(chatMessageId).collection("RecordDetail").doc().id
}

export const setRecordDetail = (messageRecordId: string, recordDetail: RecordDetail) => {
    return chatMessageCollection
        .doc(messageRecordId)
        .collection("RecordDetail")
        .doc(recordDetail.id)
        .set(recordDetail, { merge: true })
}

export const getChatMessages = () => {
    return chatMessageCollection.get()
}

export const getChatMessageById = (chatMessageId: string) => {
    return chatMessageCollection.doc(chatMessageId).get()
}

export const getRecordDetails = (chatMessageId: string) => {
    return chatMessageCollection
        .doc(chatMessageId)
        .collection("RecordDetail")
        .get()
}

export const getRecordDetailById = (chatMessageId: string, recordDetailId: string) => {
    return chatMessageCollection.doc(chatMessageId)
        .collection("RecordDetail").doc(recordDetailId)
        .get()
}

export const createChatMessage = async (staff: Member, receiver: Member, channel: string, message: string, storageUrls: MessageTemplate["urls"], thumb: string) => {
    // let memberSnapShot = await memberService.getMemberByAnyId(receiver)
    // if (!memberSnapShot.empty) {

    let userMessage: ChatMessage = {
        id: receiver.id,
        sender: receiver
    }
    if (channel == "Line") {
        userMessage.id = receiver.lineId
    } else if (channel == "WeChat") {
        userMessage.id = receiver.wechatId
    }

    await setChatMessage(userMessage)
    const trackId = getRecordDetailUUID(userMessage.id)
    const recordDetail: RecordDetail = {
        id: trackId,
        receiver: receiver,
        channel: channel as MessageTemplate['channel'],
        message: message.replace(/\n/g, "\\n"),
        urls: storageUrls || [],
        thumb: thumb || "",
        isSucceed: true,
        receiveTime: new Date().getTime(),
        read: true
    }

    return setRecordDetail(userMessage.id, recordDetail)
    // }
}