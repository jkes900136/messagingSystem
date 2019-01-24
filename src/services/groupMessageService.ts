import * as admin from 'firebase-admin';
import { BatchGroup } from '../model';

const batchGroupCollection = admin.firestore().collection("GroupMessage");

export const getBatchGroupById = function (id: string) {
    return batchGroupCollection.where("id", "==", id).get()
}
export const getBatchGroupByName = function (name: string) {
    return batchGroupCollection.where("name", "==", name).get()
}
export const setBatchGroup = function (member: BatchGroup) {
    return batchGroupCollection.doc(member.id).set(member, { merge: true })
}
export const deleteBatchGroup = function (id: string) {
    return batchGroupCollection.doc(id).delete()
}