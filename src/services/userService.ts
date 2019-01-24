import * as admin from "firebase-admin"
import { idLength } from "../config"
import { User } from "../model"

const userCollection = admin.firestore().collection("User")

export const getUserById = (id: string) => {
    return userCollection.doc(id).get().then(doc => {
        if (doc.exists)
            return doc.data() as User
        return null
    })
}
export const getUserByEmail = function (email: string) {
    return userCollection.where("email", "==", email).get()
}
export const setUser = function (user: User) {
    // console.log(JSON.stringify(user, null, 4))
    return userCollection.doc(user.id).set(user, { merge: true })
}
export const deleteUser = function (id: string) {
    return userCollection.doc(id).delete()
}