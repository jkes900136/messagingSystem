import * as admin from 'firebase-admin';
import { Issue } from '../model';
const issueCollection = admin.firestore().collection("Issue");

export const getIssues = function() {
    return issueCollection.get()
}

export const getIssueById = function (companyName: string) {
    return issueCollection.where("id", "==", companyName).get()
}
export const getIssueByParentId = function (companyName: string) {
    return issueCollection.where("parentId", "==", companyName).get()
}
export const setIssue = function (member: Issue) {
    return issueCollection.doc(member.id).set(member, { merge: true })
}