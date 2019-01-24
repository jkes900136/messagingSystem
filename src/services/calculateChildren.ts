import { MemberOrganization } from "../model"

import { getReceiverById, getReceiverByParentId, setReceiver } from "./receiverService"

export const calculateChildren = async (parentId: string): Promise<string[]> => {

    const childOrgShapshot = await getReceiverByParentId(parentId)
    let childrenIds = new Array<string>()

    if (!childOrgShapshot.empty) {
        for (const childOrgDoc of childOrgShapshot.docs) {
            const childOrg = childOrgDoc.data() as MemberOrganization
            const execu = new Array<Promise<any>>()
            if (childOrg.type == "department" ) {
                execu.push(calculateChildren(childOrg.id).then(temp => {
                    console.log(childOrg.name, temp.length)
                    childrenIds.push(...temp)
                }))            
            } else if (childOrg.type == "member") {
                childrenIds.push(childOrg.memberId)
            }
            
        }
    }

    childrenIds = childrenIds.filter((element, index, array) => {
        return array.indexOf(element) == index
    })

    const rootOrgSnapshot = await getReceiverById(parentId)
    if (!rootOrgSnapshot.empty) {
        let rootOrg = rootOrgSnapshot.docs[0].data() as MemberOrganization
        if (rootOrg.type == "department" )
            rootOrg.childrenId = childrenIds
        await setReceiver(rootOrg)
    }

    return childrenIds
}