// import * as admin from 'firebase-admin';
// import {  Receiver } from '../model';
// const organizationCollection = admin.firestore().collection("MemberOrganization");
// export const updateOrganization = function (org: Receiver) {
//     return organizationCollection.doc(org.id).set(org, { merge: true })
// }
// export const getOrganizationById = function (id: string) {
//     return organizationCollection.where("id", "==", id).get()
// }
// export const getOrganizationByParentIdAndActivityId = function (parentId: string, activityId: string) {
//     return organizationCollection
//         .where("parentId", "==", parentId)
//         .where("activityId", "==", activityId).get()
// }
// export const getOrganizationByParentId = function (parentId: string) {
//     return organizationCollection.where("parentId", "==", parentId).get()
// }
// export const getOrganizationByType = function (type: string) {
//     return organizationCollection.where("type", "==", type).get()
// }
// export const getOrganizationByMemberId = function (memberId: string) {
//     return organizationCollection.where("memberId", "==", memberId).get()
// }
// export const getOrganizationByName = function (name: string) {
//     return organizationCollection.where("name", "==", name).get()
// }
// export const getOrganizationByNameAndParentId = function (name: string, parentId: string) {
//     return organizationCollection.where("name", "==", name).where("parentId", "==", parentId).get()
// }
// export const getOrganizationByMemberIdAndParentId = function ( memberId: string, parentId: string) {
//     return organizationCollection.where("memberId", "==",  memberId).where("parentId", "==", parentId).get()
// }
// export const getOrganizations= function () {
//     return organizationCollection.get()
// }