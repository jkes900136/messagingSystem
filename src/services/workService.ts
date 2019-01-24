import { firestore } from "firebase-admin"
import { Work, Task, Item, Flow } from "../model"

const workCollection = firestore().collection("Work")

export const setWork = (work: Work) => {
    return workCollection.doc(work.id).set(work, { merge: true })
}

export const setTask = (workId: string, task: Task) => {
    return workCollection.doc(workId).collection("Task").doc(task.id).set(task, { merge: true })
}

export const setItem = (workId: string, taskId: string, itemData: Item) => {
    return workCollection
        .doc(workId).collection("Task")
        .doc(taskId).collection("Item")
        .doc(itemData.id).set(itemData, { merge: true })
}

export const setVisitFlow = (workId: string, taskId: string, itemId: string,flowData: Flow) => {
    return workCollection
        .doc(workId).collection("Task")
        .doc(taskId).collection("Item")
        .doc(itemId).collection("Flow")
        .doc(flowData.id).set(flowData, { merge: true })
}

export const getWorks = () => {
    return workCollection.get()
        .then(snapshot => {
            return snapshot.docs.map(doc => {
                return doc.data() as Work
            })
        })
}

export const getWorkByName = (name: string) => {
    return workCollection.where("name", "==", name).get()
        .then(snapshot => {
            return snapshot.docs.map(doc => {
                return doc.data() as Work
            })
        })
}

export const getTasks = (workId: string) => {
    return workCollection.doc(workId).collection("Task").get()
        .then(snapshot => {
            return snapshot.docs.map(doc => {
                return doc.data() as Task
            })
        })
}

export const getTaskByName = (workId: string, name: string) => {
    return workCollection.doc(workId).collection("Task").where("name", "==", name).get()
        .then(snapshot => {
            return snapshot.docs.map(doc => {
                return doc.data() as Task
            })
        })
}

export const getItems = (workId: string, taskId: string) => {
    return workCollection.doc(workId).collection("Task")
        .doc(taskId).collection("Item").get()
        .then(snapshot => {
            return snapshot.docs.map(doc => {
                return doc.data() as Item
            })
        })
}

export const getItemByName = (workId: string, taskId: string, name: string) => {
    return workCollection.doc(workId).collection("Task")
        .doc(taskId).collection("Item")
        .where("name", "==", name).get()
        .then(snapshot => {
            return snapshot.docs.map(doc => {
                return doc.data() as Item
            })
        })
}
export const getItemById = (workId: string, taskId: string, id: string) => {
    return workCollection.doc(workId).collection("Task")
        .doc(taskId).collection("Item")
        .where("id", "==", id).get()
        .then(snapshot => {
            return snapshot.docs.map(doc => {
                return doc.data() as Item
            })
        })
}
export const getFlowByName = (workId: string, taskId: string, itemId: string, name: string) => {
    return workCollection.doc(workId).collection("Task")
        .doc(taskId).collection("Item")
        .doc(itemId).collection("Flow")
        .where("name", "==", name).get()
}

