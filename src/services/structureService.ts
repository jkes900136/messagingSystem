import * as admin from 'firebase-admin';
import { IssueOrganization } from '../model';
const structureCollection = admin.firestore().collection("IssueOrganization");

export const getStructures = function () {
    return structureCollection.where("type", "==", "issue").get()
}
export const getStructuresByType = function (type: string) {
    return structureCollection.where("type", "==", type).get()
}
export const getStructureByIssueId = function (companyName: string) {
    return structureCollection.where("issueId", "==", companyName).get()
}
export const getStructureByParentId = function (companyName: string) {
    return structureCollection.where("parentId", "==", companyName).get()
}
export const setStructure = function (member: IssueOrganization) {
    return structureCollection.doc(member.id).set(member, { merge: true })
}