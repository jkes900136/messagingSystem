import * as admin from 'firebase-admin';
import { Menu, Item } from '../model';
const menuCollection = admin.firestore().collection("Menu");
export const setMenu = function (org: Menu) {
    return menuCollection.doc(org.id).set(org, { merge: true })
}
export const getMenuByParentId = function (parentId: string) {
    return admin.firestore().collection("Menu").where("parentId", "==", parentId).get()
}
export const getMenuByType = function (type: string) {
    return admin.firestore().collection("Menu").where("type", "==", type).get()
}
export const getMenuByMemberId = function (memberId: string) {
    return admin.firestore().collection("Menu").where("memberId", "==", memberId).get()
}
export const getMenuByName = function (name: string) {
    return admin.firestore().collection("Menu").where("name", "==", name).get()
}
export const getMenuByNameAndParentId = function (name: string, parentId: string) {
    return admin.firestore().collection("Menu").where("name", "==", name).where("parentId", "==", parentId).get()
}
export const getMenuByMemberIdAndParentId = function (memberId: string, parentId: string) {
    return admin.firestore().collection("Menu").where("memberId", "==", memberId).where("parentId", "==", parentId).get()
}
export const getMenus = function () {
    return admin.firestore().collection("Menu").get()
}


/**
 * DBsync
 */
const taskCollection = admin.firestore().collection("Work").doc("d7fa1181-9454-4ee8-8333-21161c574921").collection("Task")

const beforeVisitorActivityCollection = taskCollection.doc("3503d043-78d9-40e0-b7f6-a2de87b2c876").collection("Activity")
const afterVisitorActivityCollection = taskCollection.doc("883cb81c-ecfd-4100-bc62-664c890b3a5f").collection("Activity")


const taskCourseCollection = admin.firestore().collection("Work").doc("befb339f-419c-4834-a023-7405bebb031d").collection("Task")
const beforeCourseActivityCollection = taskCourseCollection.doc("2fb0fbcd-47cf-4cc6-8627-ab7d07921713").collection("Activity")
const afterCourseActivityCollection = taskCourseCollection.doc("4e5d0e3a-afc0-4633-a8b6-1869eaf7afde").collection("Activity")

export const setBeforeActivity = function (activity: any) {
    return beforeVisitorActivityCollection.doc(activity.id).set(activity, { merge: true })
}

export const setAfterActivity = function (activity: any) {
    return afterVisitorActivityCollection.doc(activity.id).set(activity, { merge: true })
}

export const setBeforeCourseActivity = function (activity: any) {
    return beforeCourseActivityCollection.doc(activity.id).set(activity, { merge: true })
}

export const setAfterCourseActivity = function (activity: any) {
    return afterCourseActivityCollection.doc(activity.id).set(activity, { merge: true })
}