import * as admin from 'firebase-admin';

const eventCollection = admin.firestore().collection("EventConfig");

export const setEventConfig = function (event: any) {
    return eventCollection.doc(event.id).set(event, { merge: true })
}

// export const setEventMessage = function (eventId: string, message: Metadata) {
//     return eventCollection.doc(eventId).collection("Message").add(message)
// }

export const getEventConfig = function (id: string) {
    return eventCollection.doc(id).get()
}

// export const getEventById = function (id: string) {
//     return eventCollection.doc(id).collection("Message").get()
// }