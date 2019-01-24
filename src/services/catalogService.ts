import { firestore } from "firebase-admin"
import { Catalog } from "../model"

const catalogCollection = firestore().collection("Catalog")


export const setCatalog = (work: Catalog) => {
    return catalogCollection.doc(work.id).set(work, { merge: true })
}

export const getCatalogByNameAndUserId = (name: string, userId: string) => {
    return catalogCollection.where("name", "==", name).where("userId", "==", userId).get()
        .then(snapshot => {
            return snapshot.docs.map(doc => {
                return doc.data() as Catalog
            })
        })
}
export const getCatalogByTypeAndUserId = (type: string, userId: string) => {
    return catalogCollection.where("type", "==", type).where("userId", "==", userId).get()
        .then(snapshot => {
            return snapshot.docs.map(doc => {
                return doc.data() as Catalog
            })
        })
}
export const getCatalogById = (id: string) => {
    return catalogCollection.where("id", "==", id).get().then(snapshot => {
        return snapshot.docs.map(doc => {
            return doc.data() as Catalog
        })
    })
}
export const deleteCatalog = function (id: string) {
    return catalogCollection.doc(id).delete()
}