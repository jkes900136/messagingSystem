import * as admin from 'firebase-admin';
import { Group } from '../model';

const groupCollection = admin.firestore().collection("Group");

export const getLineGroups = function () {
    return groupCollection.where('type', '==', "group").get()
}

export const getGroupBylineId = function (companyName: string) {
    return groupCollection.where("lineId", "==", companyName).get()
}

export const getGroupById = function (id: string) {
    return groupCollection.where("id", "==", id).get()
}
export const getGroupByName = function (name: string) {
    return groupCollection.where("name", "==", name).get()
}
export const setGroup = function (member: Group) {
    return groupCollection.doc(member.id).set(member, { merge: true })
}
export const deleteGroup = function (id: string) {
    return groupCollection.doc(id).delete()
}