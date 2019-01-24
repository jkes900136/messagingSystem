import * as admin from 'firebase-admin';
import { idLength } from '../config'
import { Member } from '../model';
const memberCollection = admin.firestore().collection("Member");

export const getMembers = function () {
    return memberCollection.where("role", "==", "staff").get()
}

export const getCustomers = function () {
    return memberCollection.where("role", "==", "customer").get()
}
export const getStudents = function () {
    return memberCollection.where("role", "==", "student").get()
}
export const deleteMember = function (id: string) {
    return memberCollection.doc(id).delete()
}
export const setMember = function (member: Member) {
    return memberCollection.doc(member.id).set(member, { merge: true })
}
export const getMemberByAnyId = function (id: string) {
    if (id.length == idLength.LINE)
        return memberCollection.where("lineId", "==", id).get()
    if (id.length == idLength.WECHAT)
        return memberCollection.where("wechatId", "==", id).get()

    return memberCollection.where("id", "==", id).get()
}

export const getMembersByName = function (companyName: string) {
    return memberCollection.where("name", "==", companyName).get()
}
export const getMembersByType = function (companyName: string) {
    return memberCollection.where("type", "==", companyName).get()
}
export const getMembersByRole = function (companyName: string) {
    return memberCollection.where("role", "==", companyName).get()
}

export const getMemberByRoleAndEmail = function (companyName: string, email: string) {
    return memberCollection.where("role", "==", companyName).where("email", "==", email).get()
}
export const getMemberByEmail = function (email: string) {
    return memberCollection.where("email", "==", email).get()
}
export const getMemberByMobilePhone = function (mobilePhone: string) {
    return memberCollection.where("mobilePhone", "==", mobilePhone).get()
}
export const getMembersByBusinessPhone = function (businessPhone: string) {
    return memberCollection.where("businessPhone", "==", businessPhone).get()
}
export const getMemberByEmailAndMobilePhone = function (email: string, mobilePhone: string) {
    return memberCollection.where("email", "==", email).where("mobilePhone", "==", mobilePhone).get()
}
export const getMemberByMobilePhoneAndName = function (mobilePhone: string, name: string) {
    return memberCollection
        .where("mobilePhone", "==", mobilePhone)
        .where("name", "==", name).get()
}
export const setData = function (result: Member) {
    return admin.firestore().collection("Member").doc(result.id).set(result)
}
export const getMemberByIdAndName = function (id: string, name: string) {
    return admin.firestore().collection("Member").where("id", "==", id).where("name", "==", name).get()
}

export const deleteFirebaseToken = (lineId: string) => {
    return admin.auth().deleteUser(lineId);
}

export const generateFirebaseToken = (lineId: string) => {
    let firebaseUid = lineId;
    let additionalClaims = {
        'LINE': true
    };


    return admin.auth().createCustomToken(firebaseUid, additionalClaims);
}
export const checkPhoneAuth = (mobile: string) => {
    return admin.auth().getUserByPhoneNumber(mobile)
}

export const updateMemberErrorCounter = function (phone: string, errorCounter: number) {
    return memberCollection.doc(phone).update({ errorCounter: errorCounter })
}