import * as admin from 'firebase-admin';
import { idLength } from '../config'
import { ReviewMessage , Receiver} from '../model';
const reviewMessageCollection = admin.firestore().collection("ReviewMessage");

export const createReviewMessage = (reviewMessage: ReviewMessage) => {
    return reviewMessageCollection.doc(reviewMessage.id).create(reviewMessage)
}

export const createReviewMessageReceivers = (reviewMessageId: string, receiver: Receiver) => {
    const collection = reviewMessageCollection.doc(reviewMessageId).collection("Receiver")
    return collection.add(receiver)
}

export const getReviewMessageReceivers = (reviewMessageId: string): Promise<Receiver[]> => {
    const collection = reviewMessageCollection.doc(reviewMessageId).collection("Receiver")
    return collection.get().then(snapshot => {
        return snapshot.docs.map(doc => {
            return doc.data() as Receiver
        })
    })
}

export const getReviewMessageById = function (id: string) {

    return reviewMessageCollection.where("id", "==", id).get().then(reviewMessageSnapShot => {
        if (!reviewMessageSnapShot.empty) {
            return reviewMessageSnapShot.docs[0].data() as ReviewMessage
        } else { return null }
    })
}
export const getReviewMessageByName = function (name: string) {
    return reviewMessageCollection.where("name", "==", name).get()
}

export const setReviewMessage = (newReviewMessage:  ReviewMessage) => {
    return reviewMessageCollection.doc(newReviewMessage.id).set(newReviewMessage, { merge: true })
}
export const deleteReviewMessage = function (id: string) {
    return reviewMessageCollection.doc(id).delete()
}