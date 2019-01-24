import * as admin from 'firebase-admin';
import { EventResult, Receiver } from "../model"

const eventCollection = admin.firestore().collection("Event");

export const createEvent = function (event: any) {
    return eventCollection.doc(event.id).set(event, { merge: true })
}
export const updateEvent = (eventId: string, event: EventResult) => {
    return eventCollection.doc(eventId).update(event)
}
export const createEventReceiver = (eventId: string, receiver: Receiver) => {
    return eventCollection.doc(eventId).collection("Receiver").add(receiver)
}
export const getEvent = async (eventId: string): Promise<EventResult> => {
    const snapshot = await eventCollection.doc(eventId).get();
    if (snapshot.exists)
        return snapshot.data() as EventResult;
    return null;
}

export const getEventServices = async (eventId: string): Promise<Receiver[]> => {
    const snapshot = await eventCollection.doc(eventId).collection("Receiver").get();
    return snapshot.docs.map(doc => {
        return doc.data() as Receiver;
    });
}