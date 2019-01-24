import * as admin from 'firebase-admin';
import { idLength } from '../config'
import { MemberOrganization } from '../model';
const organizationCollection = admin.firestore().collection("Receiver");
export const setReceiver = function (org: MemberOrganization) {
    return organizationCollection.doc(org.id).set(org, { merge: true })
}
export const getReceiverById = function (id: string) {
    if (id.length == idLength.LINE)
        return organizationCollection.where("member.lineId", "==", id).get()
    if (id.length == idLength.WECHAT)
        return organizationCollection.where("member.wechatId", "==", id).get()
    return organizationCollection.where("id", "==", id).get()
}
export const getReceiverByParentIdAndActivityId = function (parentId: string, activityId: string) {
    return organizationCollection
        .where("parentId", "==", parentId)
        .where("activityId", "==", activityId).get()
}
export const getReceiverByParentId = function (parentId: string) {
    return organizationCollection.where("parentId", "==", parentId).get()
}
export const getReceiverByType = function (type: string) {
    return organizationCollection.where("type", "==", type).get()
}
export const getReceiverByMemberId = function (memberId: string) {
    return organizationCollection.where("memberId", "==", memberId).get()
}
export const getReceiverByName = function (name: string) {
    return organizationCollection.where("name", "==", name).get()
}
export const getReceiverByNameAndParentId = function (name: string, parentId: string) {
    return organizationCollection.where("name", "==", name).where("parentId", "==", parentId).get()
}
export const getReceiverByMemberIdAndParentId = function (memberId: string, parentId: string) {
    return organizationCollection.where("memberId", "==", memberId).where("parentId", "==", parentId).get()
}
export const getReceivers = function () {
    return organizationCollection.get()
}